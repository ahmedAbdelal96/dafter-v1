import {
  ConflictException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import {
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  AccountingPeriodStatus,
  AccountingSetupStatus,
  FiscalYearStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { TemplateService } from './template.service';

export interface InitializeCompanyAccountingInput {
  companyId: string;
  actorUserId: string;
  idempotencyKey: string;
  countryCode: string;
  localeCode: string;
  baseCurrencyCode: string;
  templateCode: string;
  templateVersion: number;
  fiscalYearStart: Date;
  fiscalYearEnd: Date;
}

export interface AccountingBootstrapResult {
  id: string;
  companyId: string;
  status: AccountingSetupStatus;
  templateCode: string;
  templateVersion: number;
  accountCount: number;
  journalCount: number;
  periodCount: number;
  fiscalYearId: string;
}

export interface GeneratedPeriod {
  name: string;
  startDate: Date;
  endDate: Date;
}

export function generateMonthlyPeriods(
  startDate: Date,
  endDate: Date,
): GeneratedPeriod[] {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (start.getTime() > end.getTime())
    throw new BadRequestException(
      'Fiscal year start must be before fiscal year end',
    );
  if (start.getUTCDate() !== 1)
    throw new BadRequestException(
      'Fiscal year must start on the first day of a month',
    );
  const periods: GeneratedPeriod[] = [];
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const nextMonth = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
    const periodEnd = new Date(
      Math.min(nextMonth.getTime() - 86_400_000, end.getTime()),
    );
    periods.push({
      name: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
      startDate: new Date(cursor),
      endDate: periodEnd,
    });
    cursor = nextMonth;
  }
  if (
    !periods.length ||
    periods[periods.length - 1].endDate.getTime() !== end.getTime()
  ) {
    throw new BadRequestException(
      'Fiscal year range must end on the last day of a month',
    );
  }
  return periods;
}

@Injectable()
export class InitializeCompanyAccounting {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: PlatformIdempotencyService,
    private readonly templates: TemplateService,
  ) {}

  execute(
    input: InitializeCompanyAccountingInput,
  ): Promise<AccountingBootstrapResult> {
    const payload = {
      ...input,
      fiscalYearStart: input.fiscalYearStart.toISOString(),
      fiscalYearEnd: input.fiscalYearEnd.toISOString(),
    };
    return this.idempotency.executeMutation({
      scope: 'accounting-bootstrap',
      operationType: 'company-accounting-bootstrap',
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      idempotencyKey: input.idempotencyKey,
      payload,
      run: () => this.run(input),
    });
  }

  private async run(
    input: InitializeCompanyAccountingInput,
  ): Promise<AccountingBootstrapResult> {
    return this.prisma.$transaction(async (db) => {
      const existing = await db.accountingSetup.findUnique({
        where: { companyId: input.companyId },
      });
      if (existing)
        throw new ConflictException(
          'Company accounting is already initialized',
        );
      const company = await db.company.findFirst({
        where: { id: input.companyId },
        select: { id: true },
      });
      if (!company) throw new BadRequestException('Company not found');
      const currency = await db.currency.findFirst({
        where: { code: input.baseCurrencyCode, isActive: true },
      });
      if (!currency)
        throw new BadRequestException('Base currency is not active');
      const template = await this.templates.loadActive(
        input.templateCode,
        input.templateVersion,
        db,
      );
      const periods = generateMonthlyPeriods(
        input.fiscalYearStart,
        input.fiscalYearEnd,
      );

      const configuration = await db.accountingConfiguration.create({
        data: {
          companyId: input.companyId,
          baseCurrencyCode: input.baseCurrencyCode,
          countryCode: input.countryCode,
          localeCode: input.localeCode,
        },
      });
      const accounts = await this.templates.instantiate(
        db,
        input.companyId,
        template,
        input.baseCurrencyCode,
      );
      const journals = await Promise.all([
        this.createJournal(
          db,
          input.companyId,
          'GENERAL',
          AccountingJournalType.GENERAL,
          input.baseCurrencyCode,
        ),
        this.createJournal(
          db,
          input.companyId,
          'SALES',
          AccountingJournalType.SALES,
          input.baseCurrencyCode,
        ),
        this.createJournal(
          db,
          input.companyId,
          'PURCHASE',
          AccountingJournalType.PURCHASE,
          input.baseCurrencyCode,
        ),
        this.createJournal(
          db,
          input.companyId,
          'CASH',
          AccountingJournalType.CASH,
          input.baseCurrencyCode,
        ),
      ]);
      const fiscalYear = await db.fiscalYear.create({
        data: {
          companyId: input.companyId,
          name: `FY-${input.fiscalYearStart.getUTCFullYear()}-${input.fiscalYearEnd.getUTCFullYear()}`,
          startDate: input.fiscalYearStart,
          endDate: input.fiscalYearEnd,
          status: FiscalYearStatus.OPEN,
        },
      });
      const createdPeriods: Array<{ id: string }> = [];
      for (const period of periods) {
        createdPeriods.push(
          await db.accountingPeriod.create({
            data: {
              companyId: input.companyId,
              fiscalYearId: fiscalYear.id,
              name: period.name,
              startDate: period.startDate,
              endDate: period.endDate,
              status: AccountingPeriodStatus.OPEN,
            },
          }),
        );
      }
      await db.accountingEntrySequence.create({
        data: { companyId: input.companyId, fiscalYearId: fiscalYear.id },
      });

      const accountByKey = new Map(
        accounts.map((account) => [account.templateKey, account]),
      );
      const journalByCode = new Map(
        journals.map((journal) => [journal.code, journal]),
      );
      const accountMappings: Array<[AccountingConfigAccountKey, string]> = [
        [AccountingConfigAccountKey.RECEIVABLE, 'AR_CONTROL'],
        [AccountingConfigAccountKey.PAYABLE, 'AP_CONTROL'],
        [AccountingConfigAccountKey.INCOME, 'SALES_REVENUE'],
        [AccountingConfigAccountKey.EXPENSE, 'DEFAULT_EXPENSE'],
        [AccountingConfigAccountKey.RETAINED_EARNINGS, 'RETAINED_EARNINGS'],
        [AccountingConfigAccountKey.EXCHANGE_GAIN, 'EXCHANGE_GAIN'],
        [AccountingConfigAccountKey.EXCHANGE_LOSS, 'EXCHANGE_LOSS'],
        [AccountingConfigAccountKey.ROUNDING, 'ROUNDING'],
        [AccountingConfigAccountKey.TAX_PAYABLE, 'TAX_PAYABLE'],
        [AccountingConfigAccountKey.TAX_RECOVERABLE, 'TAX_RECOVERABLE'],
        [AccountingConfigAccountKey.INVENTORY, 'INVENTORY'],
        [AccountingConfigAccountKey.COGS, 'COGS'],
      ];
      for (const [settingKey, templateKey] of accountMappings) {
        const account = accountByKey.get(templateKey);
        if (!account)
          throw new BadRequestException(
            `Required account mapping is missing: ${templateKey}`,
          );
        await db.accountingConfigurationAccount.create({
          data: {
            companyId: input.companyId,
            configurationId: configuration.id,
            settingKey,
            accountId: account.id,
          },
        });
      }
      const journalMappings: Array<[AccountingConfigJournalKey, string]> = [
        [AccountingConfigJournalKey.GENERAL, 'GENERAL'],
        [AccountingConfigJournalKey.SALES, 'SALES'],
        [AccountingConfigJournalKey.PURCHASE, 'PURCHASE'],
        [AccountingConfigJournalKey.CASH, 'CASH'],
      ];
      for (const [settingKey, code] of journalMappings) {
        const journal = journalByCode.get(code);
        if (!journal)
          throw new BadRequestException(
            `Required journal mapping is missing: ${code}`,
          );
        await db.accountingConfigurationJournal.create({
          data: {
            companyId: input.companyId,
            configurationId: configuration.id,
            settingKey,
            journalId: journal.id,
          },
        });
      }
      const setup = await db.accountingSetup.create({
        data: {
          companyId: input.companyId,
          status: AccountingSetupStatus.READY,
          templateCode: template.code,
          templateVersion: template.version,
          completedAt: new Date(),
        },
      });
      await db.auditLog.create({
        data: {
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          action: 'accounting-bootstrap.completed',
          entityType: 'AccountingSetup',
          entityId: setup.id,
          metadata: {
            templateCode: template.code,
            templateVersion: template.version,
            accountCount: accounts.length,
            periodCount: createdPeriods.length,
          } as Prisma.InputJsonValue,
        },
      });
      return {
        id: setup.id,
        companyId: input.companyId,
        status: setup.status,
        templateCode: template.code,
        templateVersion: template.version,
        accountCount: accounts.length,
        journalCount: journals.length,
        periodCount: createdPeriods.length,
        fiscalYearId: fiscalYear.id,
      };
    });
  }

  private createJournal(
    db: Prisma.TransactionClient,
    companyId: string,
    code: string,
    type: AccountingJournalType,
    currencyCode: string,
  ) {
    return db.accountingJournal.create({
      data: { companyId, code, name: code, type, currencyCode },
    });
  }
}

@Injectable()
export class AccountingBootstrapService {
  constructor(private readonly initializer: InitializeCompanyAccounting) {}

  execute(input: InitializeCompanyAccountingInput) {
    return this.initializer.execute(input);
  }
}

function toUtcDate(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime()))
    throw new BadRequestException('Fiscal year date is invalid');
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}
