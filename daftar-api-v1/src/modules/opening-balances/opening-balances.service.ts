import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountingPeriodStatus,
  FiscalYearStatus,
  JournalSourceType,
  OpeningBalanceBatchStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';

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
      const batch = await this.getBatch(db, companyId, batchId);
      if (batch.status !== OpeningBalanceBatchStatus.DRAFT)
        throw new ConflictException(
          'Only draft opening balances can be validated',
        );
      this.assertOpenPeriod(batch);
      this.assertBalanced(batch.lines);
      this.assertRoleCorrect(batch.lines);
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
    const batch = await this.getBatch(this.prisma, companyId, batchId);
    if (batch.status !== OpeningBalanceBatchStatus.VALIDATED)
      throw new ConflictException(
        'Opening balance batch must be validated before posting',
      );
    this.assertOpenPeriod(batch);
    const general = await this.prisma.accountingConfigurationJournal.findFirst({
      where: { companyId, settingKey: 'GENERAL' },
      include: { journal: true },
    });
    if (!general)
      throw new BadRequestException(
        'General accounting journal is not configured',
      );
    const entry = await this.accounting.postInternal(companyId, actorUserId, {
      journalId: general.journalId,
      accountingPeriodId: batch.accountingPeriodId,
      postingDate: batch.effectiveDate.toISOString(),
      documentDate: batch.effectiveDate.toISOString(),
      transactionCurrencyCode: (
        await this.prisma.company.findFirstOrThrow({
          where: { id: companyId },
          select: { currencyCode: true },
        })
      ).currencyCode,
      exchangeRate: '1',
      description: batch.description,
      documentReference: `OPENING-${batch.id}`,
      sourceType: JournalSourceType.OPENING_BALANCE,
      sourceId: batch.id,
      idempotencyKey,
      lines: batch.lines.map((line) => ({
        accountId: line.accountId,
        businessPartnerId: line.businessPartnerId ?? undefined,
        transactionDebit: line.debit.toString(),
        transactionCredit: line.credit.toString(),
        description: line.description ?? undefined,
      })),
    });
    const updated = await this.prisma.$transaction(async (db) => {
      const result = await db.openingBalanceBatch.update({
        where: { id: batch.id },
        data: {
          status: OpeningBalanceBatchStatus.POSTED,
          postedById: actorUserId,
          postedAt: new Date(),
          journalEntryId: entry.id,
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
    return updated;
  }

  async reverse(
    companyId: string,
    actorUserId: string,
    batchId: string,
    dto: ReverseOpeningBalanceInput,
  ) {
    const batch = await this.getBatch(this.prisma, companyId, batchId);
    if (
      batch.status !== OpeningBalanceBatchStatus.POSTED ||
      !batch.journalEntryId
    )
      throw new ConflictException(
        'Only a posted opening balance can be reversed',
      );
    const reversal = await this.accounting.reverse(
      companyId,
      actorUserId,
      batch.journalEntryId,
      {
        accountingPeriodId: dto.accountingPeriodId,
        postingDate: dto.postingDate,
        reason: dto.reason,
        idempotencyKey: dto.idempotencyKey,
      },
    );
    return this.prisma.$transaction(async (db) => {
      const updated = await db.openingBalanceBatch.update({
        where: { id: batch.id },
        data: {
          status: OpeningBalanceBatchStatus.REVERSED,
          reversedAt: new Date(),
          reversalReason: dto.reason,
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
      for (const line of input.lines) {
        const debit = this.money(line.debit);
        const credit = this.money(line.credit);
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
        if (line.businessPartnerId) {
          const partner = await db.businessPartner.findFirst({
            where: { id: line.businessPartnerId, companyId: input.companyId },
          });
          if (!partner)
            throw new NotFoundException(
              'Opening balance business partner does not belong to this company',
            );
        }
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
            debit: this.money(line.debit),
            credit: this.money(line.credit),
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
      batch.accountingPeriod.status === AccountingPeriodStatus.CLOSED ||
      batch.accountingPeriod.fiscalYear.status === FiscalYearStatus.CLOSED
    )
      throw new ConflictException('Opening balance period is closed');
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

  private assertRoleCorrect(
    lines: Array<{
      account: { accountType: string };
      businessPartner: {
        isActive: boolean;
        customerProfile: { isActive: boolean } | null;
        supplierProfile: { isActive: boolean } | null;
      } | null;
    }>,
  ) {
    for (const line of lines) {
      if (
        line.account.accountType === 'ASSET_RECEIVABLE' &&
        line.businessPartner &&
        (!line.businessPartner.isActive ||
          !line.businessPartner.customerProfile?.isActive)
      )
        throw new BadRequestException(
          'Receivable opening lines require an active customer role',
        );
      if (
        line.account.accountType === 'LIABILITY_PAYABLE' &&
        line.businessPartner &&
        (!line.businessPartner.isActive ||
          !line.businessPartner.supplierProfile?.isActive)
      )
        throw new BadRequestException(
          'Payable opening lines require an active supplier role',
        );
    }
  }

  private money(value: string) {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException('Invalid opening balance amount');
    }
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
