import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountingAccountType,
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  SupplierPaymentMethod,
  SupplierPaymentStatus,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { APReconciliationService } from './ap-reconciliation.service';
import { SupplierPaymentAllocationInput, SupplierPaymentInput } from './dto';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SupplierPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
    private readonly ap: APReconciliationService,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: SupplierPaymentInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const normalized = await this.validatePaymentInput(db, companyId, input);
      const requestHash = this.draftHash(normalized);
      const existing = input.idempotencyKey
        ? await db.supplierPayment.findFirst({
            where: { companyId, idempotencyKey: input.idempotencyKey.trim() },
            include: { allocations: true },
          })
        : null;
      if (existing) {
        if (existing.requestHash && existing.requestHash !== requestHash) {
          throw new ConflictException(
            'Supplier payment idempotency key is already used with another payload',
          );
        }
        return this.serialize(existing);
      }
      const payment = await db.supplierPayment.create({
        data: {
          companyId,
          businessPartnerId: normalized.businessPartnerId,
          status: SupplierPaymentStatus.DRAFT,
          paymentDate: normalized.paymentDate,
          method: normalized.method,
          sourceAccountId: normalized.sourceAccountId,
          payableAccountId: normalized.payableAccountId,
          transactionCurrencyCode: normalized.transactionCurrencyCode,
          exchangeRate: normalized.exchangeRate,
          amount: normalized.amount,
          unappliedAmount: normalized.unappliedAmount,
          notes: normalized.notes,
          reference: normalized.reference,
          idempotencyKey: normalized.idempotencyKey,
          requestHash,
          createdById: actorUserId,
          allocations: {
            create: normalized.allocations.map((allocation) => ({
              journalLineId: allocation.journalLineId,
              supplierInvoicePaymentScheduleId:
                allocation.supplierInvoicePaymentScheduleId,
              amount: allocation.amount,
            })),
          },
        },
        include: { allocations: true },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'supplier-payment.draft-created',
          entityType: 'SupplierPayment',
          entityId: payment.id,
          metadata: { allocationCount: normalized.allocations.length },
        },
      });
      return this.serialize(payment);
    });
  }

  async updateDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    input: SupplierPaymentInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const current = await db.supplierPayment.findFirst({
        where: { id, companyId },
        include: { allocations: true },
      });
      if (!current) throw new NotFoundException('Supplier payment not found');
      if (current.status !== SupplierPaymentStatus.DRAFT) {
        throw new ConflictException(
          'Posted supplier payments are immutable; use reversal',
        );
      }
      const normalized = await this.validatePaymentInput(db, companyId, input);
      const requestHash = this.draftHash(normalized);
      await db.supplierPaymentAllocation.deleteMany({
        where: { companyId, supplierPaymentId: id },
      });
      const payment = await db.supplierPayment.update({
        where: { id },
        data: {
          businessPartnerId: normalized.businessPartnerId,
          paymentDate: normalized.paymentDate,
          method: normalized.method,
          sourceAccountId: normalized.sourceAccountId,
          payableAccountId: normalized.payableAccountId,
          transactionCurrencyCode: normalized.transactionCurrencyCode,
          exchangeRate: normalized.exchangeRate,
          amount: normalized.amount,
          unappliedAmount: normalized.unappliedAmount,
          notes: normalized.notes,
          reference: normalized.reference,
          idempotencyKey: normalized.idempotencyKey,
          requestHash,
          allocations: {
            create: normalized.allocations.map((allocation) => ({
              journalLineId: allocation.journalLineId,
              supplierInvoicePaymentScheduleId:
                allocation.supplierInvoicePaymentScheduleId,
              amount: allocation.amount,
            })),
          },
        },
        include: { allocations: true },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'supplier-payment.draft-updated',
          entityType: 'SupplierPayment',
          entityId: id,
          metadata: {},
        },
      });
      return this.serialize(payment);
    });
  }

  async postDraft(
    companyId: string,
    actorUserId: string,
    id: string,
    postingDate: Date,
    idempotencyKey: string,
  ) {
    return this.prisma.$transaction(async (db) => {
      const key = idempotencyKey.trim();
      if (!key)
        throw new BadRequestException(
          'Payment posting idempotency key is required',
        );
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SupplierPayment"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.supplierPayment.findFirst({
        where: { id, companyId },
        include: { allocations: true },
      });
      if (!payment) throw new NotFoundException('Supplier payment not found');
      const requestHash = this.postingHash(payment, postingDate, key);
      if (payment.status === SupplierPaymentStatus.POSTED) {
        if (
          payment.idempotencyKey !== key ||
          payment.requestHash !== requestHash
        ) {
          throw new ConflictException(
            'Supplier payment is already posted with another request',
          );
        }
        return this.findOneWithAllocations(db, companyId, id);
      }
      if (payment.status !== SupplierPaymentStatus.DRAFT) {
        throw new ConflictException(
          'Reversed supplier payments cannot be posted',
        );
      }
      const normalizedPostingDate = this.dateOnly(postingDate);
      const readiness = await this.readiness.evaluateInTransaction(
        db,
        companyId,
        normalizedPostingDate,
      );
      if (!readiness.ready) {
        throw new ConflictException(
          `Accounting is not ready: ${readiness.reasons.join(', ')}`,
        );
      }
      const period = await this.findOpenPeriod(
        db,
        companyId,
        normalizedPostingDate,
      );
      const context = await this.resolvePostingContext(
        db,
        companyId,
        payment.method,
        payment.sourceAccountId,
        payment.payableAccountId,
        payment.transactionCurrencyCode,
      );
      const allocationTotal = payment.allocations.reduce(
        (sum, allocation) => sum.add(allocation.amount),
        new Prisma.Decimal(0),
      );
      if (allocationTotal.gt(payment.amount)) {
        throw new ConflictException(
          'Supplier payment allocations exceed payment amount',
        );
      }
      await this.lockTargetLines(
        db,
        companyId,
        payment.allocations.map((allocation) => allocation.journalLineId),
      );
      await this.validateCreditTargets(
        db,
        companyId,
        payment.businessPartnerId,
        payment.transactionCurrencyCode,
        payment.allocations,
      );
      const paymentNumber = await this.allocatePaymentNumber(
        db,
        companyId,
        period.fiscalYearId,
        period.fiscalYear.startDate,
      );
      const journalEntry = await this.accounting.postInternalInTransaction(
        db,
        companyId,
        actorUserId,
        {
          journalId: context.journalId,
          accountingPeriodId: period.id,
          postingDate: this.dateText(normalizedPostingDate),
          documentDate: this.dateText(this.dateOnly(payment.paymentDate)),
          transactionCurrencyCode: payment.transactionCurrencyCode,
          exchangeRate: payment.exchangeRate.toString(),
          documentReference: paymentNumber,
          description: `Supplier payment ${paymentNumber}`,
          sourceType: JournalSourceType.SUPPLIER_PAYMENT,
          sourceId: payment.id,
          idempotencyKey: key,
          lines: [
            {
              accountId: payment.payableAccountId,
              transactionDebit: payment.amount.toString(),
              transactionCredit: '0',
              description: `Supplier payment AP source ${paymentNumber}`,
              businessPartnerId: payment.businessPartnerId,
              documentReference: paymentNumber,
              reconciliationReference: payment.id,
            },
            {
              accountId: payment.sourceAccountId,
              transactionDebit: '0',
              transactionCredit: payment.amount.toString(),
              description: `Supplier payment ${paymentNumber}`,
              documentReference: paymentNumber,
              reconciliationReference: payment.id,
            },
          ],
        },
      );
      const sourceDebit = await db.journalLine.findFirst({
        where: {
          companyId,
          journalEntryId: journalEntry.id,
          accountId: payment.payableAccountId,
          businessPartnerId: payment.businessPartnerId,
          transactionDebit: { gt: 0 },
        },
      });
      if (!sourceDebit) {
        throw new ConflictException(
          'Posted supplier payment AP source line was not created',
        );
      }
      for (const allocation of payment.allocations) {
        const reconciliation = await this.ap.reconcileInTransaction(db, {
          companyId,
          actorUserId,
          debitJournalLineId: sourceDebit.id,
          creditJournalLineId: allocation.journalLineId,
          transactionAmount: allocation.amount.toString(),
          idempotencyKey: `supplier-payment:${payment.id}:allocation:${allocation.id}`,
          postingDate: normalizedPostingDate,
          supplierPaymentId: payment.id,
        });
        await db.supplierPaymentAllocation.update({
          where: { id: allocation.id },
          data: { apReconciliationId: reconciliation.id },
        });
      }
      const unappliedAmount = payment.amount.sub(allocationTotal);
      await db.supplierPayment.update({
        where: { id },
        data: {
          status: SupplierPaymentStatus.POSTED,
          paymentNumber,
          postingDate: normalizedPostingDate,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          apJournalLineId: sourceDebit.id,
          idempotencyKey: key,
          requestHash,
          unappliedAmount,
        },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'supplier-payment.posted',
          entityType: 'SupplierPayment',
          entityId: id,
          metadata: {
            paymentNumber,
            journalEntryId: journalEntry.id,
            sourceDebitJournalLineId: sourceDebit.id,
          },
        },
      });
      return this.findOneWithAllocations(db, companyId, id);
    });
  }

  async reverse(
    companyId: string,
    actorUserId: string,
    id: string,
    postingDate: Date,
    reason: string,
    idempotencyKey: string,
  ) {
    return this.prisma.$transaction(async (db) => {
      const key = idempotencyKey.trim();
      if (!key || !reason.trim()) {
        throw new BadRequestException(
          'Payment reversal reason and idempotency key are required',
        );
      }
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SupplierPayment"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.supplierPayment.findFirst({
        where: { id, companyId },
      });
      if (!payment) throw new NotFoundException('Supplier payment not found');
      const requestHash = this.reversalHash(payment, postingDate, reason, key);
      if (payment.status === SupplierPaymentStatus.REVERSED) {
        if (payment.reversalRequestHash !== requestHash) {
          throw new ConflictException(
            'Supplier payment reversal payload does not match the original request',
          );
        }
        return this.findOneWithAllocations(db, companyId, id);
      }
      if (
        payment.status !== SupplierPaymentStatus.POSTED ||
        !payment.journalEntryId
      ) {
        throw new ConflictException(
          'Only a posted supplier payment can be reversed',
        );
      }
      const readiness = await this.readiness.evaluateInTransaction(
        db,
        companyId,
        postingDate,
      );
      if (!readiness.ready) {
        throw new ConflictException(
          `Accounting is not ready: ${readiness.reasons.join(', ')}`,
        );
      }
      const period = await this.findOpenPeriod(db, companyId, postingDate);
      const reconciliations = await db.aPReconciliation.findMany({
        where: {
          companyId,
          supplierPaymentId: id,
          status: 'ACTIVE',
        },
        orderBy: { id: 'asc' },
      });
      for (const reconciliation of reconciliations) {
        await this.ap.reverseInTransaction(db, {
          companyId,
          actorUserId,
          reconciliationId: reconciliation.id,
          postingDate,
          reason: `Supplier payment reversal: ${reason.trim()}`,
          idempotencyKey: `ap-reconciliation-reversal:${reconciliation.id}:${key}`,
        });
      }
      const reversal = await this.accounting.reverseInTransaction(
        db,
        companyId,
        actorUserId,
        payment.journalEntryId,
        {
          accountingPeriodId: period.id,
          postingDate: this.dateText(this.dateOnly(postingDate)),
          reason: reason.trim(),
          idempotencyKey: key,
        },
      );
      await db.supplierPayment.update({
        where: { id },
        data: {
          status: SupplierPaymentStatus.REVERSED,
          reversalJournalEntryId: reversal.id,
          reversedById: actorUserId,
          reversedAt: new Date(),
          reversalReason: reason.trim(),
          reversalIdempotencyKey: key,
          reversalRequestHash: requestHash,
        },
      });
      return this.findOneWithAllocations(db, companyId, id);
    });
  }

  async reconcileOnAccount(
    companyId: string,
    actorUserId: string,
    paymentId: string,
    journalLineId: string,
    amount: string,
    idempotencyKey: string,
    postingDate = new Date(),
  ) {
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SupplierPayment"
        WHERE "id" = ${paymentId} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.supplierPayment.findFirst({
        where: { id: paymentId, companyId },
      });
      if (!payment) throw new NotFoundException('Supplier payment not found');
      if (
        payment.status !== SupplierPaymentStatus.POSTED ||
        !payment.journalEntryId
      ) {
        throw new ConflictException(
          'Only a posted supplier payment can be reconciled',
        );
      }
      const journalEntryId = payment.journalEntryId;
      const sourceLineId = await this.findPaymentSourceLine(db, {
        ...payment,
        journalEntryId,
      });
      const reconciliation = await this.ap.reconcileInTransaction(db, {
        companyId,
        actorUserId,
        debitJournalLineId: sourceLineId,
        creditJournalLineId: journalLineId,
        transactionAmount: amount,
        idempotencyKey,
        postingDate,
        supplierPaymentId: paymentId,
      });
      const remaining = await this.deriveRemainingUnappliedAmount(db, payment);
      if (remaining.lt(0)) {
        throw new ConflictException(
          'On-account reconciliation exceeds the payment unapplied amount',
        );
      }
      return reconciliation;
    });
  }

  async findAll(
    companyId: string,
    query: { status?: SupplierPaymentStatus; businessPartnerId?: string },
  ) {
    const payments = await this.prisma.supplierPayment.findMany({
      where: {
        companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.businessPartnerId
          ? { businessPartnerId: query.businessPartnerId }
          : {}),
      },
      include: {
        allocations: true,
        sourceAccount: true,
        payableAccount: true,
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });
    return Promise.all(
      payments.map(async (payment) => ({
        ...this.serialize(payment),
        remainingUnappliedAmount: (
          await this.deriveRemainingUnappliedAmount(this.prisma, payment)
        ).toString(),
      })),
    );
  }

  async findOne(companyId: string, id: string) {
    const payment = await this.findOneWithAllocations(
      this.prisma,
      companyId,
      id,
    );
    if (!payment) throw new NotFoundException('Supplier payment not found');
    return payment;
  }

  listOpenItems(companyId: string, businessPartnerId: string) {
    return this.ap.listOpenItems(companyId, businessPartnerId);
  }

  private async validatePaymentInput(
    db: Db,
    companyId: string,
    input: SupplierPaymentInput,
  ) {
    const paymentDate = this.dateOnly(input.paymentDate);
    const amount = this.decimal(
      input.amount,
      'supplier_payment.amount_invalid',
    );
    if (!amount.gt(0))
      throw new BadRequestException('supplier_payment.amount_invalid');
    const exchangeRate = this.decimal(
      input.exchangeRate,
      'supplier_payment.exchange_rate_invalid',
    );
    if (!exchangeRate.gt(0)) {
      throw new BadRequestException('supplier_payment.exchange_rate_invalid');
    }
    const currencyCode = input.transactionCurrencyCode.trim().toUpperCase();
    const currency = await db.currency.findFirst({
      where: { code: currencyCode, isActive: true },
    });
    if (!currency)
      throw new BadRequestException('supplier_payment.currency_invalid');
    const configuration = await db.accountingConfiguration.findUnique({
      where: { companyId },
      include: { accountDefaults: true },
    });
    if (!configuration) {
      throw new ConflictException(
        'Accounting configuration must be initialized before recording payments',
      );
    }
    if (
      currencyCode === configuration.baseCurrencyCode &&
      !exchangeRate.eq(1)
    ) {
      throw new BadRequestException(
        'Base-currency payments must use exchange rate 1',
      );
    }
    const partner = await db.businessPartner.findFirst({
      where: { id: input.businessPartnerId, companyId },
      include: { supplierProfile: true },
    });
    if (!partner || !partner.isActive || !partner.supplierProfile?.isActive) {
      throw new ConflictException(
        'An active supplier BusinessPartner is required',
      );
    }
    const payableAccount = await this.resolvePayableAccount(
      db,
      companyId,
      partner.supplierProfile.payableAccountId,
      configuration.accountDefaults,
    );
    await this.validateSourceAccount(
      db,
      companyId,
      input.method,
      input.sourceAccountId,
    );
    const allocations = await this.validateCreditTargets(
      db,
      companyId,
      input.businessPartnerId,
      currencyCode,
      input.allocations,
    );
    const normalizedAllocations = input.allocations.map((allocation) => ({
      ...allocation,
      amount: this.decimal(
        allocation.amount,
        'supplier_payment.allocation_invalid',
      ),
    }));
    if (
      new Set(
        normalizedAllocations.map((allocation) => allocation.journalLineId),
      ).size !== normalizedAllocations.length
    ) {
      throw new ConflictException(
        'Each AP maturity may appear only once in a payment allocation',
      );
    }
    if (normalizedAllocations.some((allocation) => !allocation.amount.gt(0))) {
      throw new BadRequestException('supplier_payment.allocation_invalid');
    }
    const allocationTotal = normalizedAllocations.reduce(
      (sum, allocation) => sum.add(allocation.amount),
      new Prisma.Decimal(0),
    );
    if (allocationTotal.gt(amount)) {
      throw new ConflictException(
        'Supplier payment allocations exceed payment amount',
      );
    }
    for (const allocation of input.allocations) {
      const target = allocations.find(
        (candidate) => candidate.id === allocation.journalLineId,
      );
      if (!target) continue;
      if (allocation.supplierInvoicePaymentScheduleId) {
        const schedule = await db.supplierInvoicePaymentSchedule.findFirst({
          where: {
            id: allocation.supplierInvoicePaymentScheduleId,
            companyId,
            journalLineId: allocation.journalLineId,
          },
        });
        if (!schedule)
          throw new ConflictException(
            'Allocation maturity does not match its AP journal line',
          );
      }
    }
    return {
      businessPartnerId: input.businessPartnerId,
      paymentDate,
      method: input.method,
      sourceAccountId: input.sourceAccountId,
      payableAccountId: payableAccount.id,
      transactionCurrencyCode: currencyCode,
      exchangeRate,
      amount,
      unappliedAmount: amount.sub(allocationTotal),
      notes: input.notes?.trim() || null,
      reference: input.reference?.trim() || null,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      allocations: normalizedAllocations,
    };
  }

  private async resolvePayableAccount(
    db: Db,
    companyId: string,
    overrideId: string | null,
    mappings: Array<{
      settingKey: AccountingConfigAccountKey;
      accountId: string;
    }>,
  ) {
    const fallback = mappings.find(
      (mapping) => mapping.settingKey === AccountingConfigAccountKey.PAYABLE,
    )?.accountId;
    const accountId = overrideId ?? fallback;
    if (!accountId)
      throw new ConflictException('Payable account mapping is required');
    const account = await db.accountingAccount.findFirst({
      where: {
        id: accountId,
        companyId,
        isActive: true,
        allowDirectPosting: true,
      },
    });
    if (
      !account ||
      account.accountType !== AccountingAccountType.LIABILITY_PAYABLE ||
      !account.isControlAccount ||
      !account.reconciliationEligible
    ) {
      throw new ConflictException(
        'Supplier payable account override is invalid',
      );
    }
    return account;
  }

  private async resolvePostingContext(
    db: Db,
    companyId: string,
    method: SupplierPaymentMethod,
    sourceAccountId: string,
    payableAccountId: string,
    currencyCode: string,
  ) {
    const source = await this.validateSourceAccount(
      db,
      companyId,
      method,
      sourceAccountId,
    );
    const payable = await db.accountingAccount.findFirst({
      where: { id: payableAccountId, companyId },
    });
    if (
      !payable ||
      !payable.isActive ||
      !payable.allowDirectPosting ||
      payable.accountType !== AccountingAccountType.LIABILITY_PAYABLE ||
      !payable.isControlAccount ||
      !payable.reconciliationEligible
    ) {
      throw new ConflictException(
        'Supplier payable account is invalid or inactive',
      );
    }
    const configuration = await db.accountingConfiguration.findUnique({
      where: { companyId },
      include: { journalDefaults: true },
    });
    if (!configuration)
      throw new ConflictException('Accounting configuration is required');
    const key =
      source.accountType === AccountingAccountType.ASSET_CASH
        ? AccountingConfigJournalKey.CASH
        : AccountingConfigJournalKey.BANK;
    const mapping = configuration.journalDefaults.find(
      (item) => item.settingKey === key,
    );
    const journal = mapping
      ? await db.accountingJournal.findFirst({
          where: { id: mapping.journalId, companyId, isActive: true },
        })
      : null;
    if (
      !journal ||
      journal.type !==
        (key === AccountingConfigJournalKey.CASH
          ? AccountingJournalType.CASH
          : AccountingJournalType.BANK)
    ) {
      throw new ConflictException(
        `Active ${key.toLowerCase()} journal mapping is required`,
      );
    }
    if (journal.currencyCode && journal.currencyCode !== currencyCode) {
      throw new ConflictException(
        'Payment currency does not match the source journal currency',
      );
    }
    return { journalId: journal.id };
  }

  private async validateSourceAccount(
    db: Db,
    companyId: string,
    method: SupplierPaymentMethod,
    accountId: string,
  ) {
    const account = await db.accountingAccount.findFirst({
      where: { id: accountId, companyId },
    });
    if (!account || !account.isActive || !account.allowDirectPosting) {
      throw new ConflictException(
        'Supplier payment source account is invalid or inactive',
      );
    }
    const bankLike = new Set<SupplierPaymentMethod>([
      SupplierPaymentMethod.BANK_TRANSFER,
      SupplierPaymentMethod.CHEQUE,
      SupplierPaymentMethod.CARD,
    ]).has(method);
    const validType = bankLike
      ? account.accountType === AccountingAccountType.ASSET_BANK
      : method === SupplierPaymentMethod.CASH
        ? account.accountType === AccountingAccountType.ASSET_CASH
        : account.accountType === AccountingAccountType.ASSET_CASH ||
          account.accountType === AccountingAccountType.ASSET_BANK;
    if (!validType) {
      throw new ConflictException(
        'Supplier payment source account type is invalid for the payment method',
      );
    }
    return account;
  }

  private async validateCreditTargets(
    db: Db,
    companyId: string,
    businessPartnerId: string,
    currencyCode: string,
    allocations: Array<Pick<SupplierPaymentAllocationInput, 'journalLineId'>>,
  ) {
    const ids = [
      ...new Set(allocations.map((allocation) => allocation.journalLineId)),
    ];
    if (!ids.length) return [];
    const targets = await db.journalLine.findMany({
      where: {
        companyId,
        id: { in: ids },
        businessPartnerId,
        account: {
          accountType: AccountingAccountType.LIABILITY_PAYABLE,
          isActive: true,
          isControlAccount: true,
          reconciliationEligible: true,
        },
        journalEntry: { status: 'POSTED', reversalOfEntryId: null },
      },
      include: { journalEntry: { select: { transactionCurrencyCode: true } } },
    });
    if (targets.length !== ids.length) {
      throw new ConflictException(
        'One or more AP credit targets are invalid or belong to another supplier',
      );
    }
    if (
      targets.some((target) =>
        target.transactionCredit.lte(target.transactionDebit),
      )
    ) {
      throw new ConflictException(
        'Supplier payments can only settle credit AP open items',
      );
    }
    if (
      targets.some(
        (target) =>
          target.journalEntry.transactionCurrencyCode !== currencyCode,
      )
    ) {
      throw new ConflictException(
        'Cross-currency AP allocation requires an explicit FX settlement policy',
      );
    }
    return targets;
  }

  private async lockTargetLines(
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

  private async findPaymentSourceLine(
    db: Db,
    payment: {
      companyId: string;
      journalEntryId: string;
      apJournalLineId: string | null;
      payableAccountId: string;
      businessPartnerId: string;
    },
  ) {
    if (payment.apJournalLineId) return payment.apJournalLineId;
    const line = await db.journalLine.findFirst({
      where: {
        companyId: payment.companyId,
        journalEntryId: payment.journalEntryId,
        accountId: payment.payableAccountId,
        businessPartnerId: payment.businessPartnerId,
        transactionDebit: { gt: 0 },
      },
    });
    if (!line)
      throw new ConflictException(
        'Supplier payment AP source line was not found',
      );
    return line.id;
  }

  private async deriveRemainingUnappliedAmount(
    db: Db,
    payment: {
      companyId: string;
      status: SupplierPaymentStatus;
      unappliedAmount: Prisma.Decimal;
      apJournalLineId: string | null;
      journalEntryId: string | null;
      payableAccountId: string;
      businessPartnerId: string;
    },
  ) {
    if (payment.status === SupplierPaymentStatus.DRAFT) {
      return payment.unappliedAmount;
    }
    if (payment.status === SupplierPaymentStatus.REVERSED) {
      return new Prisma.Decimal(0);
    }
    if (!payment.journalEntryId) {
      throw new ConflictException(
        'Posted supplier payment AP source line is required',
      );
    }
    const sourceLineId = await this.findPaymentSourceLine(
      db,
      payment as {
        companyId: string;
        journalEntryId: string;
        apJournalLineId: string | null;
        payableAccountId: string;
        businessPartnerId: string;
      },
    );
    const sourceLine = await db.journalLine.findFirst({
      where: { id: sourceLineId, companyId: payment.companyId },
      select: { id: true, transactionDebit: true, transactionCredit: true },
    });
    if (!sourceLine) {
      throw new ConflictException(
        'Posted supplier payment AP source line was not found',
      );
    }
    const active = await db.aPReconciliation.aggregate({
      where: {
        companyId: payment.companyId,
        debitJournalLineId: sourceLine.id,
        status: 'ACTIVE',
      },
      _sum: { transactionAmount: true },
    });
    return sourceLine.transactionDebit
      .sub(sourceLine.transactionCredit)
      .sub(active._sum.transactionAmount ?? new Prisma.Decimal(0));
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

  private async allocatePaymentNumber(
    db: Prisma.TransactionClient,
    companyId: string,
    fiscalYearId: string,
    fiscalYearStart: Date,
  ) {
    const rows = await db.$queryRaw<{ allocated: number }[]>(Prisma.sql`
      INSERT INTO "SupplierPaymentSequence" ("companyId", "fiscalYearId", "nextValue", "updatedAt")
      VALUES (${companyId}, ${fiscalYearId}, 2, CURRENT_TIMESTAMP)
      ON CONFLICT ("companyId", "fiscalYearId")
      DO UPDATE SET "nextValue" = "SupplierPaymentSequence"."nextValue" + 1,
                    "updatedAt" = CURRENT_TIMESTAMP
      RETURNING ("nextValue" - 1) AS "allocated"
    `);
    const allocated = rows[0]?.allocated;
    if (!allocated)
      throw new ConflictException('Unable to allocate supplier payment number');
    return `SP-${fiscalYearStart.getUTCFullYear()}-${String(allocated).padStart(6, '0')}`;
  }

  private async findOneWithAllocations(db: Db, companyId: string, id: string) {
    const payment = await db.supplierPayment.findFirst({
      where: { id, companyId },
      include: {
        allocations: { include: { apReconciliation: true } },
        sourceAccount: true,
        payableAccount: true,
      },
    });
    if (!payment) return null;
    return {
      ...this.serialize(payment),
      remainingUnappliedAmount: (
        await this.deriveRemainingUnappliedAmount(db, payment)
      ).toString(),
    };
  }

  private serialize<
    T extends {
      unappliedAmount: Prisma.Decimal;
      allocations?: Array<{ amount: Prisma.Decimal }>;
    },
  >(payment: T) {
    return {
      ...payment,
      remainingUnappliedAmount: payment.unappliedAmount.toString(),
      allocations: payment.allocations?.map((allocation) => ({
        ...allocation,
        amount: allocation.amount.toString(),
      })),
    };
  }

  private postingHash(
    payment: {
      id: string;
      amount: Prisma.Decimal;
      allocations: Array<{ journalLineId: string; amount: Prisma.Decimal }>;
    },
    postingDate: Date,
    idempotencyKey: string,
  ) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          id: payment.id,
          amount: payment.amount.toString(),
          allocations: payment.allocations.map((allocation) => ({
            journalLineId: allocation.journalLineId,
            amount: allocation.amount.toString(),
          })),
          postingDate: this.dateText(postingDate),
          idempotencyKey,
        }),
      )
      .digest('hex');
  }

  private draftHash(input: {
    businessPartnerId: string;
    paymentDate: Date;
    method: SupplierPaymentMethod;
    sourceAccountId: string;
    transactionCurrencyCode: string;
    exchangeRate: Prisma.Decimal;
    amount: Prisma.Decimal;
    reference: string | null;
    notes: string | null;
    allocations: Array<{
      journalLineId: string;
      supplierInvoicePaymentScheduleId?: string;
      amount: Prisma.Decimal;
    }>;
  }) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          businessPartnerId: input.businessPartnerId,
          paymentDate: this.dateText(input.paymentDate),
          method: input.method,
          sourceAccountId: input.sourceAccountId,
          transactionCurrencyCode: input.transactionCurrencyCode,
          exchangeRate: input.exchangeRate.toString(),
          amount: input.amount.toString(),
          reference: input.reference,
          notes: input.notes,
          allocations: input.allocations.map((row) => ({
            journalLineId: row.journalLineId,
            supplierInvoicePaymentScheduleId:
              row.supplierInvoicePaymentScheduleId ?? null,
            amount: row.amount.toString(),
          })),
        }),
      )
      .digest('hex');
  }

  private reversalHash(
    payment: { id: string; journalEntryId: string | null },
    postingDate: Date,
    reason: string,
    idempotencyKey: string,
  ) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          id: payment.id,
          journalEntryId: payment.journalEntryId,
          postingDate: this.dateText(postingDate),
          reason: reason.trim(),
          idempotencyKey,
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
      throw new BadRequestException('Invalid date');
    }
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private dateText(value: Date) {
    return this.dateOnly(value).toISOString().slice(0, 10);
  }
}
