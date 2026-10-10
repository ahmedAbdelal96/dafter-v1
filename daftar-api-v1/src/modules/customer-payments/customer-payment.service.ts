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
  CustomerPaymentMethod,
  CustomerPaymentStatus,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { ARReconciliationService } from './ar-reconciliation.service';
import { CustomerPaymentAllocationInput, CustomerPaymentInput } from './dto';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CustomerPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
    private readonly ar: ARReconciliationService,
  ) {}

  async createDraft(
    companyId: string,
    actorUserId: string,
    input: CustomerPaymentInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const normalized = await this.validatePaymentInput(db, companyId, input);
      const existing = input.idempotencyKey
        ? await db.customerPayment.findFirst({
            where: { companyId, idempotencyKey: input.idempotencyKey.trim() },
            include: { allocations: true },
          })
        : null;
      if (existing) return this.serialize(existing);
      const payment = await db.customerPayment.create({
        data: {
          companyId,
          businessPartnerId: normalized.businessPartnerId,
          status: CustomerPaymentStatus.DRAFT,
          paymentDate: normalized.paymentDate,
          method: normalized.method,
          destinationAccountId: normalized.destinationAccountId,
          receivableAccountId: normalized.receivableAccountId,
          transactionCurrencyCode: normalized.transactionCurrencyCode,
          exchangeRate: normalized.exchangeRate,
          amount: normalized.amount,
          unappliedAmount: normalized.unappliedAmount,
          notes: normalized.notes,
          idempotencyKey: normalized.idempotencyKey,
          createdById: actorUserId,
          allocations: {
            create: normalized.allocations.map((allocation) => ({
              journalLineId: allocation.journalLineId,
              salesInvoicePaymentScheduleId:
                allocation.salesInvoicePaymentScheduleId,
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
          action: 'customer-payment.draft-created',
          entityType: 'CustomerPayment',
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
    input: CustomerPaymentInput,
  ) {
    return this.prisma.$transaction(async (db) => {
      const current = await db.customerPayment.findFirst({
        where: { id, companyId },
        include: { allocations: true },
      });
      if (!current) throw new NotFoundException('Customer payment not found');
      if (current.status !== CustomerPaymentStatus.DRAFT) {
        throw new ConflictException(
          'Posted customer payments are immutable; use reversal',
        );
      }
      const normalized = await this.validatePaymentInput(db, companyId, input);
      await db.customerPaymentAllocation.deleteMany({
        where: { companyId, customerPaymentId: id },
      });
      const payment = await db.customerPayment.update({
        where: { id },
        data: {
          businessPartnerId: normalized.businessPartnerId,
          paymentDate: normalized.paymentDate,
          method: normalized.method,
          destinationAccountId: normalized.destinationAccountId,
          receivableAccountId: normalized.receivableAccountId,
          transactionCurrencyCode: normalized.transactionCurrencyCode,
          exchangeRate: normalized.exchangeRate,
          amount: normalized.amount,
          unappliedAmount: normalized.unappliedAmount,
          notes: normalized.notes,
          idempotencyKey: normalized.idempotencyKey,
          allocations: {
            create: normalized.allocations.map((allocation) => ({
              journalLineId: allocation.journalLineId,
              salesInvoicePaymentScheduleId:
                allocation.salesInvoicePaymentScheduleId,
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
          action: 'customer-payment.draft-updated',
          entityType: 'CustomerPayment',
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
        SELECT "id" FROM "CustomerPayment"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.customerPayment.findFirst({
        where: { id, companyId },
        include: { allocations: true },
      });
      if (!payment) throw new NotFoundException('Customer payment not found');
      const requestHash = this.postingHash(payment, postingDate, key);
      if (payment.status === CustomerPaymentStatus.POSTED) {
        if (
          payment.idempotencyKey !== key ||
          payment.requestHash !== requestHash
        ) {
          throw new ConflictException(
            'Customer payment is already posted with another request',
          );
        }
        return this.findOneWithAllocations(db, companyId, id);
      }
      if (payment.status !== CustomerPaymentStatus.DRAFT) {
        throw new ConflictException(
          'Reversed customer payments cannot be posted',
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
        payment.destinationAccountId,
        payment.receivableAccountId,
        payment.transactionCurrencyCode,
      );
      const allocationTotal = payment.allocations.reduce(
        (sum, allocation) => sum.add(allocation.amount),
        new Prisma.Decimal(0),
      );
      if (allocationTotal.gt(payment.amount)) {
        throw new ConflictException(
          'Customer payment allocations exceed payment amount',
        );
      }
      await this.lockTargetLines(
        db,
        companyId,
        payment.allocations.map((allocation) => allocation.journalLineId),
      );
      await this.validateDebitTargets(
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
          description: `Customer payment ${paymentNumber}`,
          sourceType: JournalSourceType.CUSTOMER_PAYMENT,
          sourceId: payment.id,
          idempotencyKey: key,
          lines: [
            {
              accountId: payment.destinationAccountId,
              transactionDebit: payment.amount.toString(),
              transactionCredit: '0',
              description: `Customer payment ${paymentNumber}`,
              documentReference: paymentNumber,
              reconciliationReference: payment.id,
            },
            {
              accountId: payment.receivableAccountId,
              transactionDebit: '0',
              transactionCredit: payment.amount.toString(),
              description: `Customer payment AR source ${paymentNumber}`,
              businessPartnerId: payment.businessPartnerId,
              documentReference: paymentNumber,
              reconciliationReference: payment.id,
            },
          ],
        },
      );
      const sourceCredit = await db.journalLine.findFirst({
        where: {
          companyId,
          journalEntryId: journalEntry.id,
          accountId: payment.receivableAccountId,
          businessPartnerId: payment.businessPartnerId,
          transactionCredit: { gt: 0 },
        },
      });
      if (!sourceCredit) {
        throw new ConflictException(
          'Posted customer payment AR source line was not created',
        );
      }
      for (const allocation of payment.allocations) {
        const reconciliation = await this.ar.reconcileInTransaction(db, {
          companyId,
          actorUserId,
          debitJournalLineId: allocation.journalLineId,
          creditJournalLineId: sourceCredit.id,
          transactionAmount: allocation.amount.toString(),
          idempotencyKey: `customer-payment:${payment.id}:allocation:${allocation.id}`,
          postingDate: normalizedPostingDate,
          customerPaymentId: payment.id,
        });
        await db.customerPaymentAllocation.update({
          where: { id: allocation.id },
          data: { arReconciliationId: reconciliation.id },
        });
      }
      const unappliedAmount = payment.amount.sub(allocationTotal);
      await db.customerPayment.update({
        where: { id },
        data: {
          status: CustomerPaymentStatus.POSTED,
          paymentNumber,
          postingDate: normalizedPostingDate,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          arJournalLineId: sourceCredit.id,
          idempotencyKey: key,
          requestHash,
          unappliedAmount,
        },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'customer-payment.posted',
          entityType: 'CustomerPayment',
          entityId: id,
          metadata: {
            paymentNumber,
            journalEntryId: journalEntry.id,
            sourceCreditJournalLineId: sourceCredit.id,
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
        SELECT "id" FROM "CustomerPayment"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.customerPayment.findFirst({
        where: { id, companyId },
      });
      if (!payment) throw new NotFoundException('Customer payment not found');
      const requestHash = this.reversalHash(payment, postingDate, reason, key);
      if (payment.status === CustomerPaymentStatus.REVERSED) {
        if (payment.reversalRequestHash !== requestHash) {
          throw new ConflictException(
            'Customer payment reversal payload does not match the original request',
          );
        }
        return this.findOneWithAllocations(db, companyId, id);
      }
      if (
        payment.status !== CustomerPaymentStatus.POSTED ||
        !payment.journalEntryId
      ) {
        throw new ConflictException(
          'Only a posted customer payment can be reversed',
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
      const reconciliations = await db.aRReconciliation.findMany({
        where: {
          companyId,
          customerPaymentId: id,
          status: 'ACTIVE',
        },
        orderBy: { id: 'asc' },
      });
      for (const reconciliation of reconciliations) {
        await this.ar.reverseInTransaction(db, {
          companyId,
          actorUserId,
          reconciliationId: reconciliation.id,
          postingDate,
          reason: `Customer payment reversal: ${reason.trim()}`,
          idempotencyKey: `ar-reconciliation-reversal:${reconciliation.id}:${key}`,
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
      await db.customerPayment.update({
        where: { id },
        data: {
          status: CustomerPaymentStatus.REVERSED,
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
        SELECT "id" FROM "CustomerPayment"
        WHERE "id" = ${paymentId} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.customerPayment.findFirst({
        where: { id: paymentId, companyId },
      });
      if (!payment) throw new NotFoundException('Customer payment not found');
      if (
        payment.status !== CustomerPaymentStatus.POSTED ||
        !payment.journalEntryId
      ) {
        throw new ConflictException(
          'Only a posted customer payment can be reconciled',
        );
      }
      const journalEntryId = payment.journalEntryId;
      return this.ar.reconcileInTransaction(db, {
        companyId,
        actorUserId,
        debitJournalLineId: journalLineId,
        creditJournalLineId: await this.findPaymentSourceLine(db, {
          ...payment,
          journalEntryId,
        }),
        transactionAmount: amount,
        idempotencyKey,
        postingDate,
        customerPaymentId: paymentId,
      });
    });
  }

  findAll(
    companyId: string,
    query: { status?: CustomerPaymentStatus; businessPartnerId?: string },
  ) {
    return this.prisma.customerPayment.findMany({
      where: {
        companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.businessPartnerId
          ? { businessPartnerId: query.businessPartnerId }
          : {}),
      },
      include: {
        allocations: true,
        destinationAccount: true,
        receivableAccount: true,
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(companyId: string, id: string) {
    const payment = await this.findOneWithAllocations(
      this.prisma,
      companyId,
      id,
    );
    if (!payment) throw new NotFoundException('Customer payment not found');
    return payment;
  }

  listOpenItems(companyId: string, businessPartnerId: string) {
    return this.ar.listOpenItems(companyId, businessPartnerId);
  }

  private async validatePaymentInput(
    db: Db,
    companyId: string,
    input: CustomerPaymentInput,
  ) {
    const paymentDate = this.dateOnly(input.paymentDate);
    const amount = this.decimal(
      input.amount,
      'customer_payment.amount_invalid',
    );
    if (!amount.gt(0))
      throw new BadRequestException('customer_payment.amount_invalid');
    const exchangeRate = this.decimal(
      input.exchangeRate,
      'customer_payment.exchange_rate_invalid',
    );
    if (!exchangeRate.gt(0)) {
      throw new BadRequestException('customer_payment.exchange_rate_invalid');
    }
    const currencyCode = input.transactionCurrencyCode.trim().toUpperCase();
    const currency = await db.currency.findFirst({
      where: { code: currencyCode, isActive: true },
    });
    if (!currency)
      throw new BadRequestException('customer_payment.currency_invalid');
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
      include: { customerProfile: true },
    });
    if (!partner || !partner.isActive || !partner.customerProfile?.isActive) {
      throw new ConflictException(
        'An active customer BusinessPartner is required',
      );
    }
    const receivableAccount = await this.resolveReceivableAccount(
      db,
      companyId,
      partner.customerProfile.receivableAccountId,
      configuration.accountDefaults,
    );
    await this.validateDestinationAccount(
      db,
      companyId,
      input.method,
      input.destinationAccountId,
    );
    const allocations = await this.validateDebitTargets(
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
        'customer_payment.allocation_invalid',
      ),
    }));
    if (
      new Set(
        normalizedAllocations.map((allocation) => allocation.journalLineId),
      ).size !== normalizedAllocations.length
    ) {
      throw new ConflictException(
        'Each AR maturity may appear only once in a payment allocation',
      );
    }
    if (normalizedAllocations.some((allocation) => !allocation.amount.gt(0))) {
      throw new BadRequestException('customer_payment.allocation_invalid');
    }
    const allocationTotal = normalizedAllocations.reduce(
      (sum, allocation) => sum.add(allocation.amount),
      new Prisma.Decimal(0),
    );
    if (allocationTotal.gt(amount)) {
      throw new ConflictException(
        'Customer payment allocations exceed payment amount',
      );
    }
    for (const allocation of input.allocations) {
      const target = allocations.find(
        (candidate) => candidate.id === allocation.journalLineId,
      );
      if (!target) continue;
      if (allocation.salesInvoicePaymentScheduleId) {
        const schedule = await db.salesInvoicePaymentSchedule.findFirst({
          where: {
            id: allocation.salesInvoicePaymentScheduleId,
            companyId,
            journalLineId: allocation.journalLineId,
          },
        });
        if (!schedule)
          throw new ConflictException(
            'Allocation maturity does not match its AR journal line',
          );
      }
    }
    return {
      businessPartnerId: input.businessPartnerId,
      paymentDate,
      method: input.method,
      destinationAccountId: input.destinationAccountId,
      receivableAccountId: receivableAccount.id,
      transactionCurrencyCode: currencyCode,
      exchangeRate,
      amount,
      unappliedAmount: amount.sub(allocationTotal),
      notes: input.notes?.trim() || null,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      allocations: normalizedAllocations,
    };
  }

  private async resolveReceivableAccount(
    db: Db,
    companyId: string,
    overrideId: string | null,
    mappings: Array<{
      settingKey: AccountingConfigAccountKey;
      accountId: string;
    }>,
  ) {
    const fallback = mappings.find(
      (mapping) => mapping.settingKey === AccountingConfigAccountKey.RECEIVABLE,
    )?.accountId;
    const accountId = overrideId ?? fallback;
    if (!accountId)
      throw new ConflictException('Receivable account mapping is required');
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
      account.accountType !== AccountingAccountType.ASSET_RECEIVABLE ||
      !account.isControlAccount ||
      !account.reconciliationEligible
    ) {
      throw new ConflictException(
        'Customer receivable account override is invalid',
      );
    }
    return account;
  }

  private async resolvePostingContext(
    db: Db,
    companyId: string,
    method: CustomerPaymentMethod,
    destinationAccountId: string,
    receivableAccountId: string,
    currencyCode: string,
  ) {
    const destination = await this.validateDestinationAccount(
      db,
      companyId,
      method,
      destinationAccountId,
    );
    const receivable = await db.accountingAccount.findFirst({
      where: { id: receivableAccountId, companyId },
    });
    if (
      !receivable ||
      !receivable.isActive ||
      !receivable.allowDirectPosting ||
      receivable.accountType !== AccountingAccountType.ASSET_RECEIVABLE ||
      !receivable.isControlAccount ||
      !receivable.reconciliationEligible
    ) {
      throw new ConflictException(
        'Customer receivable account is invalid or inactive',
      );
    }
    const configuration = await db.accountingConfiguration.findUnique({
      where: { companyId },
      include: { journalDefaults: true },
    });
    if (!configuration)
      throw new ConflictException('Accounting configuration is required');
    const key =
      destination.accountType === AccountingAccountType.ASSET_CASH
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
        'Payment currency does not match the destination journal currency',
      );
    }
    return { journalId: journal.id };
  }

  private async validateDestinationAccount(
    db: Db,
    companyId: string,
    method: CustomerPaymentMethod,
    accountId: string,
  ) {
    const account = await db.accountingAccount.findFirst({
      where: { id: accountId, companyId },
    });
    if (!account || !account.isActive || !account.allowDirectPosting) {
      throw new ConflictException(
        'Customer payment destination account is invalid or inactive',
      );
    }
    const bankLike = new Set<CustomerPaymentMethod>([
      CustomerPaymentMethod.BANK_TRANSFER,
      CustomerPaymentMethod.CHEQUE,
      CustomerPaymentMethod.CARD,
    ]).has(method);
    const validType = bankLike
      ? account.accountType === AccountingAccountType.ASSET_BANK
      : method === CustomerPaymentMethod.CASH
        ? account.accountType === AccountingAccountType.ASSET_CASH
        : account.accountType === AccountingAccountType.ASSET_CASH ||
          account.accountType === AccountingAccountType.ASSET_BANK;
    if (!validType) {
      throw new ConflictException(
        'Customer payment destination account type is invalid for the payment method',
      );
    }
    return account;
  }

  private async validateDebitTargets(
    db: Db,
    companyId: string,
    businessPartnerId: string,
    currencyCode: string,
    allocations: Array<Pick<CustomerPaymentAllocationInput, 'journalLineId'>>,
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
          accountType: AccountingAccountType.ASSET_RECEIVABLE,
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
        'One or more AR debit targets are invalid or belong to another customer',
      );
    }
    if (
      targets.some((target) =>
        target.transactionDebit.lte(target.transactionCredit),
      )
    ) {
      throw new ConflictException(
        'Customer payments can only settle debit AR open items',
      );
    }
    if (
      targets.some(
        (target) =>
          target.journalEntry.transactionCurrencyCode !== currencyCode,
      )
    ) {
      throw new ConflictException(
        'Cross-currency AR allocation requires an explicit FX settlement policy',
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
    db: Prisma.TransactionClient,
    payment: {
      companyId: string;
      journalEntryId: string;
      arJournalLineId: string | null;
      receivableAccountId: string;
      businessPartnerId: string;
    },
  ) {
    if (payment.arJournalLineId) return payment.arJournalLineId;
    const line = await db.journalLine.findFirst({
      where: {
        companyId: payment.companyId,
        journalEntryId: payment.journalEntryId,
        accountId: payment.receivableAccountId,
        businessPartnerId: payment.businessPartnerId,
        transactionCredit: { gt: 0 },
      },
    });
    if (!line)
      throw new ConflictException(
        'Customer payment AR source line was not found',
      );
    return line.id;
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
      INSERT INTO "CustomerPaymentSequence" ("companyId", "fiscalYearId", "nextValue", "updatedAt")
      VALUES (${companyId}, ${fiscalYearId}, 2, CURRENT_TIMESTAMP)
      ON CONFLICT ("companyId", "fiscalYearId")
      DO UPDATE SET "nextValue" = "CustomerPaymentSequence"."nextValue" + 1,
                    "updatedAt" = CURRENT_TIMESTAMP
      RETURNING ("nextValue" - 1) AS "allocated"
    `);
    const allocated = rows[0]?.allocated;
    if (!allocated)
      throw new ConflictException('Unable to allocate customer payment number');
    return `CP-${fiscalYearStart.getUTCFullYear()}-${String(allocated).padStart(6, '0')}`;
  }

  private findOneWithAllocations(db: Db, companyId: string, id: string) {
    return db.customerPayment.findFirst({
      where: { id, companyId },
      include: {
        allocations: { include: { arReconciliation: true } },
        destinationAccount: true,
        receivableAccount: true,
      },
    });
  }

  private serialize<
    T extends { allocations?: Array<{ amount: Prisma.Decimal }> },
  >(payment: T) {
    return {
      ...payment,
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
