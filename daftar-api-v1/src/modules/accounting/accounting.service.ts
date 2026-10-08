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
  JournalEntryStatus,
  JournalSourceType,
  PartyType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingMoney } from './accounting.money';
import {
  AccountingEntryQueryDto,
  CreateAccountingAccountDto,
  CreateAccountingJournalDto,
  CreateAccountingPeriodDto,
  CreateFiscalYearDto,
  CreateAccountingConfigurationDto,
  JournalLineDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
  UpdateAccountingAccountDto,
  UpdateAccountingJournalDto,
  UpdateAccountingPeriodStatusDto,
  UpdateFiscalYearStatusDto,
} from './dto/accounting.dto';

interface AccountingLineCommand {
  accountId: string;
  debit: string;
  credit: string;
  transactionDebit?: string;
  transactionCredit?: string;
  description?: string;
  partyType?: PartyType;
  partyId?: string;
  dueDate?: string;
  documentReference?: string;
  reconciliationReference?: string;
  taxCode?: string;
  taxTreatmentCode?: string;
  taxRate?: string;
}

interface PostJournalCommand {
  companyId: string;
  actorUserId: string;
  journalId: string;
  accountingPeriodId: string;
  postingDate: string;
  documentDate?: string;
  dueDate?: string;
  transactionCurrencyCode: string;
  exchangeRate: string;
  documentReference?: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  idempotencyKey: string;
  allowSoftClosedOverride?: boolean;
  reversalOfEntryId?: string;
  reversalReason?: string;
  lines: AccountingLineCommand[];
}

