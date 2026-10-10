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
import { CustomerPaymentAllocationInput, CustomerPaymentInput } from './dto';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CustomerPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly readiness: AccountingReadinessService,
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
      const requestHash = this.postingHash(
        payment,
        postingDate,
        idempotencyKey,
      );
      if (payment.status === CustomerPaymentStatus.POSTED) {
        if (
          payment.idempotencyKey !== idempotencyKey.trim() ||
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
      if (!idempotencyKey.trim()) {
        throw new BadRequestException(
          'Payment posting idempotency key is required',
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

      const context = await this.resolvePostingContext(
        db,
        companyId,
        payment.method,
        payment.destinationAccountId,
        payment.transactionCurrencyCode,
      );
      const period = await this.findPeriod(
        db,
        companyId,
        normalizedPostingDate,
      );

      const targetIds = payment.allocations.map(
        (allocation) => allocation.journalLineId,
      );
      for (const journalLineId of [...new Set(targetIds)].sort()) {
        await db.$queryRaw(Prisma.sql`
          SELECT "id" FROM "JournalLine"
          WHERE "id" = ${journalLineId} AND "companyId" = ${companyId}
          FOR UPDATE
        `);
      }
      const targets = await this.validateAndLoadTargets(
        db,
        companyId,
        payment.businessPartnerId,
        payment.transactionCurrencyCode,
        payment.allocations,
      );
      const creditOffsets = await this.creditOffsets(
        db,
        companyId,
        payment.businessPartnerId,
        payment.transactionCurrencyCode,
      );

      const postedAllocations = targetIds.length
        ? await db.customerPaymentAllocation.groupBy({
            by: ['journalLineId'],
            where: {
              companyId,
              journalLineId: { in: [...new Set(targetIds)] },
              customerPayment: { status: CustomerPaymentStatus.POSTED },
            },
            _sum: { amount: true },
          })
        : [];
      const postedReconciliations = targetIds.length
        ? await db.aRReconciliation.groupBy({
            by: ['journalLineId'],
            where: {
              companyId,
              journalLineId: { in: [...new Set(targetIds)] },
            },
            _sum: { amount: true },
          })
        : [];
      const allocatedByLine = new Map(
        postedAllocations.map((row) => [
          row.journalLineId,
          row._sum.amount ?? new Prisma.Decimal(0),
        ]),
      );
      for (const row of postedReconciliations) {
        allocatedByLine.set(
          row.journalLineId,
          (allocatedByLine.get(row.journalLineId) ?? new Prisma.Decimal(0)).add(
            row._sum.amount ?? new Prisma.Decimal(0),
          ),
        );
      }
      const allocationByLine = new Map<string, Prisma.Decimal>();
      for (const allocation of payment.allocations) {
        allocationByLine.set(
          allocation.journalLineId,
          (
            allocationByLine.get(allocation.journalLineId) ??
            new Prisma.Decimal(0)
          ).add(allocation.amount),
        );
      }
      for (const target of targets) {
        const requested =
          allocationByLine.get(target.id) ?? new Prisma.Decimal(0);
        const alreadyAllocated =
          allocatedByLine.get(target.id) ?? new Prisma.Decimal(0);
        const openAmount = target.transactionDebit
          .sub(target.transactionCredit)
          .sub(creditOffsets.get(target.id) ?? new Prisma.Decimal(0))
          .sub(alreadyAllocated);
        if (requested.gt(openAmount)) {
          throw new ConflictException(
            `Customer payment allocation exceeds the open AR amount for ${target.id}`,
          );
        }
      }

      const allocationTotal = payment.allocations.reduce(
        (sum, allocation) => sum.add(allocation.amount),
        new Prisma.Decimal(0),
      );
      const unappliedAmount = payment.amount.sub(allocationTotal);
      if (unappliedAmount.isNegative()) {
        throw new ConflictException(
          'Customer payment allocations exceed payment amount',
        );
      }

      const paymentNumber = await this.allocatePaymentNumber(
        db,
        companyId,
        period.fiscalYearId,
        period.fiscalYear.startDate,
      );
      const lines = [
        {
          accountId: payment.destinationAccountId,
          transactionDebit: payment.amount.toString(),
          transactionCredit: '0',
          description: `Customer payment ${paymentNumber}`,
          documentReference: paymentNumber,
          reconciliationReference: payment.id,
        },
        ...payment.allocations.map((allocation) => ({
          accountId: targets.find(
            (target) => target.id === allocation.journalLineId,
          )!.accountId,
          transactionDebit: '0',
          transactionCredit: allocation.amount.toString(),
          description: `Allocation ${paymentNumber}`,
          businessPartnerId: payment.businessPartnerId,
          documentReference: paymentNumber,
          reconciliationReference: payment.id,
        })),
        ...(unappliedAmount.gt(0)
          ? [
              {
                accountId: context.receivableAccountId,
                transactionDebit: '0',
                transactionCredit: unappliedAmount.toString(),
                description: `Unapplied customer payment ${paymentNumber}`,
                businessPartnerId: payment.businessPartnerId,
                documentReference: paymentNumber,
                reconciliationReference: payment.id,
              },
            ]
          : []),
      ];
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
          idempotencyKey: idempotencyKey.trim(),
          lines,
        },
      );
      await db.customerPayment.update({
        where: { id },
        data: {
          status: CustomerPaymentStatus.POSTED,
          paymentNumber,
          postingDate: normalizedPostingDate,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          idempotencyKey: idempotencyKey.trim(),
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
          metadata: { paymentNumber, journalEntryId: journalEntry.id },
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
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "CustomerPayment"
        WHERE "id" = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.customerPayment.findFirst({
        where: { id, companyId },
      });
      if (!payment) throw new NotFoundException('Customer payment not found');
      if (payment.status === CustomerPaymentStatus.REVERSED) return payment;
      if (
        payment.status !== CustomerPaymentStatus.POSTED ||
        !payment.journalEntryId
      ) {
        throw new ConflictException(
          'Only a posted customer payment can be reversed',
        );
      }
      const period = await this.findPeriod(
        db,
        companyId,
        this.dateOnly(postingDate),
      );
      const reversal = await this.accounting.reverseInTransaction(
        db,
        companyId,
        actorUserId,
        payment.journalEntryId,
        {
          accountingPeriodId: period.id,
          postingDate: this.dateText(this.dateOnly(postingDate)),
          reason,
          idempotencyKey: idempotencyKey.trim(),
        },
      );
      await db.customerPayment.update({
        where: { id },
        data: {
          status: CustomerPaymentStatus.REVERSED,
          reversalJournalEntryId: reversal.id,
          reversedById: actorUserId,
          reversedAt: new Date(),
          reversalReason: reason,
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
    amountValue: string,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey.trim()) {
      throw new BadRequestException(
        'AR reconciliation idempotency key is required',
      );
    }
    return this.prisma.$transaction(async (db) => {
      const existing = await db.aRReconciliation.findFirst({
        where: { companyId, idempotencyKey: idempotencyKey.trim() },
      });
      if (existing) return existing;
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "CustomerPayment"
        WHERE "id" = ${paymentId} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      await db.$queryRaw(Prisma.sql`
        SELECT "id" FROM "JournalLine"
        WHERE "id" = ${journalLineId} AND "companyId" = ${companyId}
        FOR UPDATE
      `);
      const payment = await db.customerPayment.findFirst({
        where: { id: paymentId, companyId },
      });
      if (!payment) throw new NotFoundException('Customer payment not found');
      if (payment.status !== CustomerPaymentStatus.POSTED) {
        throw new ConflictException(
          'Only a posted on-account payment can be reconciled',
        );
      }
      const amount = this.decimal(
        amountValue,
        'customer_payment.reconciliation_invalid',
      );
      if (!amount.gt(0))
        throw new BadRequestException(
          'customer_payment.reconciliation_invalid',
        );
      const target = await this.validateAndLoadTargets(
        db,
        companyId,
        payment.businessPartnerId,
        payment.transactionCurrencyCode,
        [{ journalLineId }],
      ).then((rows) => rows[0]);
      const [reconciledOnAccount, allocatedToTarget, reconciledToTarget] =
        await Promise.all([
          db.aRReconciliation.aggregate({
            where: { companyId, customerPaymentId: paymentId },
            _sum: { amount: true },
          }),
          db.customerPaymentAllocation.aggregate({
            where: {
              companyId,
              journalLineId,
              customerPayment: { status: CustomerPaymentStatus.POSTED },
            },
            _sum: { amount: true },
          }),
          db.aRReconciliation.aggregate({
            where: { companyId, journalLineId },
            _sum: { amount: true },
          }),
        ]);
      const availableOnAccount = payment.unappliedAmount.sub(
        reconciledOnAccount._sum.amount ?? new Prisma.Decimal(0),
      );
      if (amount.gt(availableOnAccount)) {
        throw new ConflictException(
          'On-account amount is already fully reconciled',
        );
      }
      const openTarget = target.transactionDebit
        .sub(target.transactionCredit)
        .sub(
          (
            await this.creditOffsets(
              db,
              companyId,
              payment.businessPartnerId,
              payment.transactionCurrencyCode,
            )
          ).get(target.id) ?? new Prisma.Decimal(0),
        )
        .sub(allocatedToTarget._sum.amount ?? new Prisma.Decimal(0))
        .sub(reconciledToTarget._sum.amount ?? new Prisma.Decimal(0));
      if (amount.gt(openTarget)) {
        throw new ConflictException(
          'AR reconciliation exceeds the exact remaining open amount',
        );
      }
      const reconciliation = await db.aRReconciliation.create({
        data: {
          companyId,
          customerPaymentId: paymentId,
          journalLineId,
          amount,
          idempotencyKey: idempotencyKey.trim(),
          createdById: actorUserId,
        },
      });
      await db.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'customer-payment.on-account-reconciled',
          entityType: 'ARReconciliation',
          entityId: reconciliation.id,
          metadata: { paymentId, journalLineId, amount: amount.toString() },
        },
      });
      return reconciliation;
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
      include: { allocations: true, destinationAccount: true },
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

  async listOpenItems(companyId: string, businessPartnerId: string) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        companyId,
        businessPartnerId,
        account: { accountType: AccountingAccountType.ASSET_RECEIVABLE },
        journalEntry: { status: 'POSTED' },
        transactionDebit: { gt: 0 },
      },
      include: {
        journalEntry: {
          select: { transactionCurrencyCode: true, documentReference: true },
        },
        salesInvoicePaymentSchedule: {
          select: { id: true, dueDate: true, salesInvoiceId: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    const posted = await this.prisma.customerPaymentAllocation.groupBy({
      by: ['journalLineId'],
      where: {
        companyId,
        customerPayment: { status: CustomerPaymentStatus.POSTED },
      },
      _sum: { amount: true },
    });
    const allocated = new Map(
      posted.map((row) => [
        row.journalLineId,
        row._sum.amount ?? new Prisma.Decimal(0),
      ]),
    );
    const reconciled = await this.prisma.aRReconciliation.groupBy({
      by: ['journalLineId'],
      where: { companyId },
      _sum: { amount: true },
    });
    for (const row of reconciled) {
      allocated.set(
        row.journalLineId,
        (allocated.get(row.journalLineId) ?? new Prisma.Decimal(0)).add(
          row._sum.amount ?? new Prisma.Decimal(0),
        ),
      );
    }
    const creditOffsetsByCurrency = new Map<
      string,
      Map<string, Prisma.Decimal>
    >();
    for (const currencyCode of new Set(
      lines.map((line) => line.journalEntry.transactionCurrencyCode),
    )) {
      creditOffsetsByCurrency.set(
        currencyCode,
        await this.creditOffsets(
          this.prisma,
          companyId,
          businessPartnerId,
          currencyCode,
        ),
      );
    }
    return lines
      .map((line) => ({
        id: line.id,
        maturityId: line.salesInvoicePaymentSchedule?.id ?? null,
        invoiceId: line.salesInvoicePaymentSchedule?.salesInvoiceId ?? null,
        dueDate: line.dueDate,
        documentReference:
          line.documentReference ?? line.journalEntry.documentReference,
        currencyCode: line.journalEntry.transactionCurrencyCode,
        originalAmount: line.transactionDebit
          .sub(line.transactionCredit)
          .toString(),
        allocatedAmount: (
          allocated.get(line.id) ?? new Prisma.Decimal(0)
        ).toString(),
        remainingAmount: line.transactionDebit
          .sub(line.transactionCredit)
          .sub(
            creditOffsetsByCurrency
              .get(line.journalEntry.transactionCurrencyCode)
              ?.get(line.id) ?? new Prisma.Decimal(0),
          )
          .sub(allocated.get(line.id) ?? new Prisma.Decimal(0))
          .toString(),
      }))
      .filter((line) => new Prisma.Decimal(line.remainingAmount).gt(0));
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
    if (!exchangeRate.gt(0))
      throw new BadRequestException('customer_payment.exchange_rate_invalid');
    const currencyCode = input.transactionCurrencyCode.trim().toUpperCase();
    const currency = await db.currency.findFirst({
      where: { code: currencyCode, isActive: true },
    });
    if (!currency)
      throw new BadRequestException('customer_payment.currency_invalid');
    const configuration = await db.accountingConfiguration.findUnique({
      where: { companyId },
    });
    if (!configuration)
      throw new ConflictException(
        'Accounting configuration must be initialized before recording payments',
      );
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
    await this.validateDestinationAccount(
      db,
      companyId,
      input.method,
      input.destinationAccountId,
    );
    const allocations = await this.validateAndLoadTargets(
      db,
      companyId,
      input.businessPartnerId,
      currencyCode,
      input.allocations,
    );
    const normalizedAllocations = input.allocations.map((inputAllocation) => ({
      ...inputAllocation,
      amount: this.decimal(
        inputAllocation.amount,
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
      )!;
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
      if (target.journalEntry.transactionCurrencyCode !== currencyCode) {
        throw new ConflictException(
          'Cross-currency AR allocation requires an explicit FX settlement',
        );
      }
    }
    return {
      businessPartnerId: input.businessPartnerId,
      paymentDate,
      method: input.method,
      destinationAccountId: input.destinationAccountId,
      transactionCurrencyCode: currencyCode,
      exchangeRate,
      amount,
      unappliedAmount: amount.sub(allocationTotal),
      notes: input.notes?.trim() || null,
      idempotencyKey: input.idempotencyKey?.trim() || null,
      allocations: normalizedAllocations,
    };
  }

  private async validateAndLoadTargets(
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
        },
        journalEntry: { status: 'POSTED' },
      },
      include: {
        account: true,
        journalEntry: { select: { transactionCurrencyCode: true } },
      },
    });
    if (targets.length !== ids.length) {
      throw new ConflictException(
        'One or more AR allocation targets are invalid, closed, or belong to another customer',
      );
    }
    if (
      targets.some((target) =>
        target.transactionDebit.lte(target.transactionCredit),
      )
    ) {
      throw new ConflictException(
        'Only debit AR open items can receive customer payment allocations',
      );
    }
    if (
      targets.some(
        (target) =>
          target.journalEntry.transactionCurrencyCode !== currencyCode,
      )
    ) {
      throw new ConflictException(
        'Cross-currency AR allocation requires an explicit FX settlement',
      );
    }
    return targets;
  }

  private async creditOffsets(
    db: Db,
    companyId: string,
    businessPartnerId: string,
    currencyCode: string,
  ) {
    const [debits, credits] = await Promise.all([
      db.journalLine.findMany({
        where: {
          companyId,
          businessPartnerId,
          account: { accountType: AccountingAccountType.ASSET_RECEIVABLE },
          journalEntry: {
            status: 'POSTED',
            transactionCurrencyCode: currencyCode,
          },
          transactionDebit: { gt: 0 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, transactionDebit: true, transactionCredit: true },
      }),
      db.journalLine.aggregate({
        where: {
          companyId,
          businessPartnerId,
          account: { accountType: AccountingAccountType.ASSET_RECEIVABLE },
          journalEntry: {
            status: 'POSTED',
            sourceType: JournalSourceType.SALES_CREDIT_NOTE,
            transactionCurrencyCode: currencyCode,
          },
        },
        _sum: { transactionCredit: true, transactionDebit: true },
      }),
    ]);
    let creditPool = (
      credits._sum.transactionCredit ?? new Prisma.Decimal(0)
    ).sub(credits._sum.transactionDebit ?? new Prisma.Decimal(0));
    const offsets = new Map<string, Prisma.Decimal>();
    for (const debit of debits) {
      if (!creditPool.gt(0)) break;
      const open = debit.transactionDebit.sub(debit.transactionCredit);
      const offset = creditPool.lt(open) ? creditPool : open;
      offsets.set(debit.id, offset);
      creditPool = creditPool.sub(offset);
    }
    return offsets;
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
    const expected =
      method === CustomerPaymentMethod.CASH
        ? AccountingAccountType.ASSET_CASH
        : method === CustomerPaymentMethod.OTHER
          ? null
          : AccountingAccountType.ASSET_BANK;
    if (expected && account.accountType !== expected) {
      throw new ConflictException(
        `Payment method ${method} requires a ${expected} destination account`,
      );
    }
    if (
      account.accountType !== AccountingAccountType.ASSET_CASH &&
      account.accountType !== AccountingAccountType.ASSET_BANK
    ) {
      throw new ConflictException(
        'Customer payments can only target cash or bank accounts',
      );
    }
    return account;
  }

  private async resolvePostingContext(
    db: Db,
    companyId: string,
    method: CustomerPaymentMethod,
    destinationAccountId: string,
    currencyCode: string,
  ) {
    const account = await this.validateDestinationAccount(
      db,
      companyId,
      method,
      destinationAccountId,
    );
    const configuration = await db.accountingConfiguration.findUnique({
      where: { companyId },
      include: { accountDefaults: true, journalDefaults: true },
    });
    if (!configuration)
      throw new ConflictException('Accounting configuration is required');
    const key =
      account.accountType === AccountingAccountType.ASSET_CASH
        ? AccountingConfigJournalKey.CASH
        : AccountingConfigJournalKey.BANK;
    const journalMapping = configuration.journalDefaults.find(
      (mapping) => mapping.settingKey === key,
    );
    const journal = journalMapping
      ? await db.accountingJournal.findFirst({
          where: { id: journalMapping.journalId, companyId, isActive: true },
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
    const receivable = configuration.accountDefaults.find(
      (mapping) => mapping.settingKey === AccountingConfigAccountKey.RECEIVABLE,
    );
    if (!receivable)
      throw new ConflictException(
        'Receivable account mapping is required for unapplied payments',
      );
    return { journalId: journal.id, receivableAccountId: receivable.accountId };
  }

  private async findPeriod(db: Db, companyId: string, postingDate: Date) {
    const period = await db.accountingPeriod.findFirst({
      where: {
        companyId,
        startDate: { lte: postingDate },
        endDate: { gte: postingDate },
      },
      include: { fiscalYear: true },
    });
    if (!period)
      throw new ConflictException(
        'No accounting period covers the payment posting date',
      );
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

  private async findOneWithAllocations(db: Db, companyId: string, id: string) {
    return db.customerPayment.findFirst({
      where: { id, companyId },
      include: { allocations: true, destinationAccount: true },
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
      exchangeRate: Prisma.Decimal;
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
          exchangeRate: payment.exchangeRate.toString(),
          allocations: payment.allocations.map((allocation) => ({
            journalLineId: allocation.journalLineId,
            amount: allocation.amount.toString(),
          })),
          postingDate: this.dateText(this.dateOnly(postingDate)),
          idempotencyKey: idempotencyKey.trim(),
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
    return value.toISOString().slice(0, 10);
  }
}
