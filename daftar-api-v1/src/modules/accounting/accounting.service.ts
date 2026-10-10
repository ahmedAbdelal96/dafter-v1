import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountingPeriodStatus,
  FiscalYearStatus,
  JournalEntryStatus,
  JournalSourceType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingMoney } from './accounting.money';
import { convertAndAllocateBaseCurrency } from './accounting-conversion';
import {
  assertAccountMappingCompatibility,
  assertJournalMappingCompatibility,
  validateAccountingCounterparty,
} from './accounting-policies';
import {
  AccountingEntryQueryDto,
  CreateAccountingAccountDto,
  CreateAccountingJournalDto,
  CreateAccountingPeriodDto,
  CreateFiscalYearDto,
  CreateAccountingConfigurationDto,
  ManualJournalEntryDto,
  ReverseJournalEntryDto,
  SetAccountingAccountDefaultDto,
  SetAccountingJournalDefaultDto,
  UpdateAccountingAccountDto,
  UpdateAccountingJournalDto,
  UpdateAccountingPeriodStatusDto,
  UpdateFiscalYearStatusDto,
} from './dto/accounting.dto';

interface AccountingLineCommand {
  accountId: string;
  transactionDebit: string;
  transactionCredit: string;
  description?: string;
  businessPartnerId?: string;
  dueDate?: string;
  documentReference?: string;
  reconciliationReference?: string;
  taxCode?: string;
  taxTreatmentCode?: string;
  taxRate?: string;
}

export interface AccountingPostingCommand {
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
  periodOverrideReason?: string;
  reversalOfEntryId?: string;
  reversalReason?: string;
  lines: AccountingLineCommand[];
}