type TransactionDb = Prisma.TransactionClient;

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: PlatformIdempotencyService,
  ) {}

  async listAccounts(companyId: string) {
    const rows = await this.prisma.accountingAccount.findMany({
      where: { companyId },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { id: true, code: true, name: true } } },
    });
    return rows;
  }

  async createAccount(companyId: string, dto: CreateAccountingAccountDto) {
    const code = this.requireText(dto.code, 'Account code');
    const name = this.requireText(dto.name, 'Account name');
    if (dto.parentId) await this.assertParent(companyId, dto.parentId);

    try {
      return await this.prisma.accountingAccount.create({
        data: {
          companyId,
          code,
          name,
          accountType: dto.accountType,
          parentId: dto.parentId ?? null,
          currencyCode: dto.currencyCode ?? null,
          allowDirectPosting: dto.allowDirectPosting ?? true,
          isControlAccount: dto.isControlAccount ?? false,
          reconciliationEligible: dto.reconciliationEligible ?? false,
        },
      });
    } catch (error) {
      this.throwMappedPrismaConflict(error, 'Account code already exists');
      throw error;
    }
  }

  async updateAccount(
    companyId: string,
    id: string,
    dto: UpdateAccountingAccountDto,
  ) {
    const existing = await this.prisma.accountingAccount.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Accounting account not found');

    if (dto.parentId) await this.assertParent(companyId, dto.parentId, id);
    return this.prisma.accountingAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? { name: this.requireText(dto.name, 'Account name') }
          : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.allowDirectPosting !== undefined
          ? { allowDirectPosting: dto.allowDirectPosting }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isControlAccount !== undefined
          ? { isControlAccount: dto.isControlAccount }
          : {}),
        ...(dto.currencyCode !== undefined
          ? { currencyCode: dto.currencyCode }
          : {}),
        ...(dto.reconciliationEligible !== undefined
          ? { reconciliationEligible: dto.reconciliationEligible }
          : {}),
      },
    });
  }

  async listJournals(companyId: string) {
    return this.prisma.accountingJournal.findMany({
      where: { companyId },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async createJournal(companyId: string, dto: CreateAccountingJournalDto) {
    try {
      return await this.prisma.accountingJournal.create({
        data: {
          companyId,
          code: this.requireText(dto.code, 'Journal code'),
          name: this.requireText(dto.name, 'Journal name'),
          type: dto.type,
          currencyCode: dto.currencyCode ?? null,
        },
      });
    } catch (error) {
      this.throwMappedPrismaConflict(error, 'Journal code already exists');
      throw error;
    }
  }

  async updateJournal(
    companyId: string,
    id: string,
    dto: UpdateAccountingJournalDto,
  ) {
    const existing = await this.prisma.accountingJournal.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Accounting journal not found');
    return this.prisma.accountingJournal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? { name: this.requireText(dto.name, 'Journal name') }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.currencyCode !== undefined
          ? { currencyCode: dto.currencyCode }
          : {}),
      },
    });
  }

  async listFiscalYears(companyId: string) {
    return this.prisma.fiscalYear.findMany({
      where: { companyId },
      orderBy: { startDate: 'desc' },
      include: { periods: { orderBy: { startDate: 'asc' } } },
    });
  }

  async createFiscalYear(companyId: string, dto: CreateFiscalYearDto) {
    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');
    this.assertDateOrder(
      startDate,
      endDate,
      'Fiscal year start must be before end',
    );

    try {
      return await this.prisma.fiscalYear.create({
        data: {
          companyId,
          name: this.requireText(dto.name, 'Fiscal year name'),
          startDate,
          endDate,
        },
      });
    } catch (error) {
      this.throwMappedPrismaConflict(
        error,
        'Fiscal year overlaps or already exists',
      );
      throw error;
    }
  }

  async changeFiscalYearStatus(
    companyId: string,
    id: string,
    dto: UpdateFiscalYearStatusDto,
  ) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id, companyId },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');
    if (
      fiscalYear.status === FiscalYearStatus.CLOSED &&
      dto.status !== FiscalYearStatus.CLOSED
    ) {
      throw new ConflictException(
        'A closed fiscal year cannot be reopened through this endpoint',
      );
    }
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async listPeriods(companyId: string, fiscalYearId?: string) {
    return this.prisma.accountingPeriod.findMany({
      where: { companyId, ...(fiscalYearId ? { fiscalYearId } : {}) },
      orderBy: { startDate: 'asc' },
      include: { fiscalYear: true },
    });
  }

  async createPeriod(companyId: string, dto: CreateAccountingPeriodDto) {
    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');
    this.assertDateOrder(
      startDate,
      endDate,
      'Accounting period start must be before end',
    );

    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: dto.fiscalYearId, companyId },
    });
    if (!fiscalYear) throw new NotFoundException('Fiscal year not found');
    if (fiscalYear.status === FiscalYearStatus.CLOSED) {
      throw new ConflictException(
        'Cannot add a period to a closed fiscal year',
      );
    }
    if (startDate < fiscalYear.startDate || endDate > fiscalYear.endDate) {
      throw new BadRequestException(
        'Accounting period must be inside its fiscal year',
      );
    }

    try {
      return await this.prisma.accountingPeriod.create({
        data: {
          companyId,
          fiscalYearId: dto.fiscalYearId,
          name: this.requireText(dto.name, 'Accounting period name'),
          startDate,
          endDate,
        },
      });
    } catch (error) {
      this.throwMappedPrismaConflict(
        error,
        'Accounting period overlaps or already exists',
      );
      throw error;
    }
  }

  async changePeriodStatus(
    companyId: string,
    id: string,
    dto: UpdateAccountingPeriodStatusDto,
  ) {
    const period = await this.prisma.accountingPeriod.findFirst({
      where: { id, companyId },
      include: { fiscalYear: true },
    });
    if (!period) throw new NotFoundException('Accounting period not found');
    if (
      period.status === AccountingPeriodStatus.CLOSED &&
      dto.status !== AccountingPeriodStatus.CLOSED
    ) {
      throw new ConflictException(
        'A closed accounting period cannot be reopened through this endpoint',
      );
    }
    if (
      period.fiscalYear.status === FiscalYearStatus.CLOSED &&
      dto.status !== AccountingPeriodStatus.CLOSED
    ) {
      throw new ConflictException(
        'A period in a closed fiscal year cannot be reopened',
      );
    }
    return this.prisma.accountingPeriod.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async getConfiguration(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
      select: { currencyCode: true },
    });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.accountingConfiguration.upsert({
      where: { companyId },
      create: {
        companyId,
        baseCurrencyCode: company.currencyCode.toUpperCase().slice(0, 3),
        countryCode: 'EG',
        localeCode: 'ar-EG',
      },
      update: {},
      include: { accountDefaults: true, journalDefaults: true },
    });
  }

  async updateConfiguration(
    companyId: string,
    dto: CreateAccountingConfigurationDto,
  ) {
    return this.prisma.accountingConfiguration.upsert({
      where: { companyId },
      create: {
        companyId,
        baseCurrencyCode: dto.baseCurrencyCode,
        reportingCurrencyCode: dto.reportingCurrencyCode ?? null,
        countryCode: dto.countryCode,
        localeCode: dto.localeCode,
      },
      update: {
        baseCurrencyCode: dto.baseCurrencyCode,
        reportingCurrencyCode: dto.reportingCurrencyCode ?? null,
        countryCode: dto.countryCode,
        localeCode: dto.localeCode,
      },
      include: { accountDefaults: true, journalDefaults: true },
    });
  }

  async post(companyId: string, actorUserId: string, dto: PostJournalEntryDto) {
    const command: PostJournalCommand = {
      companyId,
      actorUserId,
      journalId: dto.journalId,
      accountingPeriodId: dto.accountingPeriodId,
      postingDate: dto.postingDate,
      documentDate: dto.documentDate,
      dueDate: dto.dueDate,
      transactionCurrencyCode: dto.transactionCurrencyCode,
      exchangeRate: dto.exchangeRate,
      documentReference: dto.documentReference,
      description: dto.description,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      idempotencyKey: dto.idempotencyKey,
      allowSoftClosedOverride: dto.allowSoftClosedOverride,
      lines: dto.lines,
    };

    try {
      return await this.prisma.$transaction((tx) =>
        this.postInTransaction(tx, command),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existing = await this.findByIdempotencyKey(
          companyId,
          command.sourceType,
          command.idempotencyKey,
        );
        if (existing) {
          const expectedHash = this.hashCommand(command);
          if (existing.requestHash !== expectedHash) {
            throw new ConflictException(
              'Idempotency key is already used with another posting',
            );
          }
          return this.serializeEntry(existing);
        }
      }
      throw error;
    }
  }

  async listEntries(companyId: string, query: AccountingEntryQueryDto) {
    const where: Prisma.JournalEntryWhereInput = {
      companyId,
      ...(query.journalId ? { journalId: query.journalId } : {}),
      ...(query.accountingPeriodId
        ? { accountingPeriodId: query.accountingPeriodId }
        : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.accountId
        ? { lines: { some: { accountId: query.accountId } } }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            postingDate: {
              ...(query.dateFrom
                ? { gte: this.parseDate(query.dateFrom, 'dateFrom') }
                : {}),
              ...(query.dateTo
                ? { lte: this.parseDate(query.dateTo, 'dateTo') }
                : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.journalEntry.findMany({
      where,
      orderBy: [{ postingDate: 'desc' }, { entryNumber: 'desc' }],
      include: {
        journal: true,
        accountingPeriod: true,
        lines: { include: { account: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    return rows.map((row) => this.serializeEntry(row));
  }

  async getEntry(companyId: string, id: string) {
    const row = await this.findEntry(companyId, id);
    if (!row) throw new NotFoundException('Journal entry not found');
    return this.serializeEntry(row);
  }

  async reverse(
    companyId: string,
    actorUserId: string,
    id: string,
    dto: ReverseJournalEntryDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.journalEntry.findFirst({
        where: { id, companyId },
        include: { lines: { include: { account: true } }, journal: true },
      });
      if (!original) throw new NotFoundException('Journal entry not found');

      const reversalCommand: PostJournalCommand = {
        companyId,
        actorUserId,
        journalId: original.journalId,
        accountingPeriodId: dto.accountingPeriodId,
        postingDate: dto.postingDate,
        documentDate: dto.postingDate,
        dueDate: original.dueDate?.toISOString(),
        transactionCurrencyCode: original.transactionCurrencyCode,
        exchangeRate: original.exchangeRate.toFixed(8),
        documentReference: original.documentReference ?? undefined,
        description: `Reversal of ${original.entryNumber}: ${this.requireText(dto.reason, 'Reversal reason')}`,
        sourceType: JournalSourceType.REVERSAL,
        sourceId: original.id,
        idempotencyKey: dto.idempotencyKey,
        reversalOfEntryId: original.id,
        reversalReason: dto.reason,
        lines: original.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.credit.toFixed(4),
          credit: line.debit.toFixed(4),
          transactionDebit: line.transactionCredit.toFixed(4),
          transactionCredit: line.transactionDebit.toFixed(4),
          description: line.description ?? undefined,
          partyType: line.partyType ?? undefined,
          partyId: line.partyId ?? undefined,
          dueDate: line.dueDate?.toISOString(),
          documentReference: line.documentReference ?? undefined,
          reconciliationReference: line.reconciliationReference ?? undefined,
          taxCode: line.taxCode ?? undefined,
          taxTreatmentCode: line.taxTreatmentCode ?? undefined,
          taxRate: line.taxRate?.toFixed(4),
        })),
      };

      const existingReversal = await tx.journalEntry.findFirst({
        where: {
          companyId,
          sourceType: JournalSourceType.REVERSAL,
          idempotencyKey: dto.idempotencyKey,
        },
        include: {
          lines: { include: { account: true } },
          journal: true,
          accountingPeriod: true,
        },
      });
      if (existingReversal) {
        if (
          existingReversal.requestHash !== this.hashCommand(reversalCommand)
        ) {
          throw new ConflictException(
            'Idempotency key is already used with another reversal',
          );
        }
        return this.serializeEntry(existingReversal);
      }

      if (original.status !== JournalEntryStatus.POSTED) {
        throw new ConflictException(
          'Only a posted journal entry can be reversed',
        );
      }
      const previousReversal = await tx.journalEntry.findFirst({
        where: { companyId, reversalOfEntryId: original.id },
        select: { id: true },
      });
      if (previousReversal)
        throw new ConflictException('Journal entry is already reversed');

      const reversal = await this.postInTransaction(tx, reversalCommand);
      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: JournalEntryStatus.REVERSED },
      });
      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId,
          action: 'accounting.journal.reversed',
          entityType: 'journal_entry',
          entityId: original.id,
          metadata: { reversalEntryId: reversal.id, reason: dto.reason },
        },
      });
      return reversal;
    });
  }

  private async postInTransaction(
    tx: TransactionDb,
    command: PostJournalCommand,
  ) {
    const requestHash = this.hashCommand(command);
    if (!command.idempotencyKey.trim()) {
      throw new BadRequestException(
        'Idempotency key is required for accounting posting',
      );
    }
    if (command.lines.length < 2) {
      throw new BadRequestException(
        'A journal must contain at least two lines',
      );
    }

    const existing = await tx.journalEntry.findFirst({
      where: {
        companyId: command.companyId,
        sourceType: command.sourceType,
        idempotencyKey: command.idempotencyKey,
      },
      include: {
        lines: { include: { account: true } },
        journal: true,
        accountingPeriod: true,
      },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key is already used with another posting',
        );
      }
      return this.serializeEntry(existing);
    }

    const postingDate = this.parseDate(command.postingDate, 'postingDate');
    const documentDate = command.documentDate
      ? this.parseDate(command.documentDate, 'documentDate')
      : null;
    const dueDate = command.dueDate
      ? this.parseDate(command.dueDate, 'dueDate')
      : null;
    const currencyCode = command.transactionCurrencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode))
      throw new BadRequestException('Invalid transaction currency');
    const exchangeRate = AccountingMoney.fromString(
      command.exchangeRate,
      'exchangeRate',
      8,
    );
    if (!exchangeRate.isPositive())
      throw new BadRequestException('Exchange rate must be positive');

    const period = await tx.accountingPeriod.findFirst({
      where: { id: command.accountingPeriodId, companyId: command.companyId },
      include: { fiscalYear: true },
    });
    if (!period)
      throw new NotFoundException(
        'Accounting period not found for this company',
      );
    if (postingDate < period.startDate || postingDate > period.endDate) {
      throw new BadRequestException(
        'Posting date is outside the selected accounting period',
      );
    }
    if (period.fiscalYear.status === FiscalYearStatus.CLOSED) {
      throw new ConflictException('The fiscal year is closed');
    }
    if (
      period.status !== AccountingPeriodStatus.OPEN &&
      !(
        period.status === AccountingPeriodStatus.SOFT_CLOSED &&
        command.allowSoftClosedOverride
      )
    ) {
      throw new ConflictException(
        'The accounting period does not accept this posting',
      );
    }

    const journal = await tx.accountingJournal.findFirst({
      where: { id: command.journalId, companyId: command.companyId },
    });
    if (!journal)
      throw new NotFoundException(
        'Accounting journal not found for this company',
      );
    if (!journal.isActive)
      throw new ConflictException('Inactive journal cannot receive postings');
    if (journal.currencyCode && journal.currencyCode !== currencyCode) {
      throw new BadRequestException(
        'Transaction currency does not match the journal currency',
      );
    }

    const accountIds = [
      ...new Set(command.lines.map((line) => line.accountId)),
    ];
    const accounts = await tx.accountingAccount.findMany({
      where: { companyId: command.companyId, id: { in: accountIds } },
    });
    const accountById = new Map(
      accounts.map((account) => [account.id, account]),
    );
    if (accounts.length !== accountIds.length) {
      throw new NotFoundException(
        'One or more accounts do not belong to this company',
      );
    }

    let debitTotal = AccountingMoney.zero();
    let creditTotal = AccountingMoney.zero();
    let transactionDebitTotal = AccountingMoney.zero();
    let transactionCreditTotal = AccountingMoney.zero();
    const lineData: Array<
      Omit<Prisma.JournalLineCreateManyInput, 'journalEntryId'>
    > = [];
    for (const line of command.lines) {
      const account = accountById.get(line.accountId)!;
      if (!account.isActive)
        throw new ConflictException(`Account ${account.code} is inactive`);
      if (!account.allowDirectPosting)
        throw new ConflictException(
          `Account ${account.code} does not allow direct posting`,
        );
      if (account.currencyCode && account.currencyCode !== currencyCode) {
        throw new BadRequestException(
          `Account ${account.code} only accepts ${account.currencyCode}`,
        );
      }
      if (
        (line.partyType && !line.partyId) ||
        (!line.partyType && line.partyId)
      ) {
        throw new BadRequestException(
          'partyType and partyId must be provided together',
        );
      }
      const debit = AccountingMoney.fromString(line.debit, 'debit');
      const credit = AccountingMoney.fromString(line.credit, 'credit');
      if (debit.isNegative() || credit.isNegative()) {
        throw new BadRequestException(
          'Debit and credit amounts cannot be negative',
        );
      }
      if (!debit.isZero() && !credit.isZero()) {
        throw new BadRequestException(
          'A journal line cannot contain both debit and credit',
        );
      }
      if (debit.isZero() && credit.isZero()) {
        throw new BadRequestException(
          'A journal line must contain a debit or credit amount',
        );
      }
      if (line.partyType && line.partyId) {
        const partyExists = await awaitablePartyCheck(
          line.partyType,
          line.partyId,
        );
        if (!partyExists) {
          throw new BadRequestException(
            'Journal line party does not belong to this company',
          );
        }
      }
      const transactionDebit = line.transactionDebit
        ? AccountingMoney.fromString(line.transactionDebit, 'transactionDebit')
        : debit;
      const transactionCredit = line.transactionCredit
        ? AccountingMoney.fromString(
            line.transactionCredit,
            'transactionCredit',
          )
        : credit;
      if (transactionDebit.isNegative() || transactionCredit.isNegative()) {
        throw new BadRequestException(
          'Transaction debit and credit amounts cannot be negative',
        );
      }
      if (!transactionDebit.isZero() && !transactionCredit.isZero()) {
        throw new BadRequestException(
          'A transaction line cannot contain both debit and credit',
        );
      }
      if (transactionDebit.isZero() && transactionCredit.isZero()) {
        throw new BadRequestException(
          'A transaction line must contain a debit or credit amount',
        );
      }
      debitTotal = debitTotal.add(debit);
      creditTotal = creditTotal.add(credit);
      transactionDebitTotal = transactionDebitTotal.add(transactionDebit);
      transactionCreditTotal = transactionCreditTotal.add(transactionCredit);
      lineData.push({
        companyId: command.companyId,
        accountId: line.accountId,
        debit: debit.toDecimal(),
        credit: credit.toDecimal(),
        transactionDebit: transactionDebit.toDecimal(),
        transactionCredit: transactionCredit.toDecimal(),
        description: line.description ?? null,
        partyType: line.partyType ?? null,
        partyId: line.partyId ?? null,
        dueDate: line.dueDate
          ? this.parseDate(line.dueDate, 'line.dueDate')
          : dueDate,
        documentReference:
          line.documentReference ?? command.documentReference ?? null,
        reconciliationReference: line.reconciliationReference ?? null,
        taxCode: line.taxCode ?? null,
        taxTreatmentCode: line.taxTreatmentCode ?? null,
        taxRate: line.taxRate ? this.parseTaxRate(line.taxRate) : null,
      });
    }

    if (!debitTotal.eq(creditTotal)) {
      throw new BadRequestException(
        'Journal is not balanced: total debit must equal total credit',
      );
    }
    if (!transactionDebitTotal.eq(transactionCreditTotal)) {
      throw new BadRequestException(
        'Transaction currency journal is not balanced: total debit must equal total credit',
      );
    }

    if (
      command.sourceType === JournalSourceType.REVERSAL &&
      !command.reversalOfEntryId
    ) {
      throw new BadRequestException(
        'A reversal must reference the original entry',
      );
    }

    const sequenceRows = await tx.$queryRaw<{ allocated: number }[]>(Prisma.sql`
      INSERT INTO "AccountingEntrySequence" ("companyId", "fiscalYearId", "nextValue", "updatedAt")
      VALUES (${command.companyId}, ${period.fiscalYearId}, 2, CURRENT_TIMESTAMP)
      ON CONFLICT ("companyId", "fiscalYearId")
      DO UPDATE SET "nextValue" = "AccountingEntrySequence"."nextValue" + 1,
                    "updatedAt" = CURRENT_TIMESTAMP
      RETURNING ("nextValue" - 1) AS "allocated"
    `);
    const allocated = sequenceRows[0]?.allocated;
    if (!allocated)
      throw new ConflictException('Unable to allocate a journal sequence');
    const entryNumber = `JE-${period.fiscalYear.startDate.getUTCFullYear()}-${String(allocated).padStart(6, '0')}`;

    const entry = await tx.journalEntry.create({
      data: {
        companyId: command.companyId,
        journalId: command.journalId,
        accountingPeriodId: command.accountingPeriodId,
        entryNumber,
        status: JournalEntryStatus.DRAFT,
        postingDate,
        documentDate,
        dueDate,
        transactionCurrencyCode: currencyCode,
        exchangeRate: exchangeRate.toDecimal(),
        documentReference: command.documentReference ?? null,
        description: this.requireText(
          command.description,
          'Journal description',
        ),
        sourceType: command.sourceType,
        sourceId: command.sourceId ?? null,
        idempotencyKey: command.idempotencyKey.trim(),
        requestHash,
        postedById: command.actorUserId,
        reversalOfEntryId: command.reversalOfEntryId ?? null,
        reversalReason: command.reversalReason ?? null,
      },
    });

    await tx.journalLine.createMany({
      data: lineData.map((line) => ({ ...line, journalEntryId: entry.id })),
    });
    const posted = await tx.journalEntry.update({
      where: { id: entry.id },
      data: { status: JournalEntryStatus.POSTED, postedAt: new Date() },
      include: {
        lines: { include: { account: true } },
        journal: true,
        accountingPeriod: true,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: command.companyId,
        actorUserId: command.actorUserId,
        action: 'accounting.journal.posted',
        entityType: 'journal_entry',
        entityId: posted.id,
        metadata: {
          entryNumber,
          sourceType: command.sourceType,
          sourceId: command.sourceId ?? null,
          debitTotal: debitTotal.toString(),
          creditTotal: creditTotal.toString(),
          transactionCurrencyCode: currencyCode,
        },
      },
    });
    return this.serializeEntry(posted);

    async function awaitablePartyCheck(
      type: PartyType,
      id: string,
    ): Promise<boolean> {
      switch (type) {
        case PartyType.CUSTOMER:
          return (
            (await tx.customer.count({
              where: { id, companyId: command.companyId, isDeleted: false },
            })) > 0
          );
        case PartyType.SUPPLIER:
          return (
            (await tx.supplier.count({
              where: { id, companyId: command.companyId, isDeleted: false },
            })) > 0
          );
        case PartyType.EMPLOYEE:
          return (
            (await tx.employee.count({
              where: { id, companyId: command.companyId, isDeleted: false },
            })) > 0
          );
        default:
          return false;
      }
    }
  }

  private async findByIdempotencyKey(
    companyId: string,
    sourceType: JournalSourceType,
    idempotencyKey: string,
  ) {
    return this.prisma.journalEntry.findFirst({
      where: { companyId, sourceType, idempotencyKey },
      include: {
        lines: { include: { account: true } },
        journal: true,
        accountingPeriod: true,
      },
    });
  }

  private async findEntry(companyId: string, id: string) {
    return this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        lines: { include: { account: true }, orderBy: { createdAt: 'asc' } },
        journal: true,
        accountingPeriod: { include: { fiscalYear: true } },
      },
    });
  }

  private serializeEntry(row: any) {
    return {
      ...row,
      exchangeRate: row.exchangeRate?.toFixed(8),
      lines: row.lines?.map((line: any) => ({
        ...line,
        debit: line.debit.toFixed(4),
        credit: line.credit.toFixed(4),
        transactionDebit: line.transactionDebit.toFixed(4),
        transactionCredit: line.transactionCredit.toFixed(4),
        taxRate: line.taxRate?.toFixed(4) ?? null,
      })),
    };
  }

  private hashCommand(command: PostJournalCommand): string {
    return this.idempotency.buildRequestHash({
      journalId: command.journalId,
      accountingPeriodId: command.accountingPeriodId,
      postingDate: command.postingDate,
      documentDate: command.documentDate ?? null,
      dueDate: command.dueDate ?? null,
      transactionCurrencyCode: command.transactionCurrencyCode,
      exchangeRate: command.exchangeRate,
      documentReference: command.documentReference ?? null,
      description: command.description,
      sourceType: command.sourceType,
      sourceId: command.sourceId ?? null,
      reversalOfEntryId: command.reversalOfEntryId ?? null,
      reversalReason: command.reversalReason ?? null,
      lines: command.lines,
    });
  }

  private async assertParent(
    companyId: string,
    parentId: string,
    childId?: string,
  ) {
    let cursor: string | null = parentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === childId || visited.has(cursor)) {
        throw new BadRequestException('Account hierarchy cycle detected');
      }
      visited.add(cursor);
      const parent = await this.prisma.accountingAccount.findFirst({
        where: { id: cursor, companyId },
        select: { parentId: true },
      });
      if (!parent)
        throw new BadRequestException(
          'Parent account does not belong to this company',
        );
      cursor = parent.parentId;
    }
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException(`Invalid ${field}`);
    return date;
  }

  private assertDateOrder(startDate: Date, endDate: Date, message: string) {
    if (startDate > endDate) throw new BadRequestException(message);
  }

  private requireText(value: string, field: string): string {
    const normalized = value?.trim();
    if (!normalized) throw new BadRequestException(`${field} is required`);
    return normalized;
  }

  private parseTaxRate(value: string): Prisma.Decimal {
    const rate = AccountingMoney.fromString(value, 'taxRate');
    if (rate.isNegative())
      throw new BadRequestException('Tax rate cannot be negative');
    return rate.toDecimal();
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private throwMappedPrismaConflict(error: unknown, message: string): void {
    if (this.isUniqueViolation(error)) throw new ConflictException(message);
  }
}
