import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ARReconciliationStatus,
  AccountingAccountType,
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  JournalEntryStatus,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';

type Db = Prisma.TransactionClient | PrismaService;

export type ReconcileInput = {
  companyId: string;
  actorUserId: string;
  debitJournalLineId: string;
  creditJournalLineId: string;
  transactionAmount: string;
  idempotencyKey: string;
  postingDate: Date;
  customerPaymentId?: string;
};

export type ReverseReconciliationInput = {
  companyId: string;
  actorUserId: string;
  reconciliationId: string;
  postingDate: Date;
  reason: string;
  idempotencyKey: string;
};

@Injectable()
export class ARReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
  ) {}

  async reconcile(input: ReconcileInput) {
    return this.prisma.$transaction((db) =>
      this.reconcileInTransaction(db, input),
    );
  }

  async reconcileInTransaction(
    db: Prisma.TransactionClient,
    input: ReconcileInput,
  ) {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) {
      throw new BadRequestException(
        'AR reconciliation idempotency key is required',
      );
    }
    const amount = this.decimal(
      input.transactionAmount,
      'AR reconciliation amount is invalid',
    );
    if (!amount.gt(0)) {
      throw new BadRequestException(
        'AR reconciliation amount must be positive',
      );
    }
    const requestHash = this.requestHash(input, amount, idempotencyKey);
    const existing = await db.aRReconciliation.findFirst({
      where: { companyId: input.companyId, idempotencyKey },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'AR reconciliation idempotency key is already used with another payload',
        );
      }
      return existing;
    }

    await this.lockLines(db, input.companyId, [
      input.debitJournalLineId,
      input.creditJournalLineId,
    ]);
    const [debit, credit] = await Promise.all([
      this.loadLine(db, input.companyId, input.debitJournalLineId),
      this.loadLine(db, input.companyId, input.creditJournalLineId),
    ]);
    this.assertPair(debit, credit, input.companyId);

    const active = await db.aRReconciliation.findMany({
      where: {
        companyId: input.companyId,
        status: ARReconciliationStatus.ACTIVE,
        OR: [
          { debitJournalLineId: debit.id },
          { creditJournalLineId: credit.id },
        ],
      },
      select: {
        debitJournalLineId: true,
        creditJournalLineId: true,
        transactionAmount: true,
        debitBaseAmountApplied: true,
        creditBaseAmountApplied: true,
      },
    });
    const debitUsed = active
      .filter((row) => row.debitJournalLineId === debit.id)
      .reduce(
        (sum, row) => sum.add(row.transactionAmount),
        new Prisma.Decimal(0),
      );
    const creditUsed = active
      .filter((row) => row.creditJournalLineId === credit.id)
      .reduce(
        (sum, row) => sum.add(row.transactionAmount),
        new Prisma.Decimal(0),
      );
    const debitBaseUsed = active
      .filter((row) => row.debitJournalLineId === debit.id)
      .reduce(
        (sum, row) => sum.add(row.debitBaseAmountApplied),
        new Prisma.Decimal(0),
      );
    const creditBaseUsed = active
      .filter((row) => row.creditJournalLineId === credit.id)
      .reduce(
        (sum, row) => sum.add(row.creditBaseAmountApplied),
        new Prisma.Decimal(0),
      );

    const debitTransactionOpen = debit.transactionDebit
      .sub(debit.transactionCredit)
      .sub(debitUsed);
    const creditTransactionOpen = credit.transactionCredit
      .sub(credit.transactionDebit)
      .sub(creditUsed);
    if (amount.gt(debitTransactionOpen) || amount.gt(creditTransactionOpen)) {
      throw new ConflictException(
        'AR reconciliation exceeds the exact remaining debit or credit amount',
      );
    }
    const debitBaseOpen = debit.debit.sub(debit.credit).sub(debitBaseUsed);
    const creditBaseOpen = credit.credit.sub(credit.debit).sub(creditBaseUsed);
    const debitBaseAmountApplied = this.proportionalBase(
      amount,
      debitTransactionOpen,
      debitBaseOpen,
    );
    const creditBaseAmountApplied = this.proportionalBase(
      amount,
      creditTransactionOpen,
      creditBaseOpen,
    );
    const realizedFxAmount = creditBaseAmountApplied.sub(
      debitBaseAmountApplied,
    );

    const readiness = await this.readiness.evaluateInTransaction(
      db,
      input.companyId,
      input.postingDate,
    );
    if (!readiness.ready) {
      throw new ConflictException(
        `Accounting is not ready: ${readiness.reasons.join(', ')}`,
      );
    }
    const period = await this.findOpenPeriod(
      db,
      input.companyId,
      input.postingDate,
    );
    const reconciliation = await db.aRReconciliation.create({
      data: {
        companyId: input.companyId,
        debitJournalLineId: debit.id,
        creditJournalLineId: credit.id,
        customerPaymentId: input.customerPaymentId ?? null,
        transactionAmount: amount,
        debitBaseAmountApplied,
        creditBaseAmountApplied,
        realizedFxAmount,
        status: ARReconciliationStatus.ACTIVE,
        idempotencyKey,
        requestHash,
        createdById: input.actorUserId,
      },
    });

    const adjustmentJournalEntryId = await this.postAdjustmentIfRequired(
      db,
      input,
      period,
      reconciliation.id,
      debit,
      credit,
      debitBaseAmountApplied,
      creditBaseAmountApplied,
    );
    if (!adjustmentJournalEntryId) {
      return reconciliation;
    }
    const updated = await db.aRReconciliation.update({
      where: { id: reconciliation.id },
      data: { adjustmentJournalEntryId },
    });
    return updated;
  }

  async reverse(input: ReverseReconciliationInput) {
    return this.prisma.$transaction((db) =>
      this.reverseInTransaction(db, input),
    );
  }

  async reverseInTransaction(
    db: Prisma.TransactionClient,
    input: ReverseReconciliationInput,
  ) {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || !input.reason.trim()) {
      throw new BadRequestException(
        'AR reconciliation reversal reason and idempotency key are required',
      );
    }
    await db.$queryRaw(Prisma.sql`
      SELECT "id" FROM "ARReconciliation"
      WHERE "id" = ${input.reconciliationId} AND "companyId" = ${input.companyId}
      FOR UPDATE
    `);
    const reconciliation = await db.aRReconciliation.findFirst({
      where: { id: input.reconciliationId, companyId: input.companyId },
    });
    if (!reconciliation) {
      throw new NotFoundException('AR reconciliation not found');
    }
    const requestHash = this.reversalHash(
      reconciliation,
      input.postingDate,
      input.reason,
      idempotencyKey,
    );
    if (reconciliation.status === ARReconciliationStatus.REVERSED) {
      if (reconciliation.reversalRequestHash !== requestHash) {
        throw new ConflictException(
          'AR reconciliation reversal payload does not match the original request',
        );
      }
      return reconciliation;
    }
    const readiness = await this.readiness.evaluateInTransaction(
      db,
      input.companyId,
      input.postingDate,
    );
    if (!readiness.ready) {
      throw new ConflictException(
        `Accounting is not ready: ${readiness.reasons.join(', ')}`,
      );
    }
    const period = await this.findOpenPeriod(
      db,
      input.companyId,
      input.postingDate,
    );
    let reversalJournalEntryId: string | null = null;
    if (reconciliation.adjustmentJournalEntryId) {
      const reversal = await this.accounting.reverseInTransaction(
        db,
        input.companyId,
        input.actorUserId,
        reconciliation.adjustmentJournalEntryId,
        {
          accountingPeriodId: period.id,
          postingDate: this.dateText(input.postingDate),
          reason: input.reason,
          idempotencyKey: `ar-reconciliation-reversal:${reconciliation.id}:${createHash(
            'sha256',
          )
            .update(idempotencyKey)
            .digest('hex')
            .slice(0, 16)}`,
        },
      );
      reversalJournalEntryId = reversal.id;
    }
    return db.aRReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: ARReconciliationStatus.REVERSED,
        reversalJournalEntryId,
        reversedById: input.actorUserId,
        reversedAt: new Date(),
        reversalReason: input.reason.trim(),
        reversalIdempotencyKey: idempotencyKey,
        reversalRequestHash: requestHash,
      },
    });
  }

  async listOpenItems(companyId: string, businessPartnerId?: string) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        companyId,
        ...(businessPartnerId ? { businessPartnerId } : {}),
        businessPartnerId: { not: null },
        account: {
          accountType: AccountingAccountType.ASSET_RECEIVABLE,
          isControlAccount: true,
          reconciliationEligible: true,
        },
        journalEntry: {
          status: JournalEntryStatus.POSTED,
          reversalOfEntryId: null,
          sourceType: {
            notIn: [
              JournalSourceType.AR_RECONCILIATION,
              JournalSourceType.REVERSAL,
            ],
          },
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true } },
        journalEntry: {
          select: {
            sourceType: true,
            sourceId: true,
            transactionCurrencyCode: true,
            documentReference: true,
          },
        },
        salesInvoicePaymentSchedule: {
          select: { id: true, dueDate: true, salesInvoiceId: true },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { journalEntryId: 'asc' },
        { sequence: 'asc' },
      ],
    });
    if (!lines.length) return [];
    const ids = lines.map((line) => line.id);
    const active = await this.prisma.aRReconciliation.findMany({
      where: {
        companyId,
        status: ARReconciliationStatus.ACTIVE,
        OR: [
          { debitJournalLineId: { in: ids } },
          { creditJournalLineId: { in: ids } },
        ],
      },
      select: {
        debitJournalLineId: true,
        creditJournalLineId: true,
        transactionAmount: true,
        debitBaseAmountApplied: true,
        creditBaseAmountApplied: true,
      },
    });
    const amounts = new Map<
      string,
      { transaction: Prisma.Decimal; base: Prisma.Decimal }
    >();
    for (const line of lines) {
      amounts.set(line.id, {
        transaction: new Prisma.Decimal(0),
        base: new Prisma.Decimal(0),
      });
    }
    for (const row of active) {
      const debit = amounts.get(row.debitJournalLineId);
      if (debit) {
        debit.transaction = debit.transaction.add(row.transactionAmount);
        debit.base = debit.base.add(row.debitBaseAmountApplied);
      }
      const credit = amounts.get(row.creditJournalLineId);
      if (credit) {
        credit.transaction = credit.transaction.add(row.transactionAmount);
        credit.base = credit.base.add(row.creditBaseAmountApplied);
      }
    }
    return lines
      .map((line) => {
        const isDebit = line.transactionDebit.gt(line.transactionCredit);
        const originalTransaction = isDebit
          ? line.transactionDebit.sub(line.transactionCredit)
          : line.transactionCredit.sub(line.transactionDebit);
        const originalBase = isDebit
          ? line.debit.sub(line.credit)
          : line.credit.sub(line.debit);
        const applied = amounts.get(line.id)!;
        return {
          id: line.id,
          type: isDebit ? 'DEBIT' : 'CREDIT',
          maturityId: line.salesInvoicePaymentSchedule?.id ?? null,
          invoiceId: line.salesInvoicePaymentSchedule?.salesInvoiceId ?? null,
          dueDate:
            line.dueDate ?? line.salesInvoicePaymentSchedule?.dueDate ?? null,
          documentReference:
            line.documentReference ?? line.journalEntry.documentReference,
          sourceType: line.journalEntry.sourceType,
          sourceId: line.journalEntry.sourceId,
          businessPartnerId: line.businessPartnerId,
          currencyCode: line.journalEntry.transactionCurrencyCode,
          arAccount: line.account,
          originalTransactionAmount: originalTransaction.toString(),
          originalBaseAmount: originalBase.toString(),
          activeReconciledTransactionAmount: applied.transaction.toString(),
          activeReconciledBaseAmount: applied.base.toString(),
          remainingTransactionAmount: originalTransaction
            .sub(applied.transaction)
            .toString(),
          remainingBaseAmount: originalBase.sub(applied.base).toString(),
          remainingAmount: originalTransaction
            .sub(applied.transaction)
            .toString(),
        };
      })
      .filter((line) =>
        new Prisma.Decimal(line.remainingTransactionAmount).gt(0),
      );
  }

  private async postAdjustmentIfRequired(
    db: Prisma.TransactionClient,
    input: ReconcileInput,
    period: { id: string; fiscalYear: { startDate: Date } },
    reconciliationId: string,
    debit: Awaited<ReturnType<ARReconciliationService['loadLine']>>,
    credit: Awaited<ReturnType<ARReconciliationService['loadLine']>>,
    debitBaseAmountApplied: Prisma.Decimal,
    creditBaseAmountApplied: Prisma.Decimal,
  ) {
    const difference = creditBaseAmountApplied.sub(debitBaseAmountApplied);
    const sameAccount = debit.accountId === credit.accountId;
    if (sameAccount && difference.isZero()) return null;
    const configuration = await db.accountingConfiguration.findUnique({
      where: { companyId: input.companyId },
      include: { journalDefaults: true, accountDefaults: true },
    });
    if (!configuration)
      throw new ConflictException('Accounting configuration is required');
    const journalMapping =
      configuration.journalDefaults.find(
        (mapping) =>
          mapping.settingKey === AccountingConfigJournalKey.EXCHANGE_DIFFERENCE,
      ) ??
      configuration.journalDefaults.find(
        (mapping) => mapping.settingKey === AccountingConfigJournalKey.GENERAL,
      );
    if (!journalMapping) {
      throw new ConflictException(
        'EXCHANGE_DIFFERENCE journal mapping is required',
      );
    }
    const journal = await db.accountingJournal.findFirst({
      where: {
        id: journalMapping.journalId,
        companyId: input.companyId,
        isActive: true,
      },
    });
    if (
      !journal ||
      (journal.type !== AccountingJournalType.GENERAL &&
        journal.type !== AccountingJournalType.BANK)
    ) {
      throw new ConflictException(
        'EXCHANGE_DIFFERENCE journal mapping is invalid',
      );
    }
    const mappings = new Map(
      configuration.accountDefaults.map((mapping) => [
        mapping.settingKey,
        mapping.accountId,
      ]),
    );
    const gainAccount = await this.loadMappedAccount(
      db,
      input.companyId,
      mappings.get(AccountingConfigAccountKey.EXCHANGE_GAIN),
      AccountingAccountType.INCOME_OTHER,
      'EXCHANGE_GAIN',
    );
    const lossAccount = await this.loadMappedAccount(
      db,
      input.companyId,
      mappings.get(AccountingConfigAccountKey.EXCHANGE_LOSS),
      AccountingAccountType.EXPENSE_OTHER,
      'EXCHANGE_LOSS',
    );
    const lines: Array<{
      accountId: string;
      transactionDebit: string;
      transactionCredit: string;
      businessPartnerId?: string;
      description: string;
    }> = [
      {
        accountId: credit.accountId,
        transactionDebit: creditBaseAmountApplied.toFixed(4),
        transactionCredit: '0',
        businessPartnerId: credit.businessPartnerId!,
        description: `AR reconciliation source ${reconciliationId}`,
      },
      {
        accountId: debit.accountId,
        transactionDebit: '0',
        transactionCredit: debitBaseAmountApplied.toFixed(4),
        businessPartnerId: debit.businessPartnerId!,
        description: `AR reconciliation target ${reconciliationId}`,
      },
    ];
    if (difference.gt(0)) {
      lines.push({
        accountId: gainAccount.id,
        transactionDebit: '0',
        transactionCredit: difference.toFixed(4),
        description: `Realized FX gain ${reconciliationId}`,
      });
    } else if (difference.lt(0)) {
      lines.push({
        accountId: lossAccount.id,
        transactionDebit: difference.abs().toFixed(4),
        transactionCredit: '0',
        description: `Realized FX loss ${reconciliationId}`,
      });
    }
    const entry = await this.accounting.postInternalInTransaction(
      db,
      input.companyId,
      input.actorUserId,
      {
        journalId: journal.id,
        accountingPeriodId: period.id,
        postingDate: this.dateText(input.postingDate),
        documentDate: this.dateText(input.postingDate),
        transactionCurrencyCode: configuration.baseCurrencyCode,
        exchangeRate: '1',
        documentReference: `AR-${reconciliationId}`,
        description: `AR reconciliation ${reconciliationId}`,
        sourceType: JournalSourceType.AR_RECONCILIATION,
        sourceId: reconciliationId,
        idempotencyKey: `ar-reconciliation:${reconciliationId}`,
        lines,
      },
    );
    return entry.id;
  }

  private async loadMappedAccount(
    db: Db,
    companyId: string,
    id: string | undefined,
    expectedType: AccountingAccountType,
    label: string,
  ) {
    if (!id)
      throw new ConflictException(`${label} account mapping is required`);
    const account = await db.accountingAccount.findFirst({
      where: { id, companyId, isActive: true, allowDirectPosting: true },
    });
    if (!account || account.accountType !== expectedType) {
      throw new ConflictException(`${label} account mapping is invalid`);
    }
    return account;
  }

  private async loadLine(db: Db, companyId: string, id: string) {
    const line = await db.journalLine.findFirst({
      where: { id, companyId },
      include: {
        account: true,
        journalEntry: true,
      },
    });
    if (!line) throw new NotFoundException('AR journal line not found');
    return line;
  }

  private assertPair(debit: any, credit: any, companyId: string) {
    const valid =
      debit.companyId === companyId &&
      credit.companyId === companyId &&
      debit.businessPartnerId &&
      debit.businessPartnerId === credit.businessPartnerId &&
      debit.journalEntry.status === JournalEntryStatus.POSTED &&
      credit.journalEntry.status === JournalEntryStatus.POSTED &&
      !debit.journalEntry.reversalOfEntryId &&
      !credit.journalEntry.reversalOfEntryId &&
      debit.journalEntry.sourceType !== JournalSourceType.AR_RECONCILIATION &&
      debit.journalEntry.sourceType !== JournalSourceType.REVERSAL &&
      credit.journalEntry.sourceType !== JournalSourceType.AR_RECONCILIATION &&
      credit.journalEntry.sourceType !== JournalSourceType.REVERSAL &&
      debit.journalEntry.transactionCurrencyCode ===
        credit.journalEntry.transactionCurrencyCode &&
      debit.account.accountType === AccountingAccountType.ASSET_RECEIVABLE &&
      credit.account.accountType === AccountingAccountType.ASSET_RECEIVABLE &&
      debit.account.isControlAccount &&
      debit.account.reconciliationEligible &&
      credit.account.isControlAccount &&
      credit.account.reconciliationEligible &&
      debit.transactionDebit.gt(debit.transactionCredit) &&
      credit.transactionCredit.gt(credit.transactionDebit);
    if (!valid) {
      throw new ConflictException(
        'AR reconciliation requires same-company, same-customer, same-currency posted AR debit and credit lines',
      );
    }
  }

  private async lockLines(
    db: Prisma.TransactionClient,
    companyId: string,
    ids: string[],
  ) {
    for (const id of [...new Set(ids)].sort()) {
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "JournalLine"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
    }
  }

  private async findOpenPeriod(db: Db, companyId: string, date: Date) {
    const postingDate = this.dateOnly(date);
    const period = await db.accountingPeriod.findFirst({
      where: {
        companyId,
        status: 'OPEN',
        startDate: { lte: postingDate },
        endDate: { gte: postingDate },
      },
      include: { fiscalYear: true },
    });
    if (!period)
      throw new ConflictException('An OPEN accounting period is required');
    return period;
  }

  private proportionalBase(
    amount: Prisma.Decimal,
    transactionOpen: Prisma.Decimal,
    baseOpen: Prisma.Decimal,
  ) {
    if (amount.eq(transactionOpen)) return baseOpen;
    return baseOpen.mul(amount).div(transactionOpen).toDecimalPlaces(4);
  }

  private requestHash(
    input: ReconcileInput,
    amount: Prisma.Decimal,
    key: string,
  ) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          debitJournalLineId: input.debitJournalLineId,
          creditJournalLineId: input.creditJournalLineId,
          transactionAmount: amount.toString(),
          postingDate: this.dateText(input.postingDate),
          customerPaymentId: input.customerPaymentId ?? null,
          idempotencyKey: key,
        }),
      )
      .digest('hex');
  }

  private reversalHash(
    reconciliation: { id: string; transactionAmount: Prisma.Decimal },
    date: Date,
    reason: string,
    key: string,
  ) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          id: reconciliation.id,
          amount: reconciliation.transactionAmount.toString(),
          postingDate: this.dateText(date),
          reason: reason.trim(),
          idempotencyKey: key,
        }),
      )
      .digest('hex');
  }

  private decimal(value: Prisma.Decimal.Value, message: string) {
    try {
      const decimal = new Prisma.Decimal(value);
      if (!decimal.isFinite()) throw new Error();
      return decimal;
    } catch {
      throw new BadRequestException(message);
    }
  }

  private dateOnly(value: Date) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BadRequestException('Invalid posting date');
    }
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private dateText(value: Date) {
    return this.dateOnly(value).toISOString().slice(0, 10);
  }
}