type PostJournalCommand = AccountingPostingCommand;

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

  async createAccount(
    companyId: string,
    actorUserId: string,
    dto: CreateAccountingAccountDto,
  ) {
    const code = this.requireText(dto.code, 'Account code');
    const name = this.requireText(dto.name, 'Account name');
    if (dto.parentId) await this.assertParent(companyId, dto.parentId);
    if (dto.currencyCode) {
      await this.assertActiveCurrency(this.prisma, dto.currencyCode);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const account = await tx.accountingAccount.create({
          data: {
            companyId,
            code,
            name,
            accountType: dto.accountType,
            parentId: dto.parentId ?? null,
            currencyCode: dto.currencyCode?.toUpperCase() ?? null,
            allowDirectPosting: dto.allowDirectPosting ?? true,
            isControlAccount: dto.isControlAccount ?? false,
            reconciliationEligible: dto.reconciliationEligible ?? false,
          },
        });
        await this.auditMasterMutation(tx, companyId, actorUserId, {
          action: 'accounting.account.created',
          entityId: account.id,
          metadata: { after: account, reason: dto.reason ?? null },
        });
        return account;
      });
    } catch (error) {
      this.throwMappedPrismaConflict(error, 'Account code already exists');
      throw error;
    }
  }

  async updateAccount(
    companyId: string,
    actorUserId: string,
    id: string,
    dto: UpdateAccountingAccountDto,
  ) {
    const existing = await this.prisma.accountingAccount.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Accounting account not found');

    if (dto.parentId) await this.assertParent(companyId, dto.parentId, id);
    const normalizedCurrency = dto.currencyCode?.toUpperCase();
    if (normalizedCurrency) {
      await this.assertActiveCurrency(this.prisma, normalizedCurrency);
    }
    const currencyChanged =
      dto.currencyCode !== undefined &&
      normalizedCurrency !== existing.currencyCode;
    const sensitiveChange =
      currencyChanged ||
      dto.parentId !== undefined ||
      dto.isActive !== undefined;
    if (sensitiveChange && !dto.reason?.trim()) {
      throw new BadRequestException(
        'A reason is required for this account change',
      );
    }
    if (currencyChanged) {
      const postedUse = await this.prisma.journalEntry.count({
        where: {
          companyId,
          status: {
            in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
          },
          lines: { some: { accountId: id } },
        },
      });
      if (postedUse > 0) {
        throw new ConflictException(
          'An account currency cannot change after posted history exists',
        );
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.accountingAccount.update({
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
            ? { currencyCode: normalizedCurrency ?? null }
            : {}),
          ...(dto.reconciliationEligible !== undefined
            ? { reconciliationEligible: dto.reconciliationEligible }
            : {}),
        },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action:
          currencyChanged || dto.parentId !== undefined
            ? 'accounting.account.structure_changed'
            : dto.isActive !== undefined
              ? 'accounting.account.activation_changed'
              : 'accounting.account.updated',
        entityId: id,
        metadata: {
          before: existing,
          after: account,
          reason: dto.reason ?? null,
        },
      });
      return account;
    });
  }

  listJournals(companyId: string) {
    return this.prisma.accountingJournal.findMany({
      where: { companyId },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async createJournal(
    companyId: string,
    actorUserId: string,
    dto: CreateAccountingJournalDto,
  ) {
    if (dto.currencyCode) {
      await this.assertActiveCurrency(this.prisma, dto.currencyCode);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const journal = await tx.accountingJournal.create({
          data: {
            companyId,
            code: this.requireText(dto.code, 'Journal code'),
            name: this.requireText(dto.name, 'Journal name'),
            type: dto.type,
            currencyCode: dto.currencyCode?.toUpperCase() ?? null,
          },
        });
        await this.auditMasterMutation(tx, companyId, actorUserId, {
          action: 'accounting.journal.created',
          entityId: journal.id,
          metadata: { after: journal, reason: dto.reason ?? null },
        });
        return journal;
      });
    } catch (error) {
      this.throwMappedPrismaConflict(error, 'Journal code already exists');
      throw error;
    }
  }

  async updateJournal(
    companyId: string,
    actorUserId: string,
    id: string,
    dto: UpdateAccountingJournalDto,
  ) {
    const existing = await this.prisma.accountingJournal.findFirst({
      where: { id, companyId },
    });
    if (!existing) throw new NotFoundException('Accounting journal not found');
    const normalizedCurrency = dto.currencyCode?.toUpperCase();
    if (normalizedCurrency) {
      await this.assertActiveCurrency(this.prisma, normalizedCurrency);
    }
    const currencyChanged =
      dto.currencyCode !== undefined &&
      normalizedCurrency !== existing.currencyCode;
    if (
      (currencyChanged || dto.isActive !== undefined) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException(
        'A reason is required for this journal change',
      );
    }
    if (currencyChanged) {
      const postedUse = await this.prisma.journalEntry.count({
        where: {
          companyId,
          journalId: id,
          status: {
            in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
          },
        },
      });
      if (postedUse > 0) {
        throw new ConflictException(
          'A journal currency cannot change after posted history exists',
        );
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const journal = await tx.accountingJournal.update({
        where: { id },
        data: {
          ...(dto.name !== undefined
            ? { name: this.requireText(dto.name, 'Journal name') }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.currencyCode !== undefined
            ? { currencyCode: normalizedCurrency ?? null }
            : {}),
        },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: currencyChanged
          ? 'accounting.journal.currency_changed'
          : dto.isActive !== undefined
            ? 'accounting.journal.activation_changed'
            : 'accounting.journal.updated',
        entityId: id,
        metadata: {
          before: existing,
          after: journal,
          reason: dto.reason ?? null,
        },
      });
      return journal;
    });
  }

  listFiscalYears(companyId: string) {
    return this.prisma.fiscalYear.findMany({
      where: { companyId },
      orderBy: { startDate: 'desc' },
      include: { periods: { orderBy: { startDate: 'asc' } } },
    });
  }

  async createFiscalYear(
    companyId: string,
    actorUserId: string,
    dto: CreateFiscalYearDto,
  ) {
    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');
    this.assertDateOrder(
      startDate,
      endDate,
      'Fiscal year start must be before end',
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const fiscalYear = await tx.fiscalYear.create({
          data: {
            companyId,
            name: this.requireText(dto.name, 'Fiscal year name'),
            startDate,
            endDate,
          },
        });
        await this.auditMasterMutation(tx, companyId, actorUserId, {
          action: 'accounting.fiscal_year.created',
          entityId: fiscalYear.id,
          metadata: { after: fiscalYear },
        });
        return fiscalYear;
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
    actorUserId: string,
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fiscalYear.update({
        where: { id },
        data: { status: dto.status },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: 'accounting.fiscal_year.status_changed',
        entityId: id,
        metadata: { before: fiscalYear, after: updated },
      });
      return updated;
    });
  }

  listPeriods(companyId: string, fiscalYearId?: string) {
    return this.prisma.accountingPeriod.findMany({
      where: { companyId, ...(fiscalYearId ? { fiscalYearId } : {}) },
      orderBy: { startDate: 'asc' },
      include: { fiscalYear: true },
    });
  }

  async createPeriod(
    companyId: string,
    actorUserId: string,
    dto: CreateAccountingPeriodDto,
  ) {
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
      return await this.prisma.$transaction(async (tx) => {
        const period = await tx.accountingPeriod.create({
          data: {
            companyId,
            fiscalYearId: dto.fiscalYearId,
            name: this.requireText(dto.name, 'Accounting period name'),
            startDate,
            endDate,
          },
        });
        await this.auditMasterMutation(tx, companyId, actorUserId, {
          action: 'accounting.period.created',
          entityId: period.id,
          metadata: { after: period },
        });
        return period;
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
    actorUserId: string,
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.accountingPeriod.update({
        where: { id },
        data: { status: dto.status },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: 'accounting.period.status_changed',
        entityId: id,
        metadata: { before: period, after: updated },
      });
      return updated;
    });
  }

  async getConfiguration(companyId: string, actorUserId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
      select: { currencyCode: true },
    });
    if (!company) throw new NotFoundException('Company not found');

    const existing = await this.prisma.accountingConfiguration.findUnique({
      where: { companyId },
    });
    if (existing) {
      return this.prisma.accountingConfiguration.findUniqueOrThrow({
        where: { companyId },
        include: { accountDefaults: true, journalDefaults: true },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const configuration = await tx.accountingConfiguration.create({
        data: {
          companyId,
          baseCurrencyCode: company.currencyCode.toUpperCase().slice(0, 3),
          countryCode: 'EG',
          localeCode: 'ar-EG',
        },
        include: { accountDefaults: true, journalDefaults: true },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: 'accounting.configuration.created',
        entityId: configuration.id,
        metadata: {
          after: configuration,
          reason: 'Initialized from company currency',
        },
      });
      return configuration;
    });
  }

  async updateConfiguration(
    companyId: string,
    actorUserId: string,
    dto: CreateAccountingConfigurationDto,
  ) {
    const baseCurrencyCode = dto.baseCurrencyCode.toUpperCase();
    const reportingCurrencyCode =
      dto.reportingCurrencyCode?.toUpperCase() ?? null;
    await this.assertActiveCurrency(this.prisma, baseCurrencyCode);
    if (reportingCurrencyCode) {
      await this.assertActiveCurrency(this.prisma, reportingCurrencyCode);
    }
    if (reportingCurrencyCode === baseCurrencyCode) {
      throw new BadRequestException(
        'Reporting currency must differ from base currency',
      );
    }

    const existing = await this.prisma.accountingConfiguration.findUnique({
      where: { companyId },
    });
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, isDeleted: false },
      select: { id: true, currencyCode: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    if (existing && existing.baseCurrencyCode !== baseCurrencyCode) {
      const postedCount = await this.prisma.journalEntry.count({
        where: {
          companyId,
          status: {
            in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
          },
        },
      });
      if (postedCount > 0) {
        throw new ConflictException(
          'Base currency cannot change after posted accounting history exists',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const configuration = await tx.accountingConfiguration.upsert({
        where: { companyId },
        create: {
          companyId,
          baseCurrencyCode,
          reportingCurrencyCode,
          countryCode: dto.countryCode.toUpperCase(),
          localeCode: dto.localeCode,
        },
        update: {
          baseCurrencyCode,
          reportingCurrencyCode,
          countryCode: dto.countryCode.toUpperCase(),
          localeCode: dto.localeCode,
        },
        include: { accountDefaults: true, journalDefaults: true },
      });
      if (company.currencyCode !== baseCurrencyCode) {
        await tx.company.update({
          where: { id: companyId },
          data: { currencyCode: baseCurrencyCode },
        });
      }
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: 'accounting.configuration.changed',
        entityId: configuration.id,
        metadata: {
          before: existing,
          after: configuration,
          currencySensitive: existing?.baseCurrencyCode !== baseCurrencyCode,
          companyCurrencyAligned: company.currencyCode !== baseCurrencyCode,
        },
      });
      return configuration;
    });
  }

  async setDefaultAccount(
    companyId: string,
    actorUserId: string,
    dto: SetAccountingAccountDefaultDto,
  ) {
    const configuration = await this.ensureConfiguration(
      companyId,
      actorUserId,
    );
    const account = await this.prisma.accountingAccount.findFirst({
      where: { id: dto.accountId, companyId },
    });
    if (!account)
      throw new NotFoundException(
        'Accounting account not found for this company',
      );
    assertAccountMappingCompatibility(dto.settingKey, account.accountType);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.accountingConfigurationAccount.findUnique({
        where: {
          companyId_configurationId_settingKey: {
            companyId,
            configurationId: configuration.id,
            settingKey: dto.settingKey,
          },
        },
      });
      const mapping = await tx.accountingConfigurationAccount.upsert({
        where: {
          companyId_configurationId_settingKey: {
            companyId,
            configurationId: configuration.id,
            settingKey: dto.settingKey,
          },
        },
        create: {
          companyId,
          configurationId: configuration.id,
          settingKey: dto.settingKey,
          accountId: dto.accountId,
        },
        update: { accountId: dto.accountId },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: 'accounting.configuration.default_account_changed',
        entityId: mapping.id,
        metadata: { before: existing, after: mapping, reason: dto.reason },
      });
      return mapping;
    });
  }

  async setDefaultJournal(
    companyId: string,
    actorUserId: string,
    dto: SetAccountingJournalDefaultDto,
  ) {
    const configuration = await this.ensureConfiguration(
      companyId,
      actorUserId,
    );
    const journal = await this.prisma.accountingJournal.findFirst({
      where: { id: dto.journalId, companyId },
    });
    if (!journal)
      throw new NotFoundException(
        'Accounting journal not found for this company',
      );
    assertJournalMappingCompatibility(dto.settingKey, journal.type);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.accountingConfigurationJournal.findUnique({
        where: {
          companyId_configurationId_settingKey: {
            companyId,
            configurationId: configuration.id,
            settingKey: dto.settingKey,
          },
        },
      });
      const mapping = await tx.accountingConfigurationJournal.upsert({
        where: {
          companyId_configurationId_settingKey: {
            companyId,
            configurationId: configuration.id,
            settingKey: dto.settingKey,
          },
        },
        create: {
          companyId,
          configurationId: configuration.id,
          settingKey: dto.settingKey,
          journalId: dto.journalId,
        },
        update: { journalId: dto.journalId },
      });
      await this.auditMasterMutation(tx, companyId, actorUserId, {
        action: 'accounting.configuration.default_journal_changed',
        entityId: mapping.id,
        metadata: { before: existing, after: mapping, reason: dto.reason },
      });
      return mapping;
    });
  }

  async postManualJournal(
    companyId: string,
    actorUserId: string,
    dto: ManualJournalEntryDto,
  ) {
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
      periodOverrideReason: dto.periodOverrideReason,
      sourceType: JournalSourceType.MANUAL_JOURNAL,
      idempotencyKey: dto.idempotencyKey,
      lines: dto.lines,
    };

    return this.executePosting(command);
  }

  /**
   * Trusted backend boundary for future business modules. Controllers must
   * never expose sourceType/sourceId selection to clients.
   */
  async postInternal(
    companyId: string,
    actorUserId: string,
    command: Omit<PostJournalCommand, 'companyId' | 'actorUserId'>,
  ) {
    return this.executePosting({ companyId, actorUserId, ...command });
  }

  /**
   * Trusted transaction-composition boundary for source modules. The caller
   * owns the transaction and must not expose this method through a controller.
   */
  postInternalInTransaction(
    tx: TransactionDb,
    companyId: string,
    actorUserId: string,
    command: Omit<PostJournalCommand, 'companyId' | 'actorUserId'>,
  ) {
    return this.postInTransaction(tx, { companyId, actorUserId, ...command });
  }

  private async executePosting(command: PostJournalCommand) {
    try {
      return await this.prisma.$transaction((tx) =>
        this.postInTransaction(tx, command),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existing = await this.findByIdempotencyKey(
          command.companyId,
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
        lines: { include: { account: true }, orderBy: { sequence: 'asc' } },
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
    try {
      return await this.prisma.$transaction((tx) =>
        this.reverseInTransaction(tx, companyId, actorUserId, id, dto),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Journal entry is already being reversed or has already been reversed',
        );
      }
      throw error;
    }
  }

  async reverseInTransaction(
    tx: TransactionDb,
    companyId: string,
    actorUserId: string,
    id: string,
    dto: ReverseJournalEntryDto,
  ) {
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
        transactionDebit: line.transactionCredit.toFixed(4),
        transactionCredit: line.transactionDebit.toFixed(4),
        description: line.description ?? undefined,
        businessPartnerId: line.businessPartnerId ?? undefined,
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
      if (existingReversal.requestHash !== this.hashCommand(reversalCommand)) {
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
    const currencyContext = await this.resolveCurrencyContext(
      tx,
      command.companyId,
      currencyCode,
    );
    if (
      currencyCode === currencyContext.base.code &&
      !exchangeRate.toDecimal().eq(1)
    ) {
      throw new BadRequestException(
        'A base-currency transaction must use an exchange rate of exactly 1',
      );
    }

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
    if (period.status === AccountingPeriodStatus.CLOSED) {
      throw new ConflictException(
        'Closed accounting periods cannot receive postings',
      );
    }
    if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
      if (!command.periodOverrideReason?.trim()) {
        throw new ConflictException(
          'A soft-closed period requires a controlled override reason',
        );
      }
      await this.assertPeriodOverrideActor(
        tx,
        command.companyId,
        command.actorUserId,
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
    const accountById = new Map<string, (typeof accounts)[number]>();
    for (const account of accounts) {
      accountById.set(account.id, account);
    }
    if (accounts.length !== accountIds.length) {
      throw new NotFoundException(
        'One or more accounts do not belong to this company',
      );
    }

    let transactionDebitTotal = AccountingMoney.zero();
    let transactionCreditTotal = AccountingMoney.zero();
    const lineData: Array<{
      companyId: string;
      accountId: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      transactionDebit: Prisma.Decimal;
      transactionCredit: Prisma.Decimal;
      description: string | null;
      businessPartnerId: string | null;
      dueDate: Date | null;
      documentReference: string | null;
      reconciliationReference: string | null;
      taxCode: string | null;
      taxTreatmentCode: string | null;
      taxRate: Prisma.Decimal | null;
    }> = [];
    const transactionMinorUnitPrecision = Number(
      currencyContext.transaction.minorUnitPrecision,
    );
    const parsedLines: Array<{
      input: (typeof command.lines)[number];
      transactionDebit: Prisma.Decimal;
      transactionCredit: Prisma.Decimal;
    }> = [];
    for (const line of command.lines) {
      const account = accountById.get(line.accountId)!;
      if (!account.isActive)
        throw new ConflictException(`Account ${account.code} is inactive`);
      if (
        command.sourceType === JournalSourceType.MANUAL_JOURNAL &&
        (account.accountType === 'ASSET_RECEIVABLE' ||
          account.accountType === 'LIABILITY_PAYABLE')
      )
        throw new ConflictException(
          `Account ${account.code} requires a source-document posting`,
        );
      if (!account.allowDirectPosting)
        throw new ConflictException(
          `Account ${account.code} does not allow direct posting`,
        );
      if (account.currencyCode && account.currencyCode !== currencyCode) {
        throw new BadRequestException(
          `Account ${account.code} only accepts ${account.currencyCode}`,
        );
      }
      await validateAccountingCounterparty(tx, {
        companyId: command.companyId,
        accountType: account.accountType,
        businessPartnerId: line.businessPartnerId,
        isControlAccount: account.isControlAccount,
        reconciliationEligible: account.reconciliationEligible,
      });
      const transactionDebit = AccountingMoney.fromString(
        line.transactionDebit,
        'transactionDebit',
        transactionMinorUnitPrecision,
      );
      const transactionCredit = AccountingMoney.fromString(
        line.transactionCredit,
        'transactionCredit',
        transactionMinorUnitPrecision,
      );
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
      transactionDebitTotal = transactionDebitTotal.add(transactionDebit);
      transactionCreditTotal = transactionCreditTotal.add(transactionCredit);
      parsedLines.push({
        input: line,
        transactionDebit: transactionDebit.toDecimal(),
        transactionCredit: transactionCredit.toDecimal(),
      });
    }

    if (!transactionDebitTotal.eq(transactionCreditTotal)) {
      throw new BadRequestException(
        'Transaction currency journal is not balanced: total debit must equal total credit',
      );
    }

    let conversion: ReturnType<typeof convertAndAllocateBaseCurrency>;
    try {
      conversion = convertAndAllocateBaseCurrency(
        parsedLines.map((line) => ({
          accountId: line.input.accountId,
          transactionDebit: line.transactionDebit,
          transactionCredit: line.transactionCredit,
        })),
        exchangeRate.toDecimal(),
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    const debitTotal = AccountingMoney.fromString(
      conversion.debitTotal.toFixed(4),
    );
    const creditTotal = AccountingMoney.fromString(
      conversion.creditTotal.toFixed(4),
    );
    transactionDebitTotal = AccountingMoney.fromString(
      conversion.transactionDebitTotal.toFixed(transactionMinorUnitPrecision),
    );
    transactionCreditTotal = AccountingMoney.fromString(
      conversion.transactionCreditTotal.toFixed(transactionMinorUnitPrecision),
    );
    const baseConversionResidualAccountId = conversion.residualAccountId;
    const baseConversionResidualSide = conversion.residualSide;
    const baseConversionResidual = conversion.residual;
    lineData.push(
      ...parsedLines.map((parsed, index) => ({
        companyId: command.companyId,
        accountId: parsed.input.accountId,
        debit: conversion.lines[index].debit,
        credit: conversion.lines[index].credit,
        transactionDebit: parsed.transactionDebit,
        transactionCredit: parsed.transactionCredit,
        description: parsed.input.description ?? null,
        businessPartnerId: parsed.input.businessPartnerId ?? null,
        dueDate: parsed.input.dueDate
          ? this.parseDate(parsed.input.dueDate, 'line.dueDate')
          : dueDate,
        documentReference:
          parsed.input.documentReference ?? command.documentReference ?? null,
        reconciliationReference: parsed.input.reconciliationReference ?? null,
        taxCode: parsed.input.taxCode ?? null,
        taxTreatmentCode: parsed.input.taxTreatmentCode ?? null,
        taxRate: parsed.input.taxRate
          ? this.parseTaxRate(parsed.input.taxRate)
          : null,
      })),
    );

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
      data: lineData.map((line, index) => ({
        ...line,
        journalEntryId: entry.id,
        sequence: index + 1,
      })),
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
          baseConversionResidual: baseConversionResidual.toFixed(4),
          baseConversionResidualAccountId,
          baseConversionResidualSide,
        },
      },
    });
    if (command.periodOverrideReason?.trim()) {
      await tx.auditLog.create({
        data: {
          companyId: command.companyId,
          actorUserId: command.actorUserId,
          action: 'accounting.period.soft_close_override',
          entityType: 'accounting_period',
          entityId: command.accountingPeriodId,
          metadata: {
            reason: command.periodOverrideReason.trim(),
            entryId: posted.id,
            entryNumber,
          },
        },
      });
    }
    return this.serializeEntry(posted);
  }

  private findByIdempotencyKey(
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

  private findEntry(companyId: string, id: string) {
    return this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        lines: { include: { account: true }, orderBy: { sequence: 'asc' } },
        journal: true,
        accountingPeriod: { include: { fiscalYear: true } },
      },
    });
  }

  private async ensureConfiguration(companyId: string, actorUserId: string) {
    const configuration = await this.prisma.accountingConfiguration.findUnique({
      where: { companyId },
    });
    if (configuration) return configuration;
    await this.getConfiguration(companyId, actorUserId);
    return this.prisma.accountingConfiguration.findUniqueOrThrow({
      where: { companyId },
    });
  }

  private async assertActiveCurrency(db: any, code: string) {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new BadRequestException('Invalid ISO currency code');
    }
    const currency = await db.currency.findUnique({
      where: { code: normalized },
    });
    if (!currency || !currency.isActive) {
      throw new BadRequestException(
        `Currency ${normalized} is not active in the currency master`,
      );
    }
    return currency;
  }

  private async resolveCurrencyContext(
    tx: TransactionDb,
    companyId: string,
    transactionCurrencyCode: string,
  ) {
    const configuration = await tx.accountingConfiguration.findUnique({
      where: { companyId },
    });
    if (!configuration) {
      throw new ConflictException(
        'Accounting configuration must be initialized before posting',
      );
    }
    const [base, transaction] = await Promise.all([
      tx.currency.findUnique({
        where: { code: configuration.baseCurrencyCode },
      }),
      tx.currency.findUnique({ where: { code: transactionCurrencyCode } }),
    ]);
    if (!base || !base.isActive || !transaction || !transaction.isActive) {
      throw new BadRequestException(
        'Posting currency is not active in the currency master',
      );
    }
    return { configuration, base, transaction };
  }

  private async assertPeriodOverrideActor(
    tx: TransactionDb,
    companyId: string,
    actorUserId: string,
  ) {
    const actor = await tx.user.findFirst({
      where: {
        id: actorUserId,
        status: 'ACTIVE',
        OR: [{ companyId }, { role: UserRole.SUPER_ADMIN }],
      },
      include: { permissions: true },
    });
    if (!actor)
      throw new ConflictException(
        'The override actor is not active in this company',
      );
    if (actor.role === UserRole.OWNER || actor.role === UserRole.SUPER_ADMIN)
      return;
    const permissions = actor.permissions?.permissions;
    if (
      !permissions ||
      typeof permissions !== 'object' ||
      Array.isArray(permissions) ||
      (permissions as Record<string, unknown>).manageLedger !== true
    ) {
      throw new ConflictException(
        'The actor is not authorized to override a soft-closed period',
      );
    }
  }

  private async auditMasterMutation(
    tx: TransactionDb,
    companyId: string,
    actorUserId: string,
    event: { action: string; entityId: string; metadata?: unknown },
  ) {
    await tx.auditLog.create({
      data: {
        companyId,
        actorUserId,
        action: event.action,
        entityType: 'accounting_master_data',
        entityId: event.entityId,
        metadata: this.jsonSnapshot(event.metadata ?? {}),
      },
    });
  }

  private jsonSnapshot(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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
      periodOverrideReason: command.periodOverrideReason ?? null,
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
