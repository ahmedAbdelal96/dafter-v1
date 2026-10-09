import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountingAccountType,
  AccountingPeriodStatus,
  FiscalYearStatus,
  JournalSourceType,
  OpeningBalanceBatchStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingMoney } from '../accounting/accounting.money';
import { validateAccountingCounterparty } from '../accounting/accounting-policies';

export interface OpeningBalanceLineInput {
  accountId: string;
  debit: string;
  credit: string;
  businessPartnerId?: string;
  description?: string;
}

export interface CreateOpeningBalanceInput {
  companyId: string;
  actorUserId: string;
  idempotencyKey: string;
  effectiveDate: Date;
  accountingPeriodId: string;
  description: string;
  lines: OpeningBalanceLineInput[];
}

export interface ReverseOpeningBalanceInput {
  accountingPeriodId: string;
  postingDate: string;
  reason: string;
  idempotencyKey: string;
}

const BATCH_INCLUDE = {
  lines: {
    include: {
      account: true,
      businessPartner: {
        include: { customerProfile: true, supplierProfile: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  accountingPeriod: { include: { fiscalYear: true } },
};

@Injectable()
export class OpeningBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly idempotency: PlatformIdempotencyService,
  ) {}

  createDraft(input: CreateOpeningBalanceInput) {
    if (!input.idempotencyKey.trim())
      throw new BadRequestException(
        'Opening balance idempotency key is required',
      );
    const payload = {
      ...input,
      effectiveDate: input.effectiveDate.toISOString(),
    };
    return this.idempotency.executeMutation({
      scope: 'opening-balances',
      operationType: 'opening-balance-draft',
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      idempotencyKey: input.idempotencyKey,
      payload,
      run: () => this.createDraftInternal(input),
    });
  }

  async validate(companyId: string, actorUserId: string, batchId: string) {
    return this.prisma.$transaction(async (db) => {
      const batch = await this.lockBatch(db, companyId, batchId);
      if (batch.status !== OpeningBalanceBatchStatus.DRAFT)
        throw new ConflictException(
          'Only draft opening balances can be validated',
        );
      this.assertOpenPeriod(batch);
      this.assertBalanced(batch.lines);
      await this.validateCounterparties(db, companyId, batch.lines);
      const updated = await db.openingBalanceBatch.update({
        where: { id: batch.id },
        data: {
          status: OpeningBalanceBatchStatus.VALIDATED,
          validatedAt: new Date(),
        },
        include: BATCH_INCLUDE,
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'opening-balances.validated',
        updated.id,
        { lineCount: updated.lines.length },
      );
      return updated;
    });
  }

  async post(
    companyId: string,
    actorUserId: string,
    batchId: string,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey.trim())
      throw new BadRequestException('Opening balance posting key is required');
    const requestHash = this.idempotency.buildRequestHash({
      batchId,
    });
    return this.prisma.$transaction(async (db) => {
      const batch = await this.lockBatch(db, companyId, batchId);
      if (batch.status === OpeningBalanceBatchStatus.POSTED) {
        if (
          batch.postingIdempotencyKey === idempotencyKey &&
          batch.postingRequestHash === requestHash
        )
          return batch;
        throw new ConflictException(
          'Opening balance batch has already been posted',
        );
      }
      if (batch.status === OpeningBalanceBatchStatus.REVERSED)
        throw new ConflictException(
          'A reversed opening balance cannot be posted again',
        );
      if (batch.status !== OpeningBalanceBatchStatus.VALIDATED)
        throw new ConflictException(
          'Opening balance batch must be validated before posting',
        );
      this.assertOpenPeriod(batch);
      this.assertBalanced(batch.lines);
      await this.validateCounterparties(db, companyId, batch.lines);
      const general = await db.accountingConfigurationJournal.findFirst({
        where: { companyId, settingKey: 'GENERAL' },
        include: { journal: true },
      });
      const configuration = await db.accountingConfiguration.findUnique({
        where: { companyId },
      });
      if (!general || !general.journal.isActive || !configuration)
        throw new BadRequestException(
          'General accounting journal and accounting configuration are required',
        );
      const entry = await this.accounting.postInternalInTransaction(
        db,
        companyId,
        actorUserId,
        {
          journalId: general.journalId,
          accountingPeriodId: batch.accountingPeriodId,
          postingDate: batch.effectiveDate.toISOString(),
          documentDate: batch.effectiveDate.toISOString(),
          transactionCurrencyCode: configuration.baseCurrencyCode,
          exchangeRate: '1',
          description: batch.description,
          documentReference: `OPENING-${batch.id}`,
          sourceType: JournalSourceType.OPENING_BALANCE,
          sourceId: batch.id,
          idempotencyKey: `opening-batch:${batch.id}:post`,
          lines: batch.lines.map((line) => ({
            accountId: line.accountId,
            businessPartnerId: line.businessPartnerId ?? undefined,
            transactionDebit: line.debit.toString(),
            transactionCredit: line.credit.toString(),
            description: line.description ?? undefined,
          })),
        },
      );
      const result = await db.openingBalanceBatch.update({
        where: { id: batch.id },
        data: {
          status: OpeningBalanceBatchStatus.POSTED,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: entry.id,
          postingIdempotencyKey: idempotencyKey,
          postingRequestHash: requestHash,
        },
        include: BATCH_INCLUDE,
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'opening-balances.posted',
        result.id,
        { journalEntryId: entry.id },
      );
      return result;
    });
  }

  async reverse(
    companyId: string,
    actorUserId: string,
    batchId: string,
    dto: ReverseOpeningBalanceInput,
  ) {
    if (!dto.idempotencyKey.trim())
      throw new BadRequestException('Opening balance reversal key is required');
    const requestHash = this.idempotency.buildRequestHash({
      batchId,
      accountingPeriodId: dto.accountingPeriodId,
      postingDate: dto.postingDate,
      reason: dto.reason,
    });
    return this.prisma.$transaction(async (db) => {
      const batch = await this.lockBatch(db, companyId, batchId);
      if (batch.status === OpeningBalanceBatchStatus.REVERSED) {
        if (
          batch.reversalIdempotencyKey === dto.idempotencyKey &&
          batch.reversalRequestHash === requestHash
        )
          return batch;
        throw new ConflictException(
          'Opening balance reversal key or payload does not match the existing reversal',
        );
      }
      if (
        batch.status !== OpeningBalanceBatchStatus.POSTED ||
        !batch.journalEntryId
      )
        throw new ConflictException(
          'Only a posted opening balance can be reversed',
        );
      const reversal = await this.accounting.reverseInTransaction(
        db,
        companyId,
        actorUserId,
        batch.journalEntryId,
        {
          accountingPeriodId: dto.accountingPeriodId,
          postingDate: dto.postingDate,
          reason: dto.reason,
          idempotencyKey: `opening-batch:${batch.id}:reverse`,
        },
      );
      const updated = await db.openingBalanceBatch.update({
        where: { id: batch.id },
        data: {
          status: OpeningBalanceBatchStatus.REVERSED,
          reversedAt: new Date(),
          reversalReason: dto.reason,
          reversalJournalEntryId: reversal.id,
          reversalIdempotencyKey: dto.idempotencyKey,
          reversalRequestHash: requestHash,
        },
        include: BATCH_INCLUDE,
      });
      await this.audit(
        db,
        companyId,
        actorUserId,
        'opening-balances.reversed',
        updated.id,
        { reversalEntryId: reversal.id, reason: dto.reason },
      );
      return updated;
    });
  }

  private async createDraftInternal(input: CreateOpeningBalanceInput) {
    return this.prisma.$transaction(async (db) => {
      if (!input.lines.length)
        throw new BadRequestException(
          'Opening balance batch must contain lines',
        );
      const period = await db.accountingPeriod.findFirst({
        where: { id: input.accountingPeriodId, companyId: input.companyId },
        include: { fiscalYear: true },
      });
      if (!period)
        throw new NotFoundException(
          'Accounting period not found for this company',
        );
      if (
        input.effectiveDate < period.startDate ||
        input.effectiveDate > period.endDate
      )
        throw new BadRequestException(
          'Opening balance date is outside the accounting period',
        );
      const configuration = await db.accountingConfiguration.findUnique({
        where: { companyId: input.companyId },
        include: { baseCurrency: true },
      });
      if (!configuration || !configuration.baseCurrency.isActive)
        throw new BadRequestException(
          'Active accounting base currency is required for opening balances',
        );
      const precision = Number(configuration.baseCurrency.minorUnitPrecision);
      for (const line of input.lines) {
        const debit = this.money(line.debit, precision);
        const credit = this.money(line.credit, precision);
        if (
          debit.isNegative() ||
          credit.isNegative() ||
          (debit.isZero() && credit.isZero()) ||
          (!debit.isZero() && !credit.isZero())
        )
          throw new BadRequestException(
            'Each opening balance line must contain exactly one non-negative debit or credit',
          );
        const account = await db.accountingAccount.findFirst({
          where: {
            id: line.accountId,
            companyId: input.companyId,
            isActive: true,
          },
        });
        if (!account)
          throw new NotFoundException(
            'Opening balance account does not belong to this company',
          );
        await validateAccountingCounterparty(db, {
          companyId: input.companyId,
          accountType: account.accountType,
          businessPartnerId: line.businessPartnerId,
        });
      }
      const batch = await db.openingBalanceBatch.create({
        data: {
          companyId: input.companyId,
          effectiveDate: input.effectiveDate,
          accountingPeriodId: input.accountingPeriodId,
          description: input.description,
          createdById: input.actorUserId,
          idempotencyKey: input.idempotencyKey,
          requestHash: this.idempotency.buildRequestHash({
            ...input,
            effectiveDate: input.effectiveDate.toISOString(),
          }),
        },
      });
      for (const line of input.lines) {
        await db.openingBalanceLine.create({
          data: {
            companyId: input.companyId,
            batchId: batch.id,
            accountId: line.accountId,
            businessPartnerId: line.businessPartnerId,
            debit: this.money(line.debit, precision),
            credit: this.money(line.credit, precision),
            description: line.description,
          },
        });
      }
      return this.getBatch(db, input.companyId, batch.id);
    });
  }

  private async getBatch(
    db: PrismaService | Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    const batch = await db.openingBalanceBatch.findFirst({
      where: { id, companyId },
      include: BATCH_INCLUDE,
    });
    if (!batch) throw new NotFoundException('Opening balance batch not found');
    return batch;
  }

  private async lockBatch(
    db: Prisma.TransactionClient,
    companyId: string,
    id: string,
  ) {
    const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "OpeningBalanceBatch"
      WHERE "id" = ${id}::uuid AND "companyId" = ${companyId}::uuid
      FOR UPDATE
    `);
    if (!rows.length)
      throw new NotFoundException('Opening balance batch not found');
    return this.getBatch(db, companyId, id);
  }

  private async validateCounterparties(
    db: Prisma.TransactionClient,
    companyId: string,
    lines: Array<{
      account: { accountType: AccountingAccountType };
      businessPartnerId: string | null;
    }>,
  ) {
    for (const line of lines) {
      await validateAccountingCounterparty(db, {
        companyId,
        accountType: line.account.accountType,
        businessPartnerId: line.businessPartnerId,
      });
    }
  }

  private assertOpenPeriod(batch: {
    accountingPeriod: {
      status: AccountingPeriodStatus;
      fiscalYear: { status: FiscalYearStatus };
      startDate: Date;
      endDate: Date;
    };
    effectiveDate: Date;
  }) {
    if (
      batch.accountingPeriod.status !== AccountingPeriodStatus.OPEN ||
      batch.accountingPeriod.fiscalYear.status !== FiscalYearStatus.OPEN
    )
      throw new ConflictException(
        'Opening balance validation and posting require an OPEN period and fiscal year',
      );
  }

  private assertBalanced(
    lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>,
  ) {
    const debit = lines.reduce(
      (sum, line) => sum.plus(line.debit),
      new Prisma.Decimal(0),
    );
    const credit = lines.reduce(
      (sum, line) => sum.plus(line.credit),
      new Prisma.Decimal(0),
    );
    if (!debit.eq(credit))
      throw new BadRequestException('Opening balance batch is not balanced');
  }

  private money(value: string, precision: number) {
    return AccountingMoney.fromString(
      value,
      'opening balance amount',
      precision,
    ).toDecimal();
  }

  private async audit(
    db: Prisma.TransactionClient,
    companyId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await db.auditLog.create({
      data: {
        companyId,
        actorUserId,
        action,
        entityType: 'OpeningBalanceBatch',
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
