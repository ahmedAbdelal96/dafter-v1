import { Injectable } from '@nestjs/common';
import {
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  AccountingSetupStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  assertAccountMappingCompatibility,
  assertJournalMappingCompatibility,
} from '../accounting/accounting-policies';

export interface AccountingReadiness {
  status: AccountingSetupStatus;
  ready: boolean;
  reasons: string[];
  companyId: string;
  postingDate: Date;
}

const REQUIRED_ACCOUNT_MAPPINGS = Object.values(AccountingConfigAccountKey);
const REQUIRED_JOURNAL_MAPPINGS: Array<{
  key: AccountingConfigJournalKey;
  type: AccountingJournalType;
}> = [
  {
    key: AccountingConfigJournalKey.GENERAL,
    type: AccountingJournalType.GENERAL,
  },
  { key: AccountingConfigJournalKey.SALES, type: AccountingJournalType.SALES },
  {
    key: AccountingConfigJournalKey.PURCHASE,
    type: AccountingJournalType.PURCHASE,
  },
  { key: AccountingConfigJournalKey.CASH, type: AccountingJournalType.CASH },
  {
    key: AccountingConfigJournalKey.EXCHANGE_DIFFERENCE,
    type: AccountingJournalType.GENERAL,
  },
];

@Injectable()
export class AccountingReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    companyId: string,
    postingDate = new Date(),
  ): Promise<AccountingReadiness> {
    return this.evaluateAgainst(this.prisma, companyId, postingDate);
  }

  async evaluateInTransaction(
    db: Prisma.TransactionClient,
    companyId: string,
    postingDate = new Date(),
  ): Promise<AccountingReadiness> {
    return this.evaluateAgainst(db, companyId, postingDate);
  }

  private async evaluateAgainst(
    db: PrismaService | Prisma.TransactionClient,
    companyId: string,
    postingDate = new Date(),
  ): Promise<AccountingReadiness> {
    const date = new Date(
      Date.UTC(
        postingDate.getUTCFullYear(),
        postingDate.getUTCMonth(),
        postingDate.getUTCDate(),
      ),
    );
    const [company, configuration, fiscalYear, period, setup] =
      await Promise.all([
        db.company.findFirst({
          where: { id: companyId, isDeleted: false },
          select: {
            id: true,
            currencyCode: true,
            currency: { select: { code: true, isActive: true } },
          },
        }),
        db.accountingConfiguration.findUnique({
          where: { companyId },
          include: {
            baseCurrency: { select: { code: true, isActive: true } },
            accountDefaults: true,
            journalDefaults: true,
          },
        }),
        db.fiscalYear.findFirst({
          where: {
            companyId,
            status: 'OPEN',
            startDate: { lte: date },
            endDate: { gte: date },
          },
        }),
        db.accountingPeriod.findFirst({
          where: {
            companyId,
            status: 'OPEN',
            startDate: { lte: date },
            endDate: { gte: date },
          },
          include: { fiscalYear: true },
        }),
        db.accountingSetup.findUnique({
          where: { companyId },
          include: {
            template: { select: { code: true, version: true, isActive: true } },
          },
        }),
      ]);

    const reasons: string[] = [];
    if (!company) reasons.push('COMPANY_NOT_FOUND');
    if (!company?.currency.isActive) reasons.push('COMPANY_CURRENCY_INACTIVE');
    if (!configuration) {
      reasons.push('ACCOUNTING_CONFIGURATION_MISSING');
    } else {
      if (!configuration.baseCurrency.isActive)
        reasons.push('BASE_CURRENCY_INACTIVE');
      if (company && company.currencyCode !== configuration.baseCurrencyCode)
        reasons.push('COMPANY_BASE_CURRENCY_MISMATCH');
    }

    const configuredAccounts = new Map(
      configuration?.accountDefaults.map((item) => [item.settingKey, item]) ??
        [],
    );
    for (const key of REQUIRED_ACCOUNT_MAPPINGS) {
      const mapping = configuredAccounts.get(key);
      if (!mapping) {
        reasons.push(`ACCOUNT_MAPPING_MISSING:${key}`);
        continue;
      }
      const account = await db.accountingAccount.findFirst({
        where: { id: mapping.accountId, companyId },
      });
      if (!account) {
        reasons.push(`ACCOUNT_MAPPING_NOT_FOUND:${key}`);
        continue;
      }
      if (!account.isActive) reasons.push(`ACCOUNT_MAPPING_INACTIVE:${key}`);
      try {
        assertAccountMappingCompatibility(key, account.accountType);
      } catch {
        reasons.push(`ACCOUNT_MAPPING_INCOMPATIBLE:${key}`);
      }
      if (
        (key === AccountingConfigAccountKey.RECEIVABLE ||
          key === AccountingConfigAccountKey.PAYABLE) &&
        (!account.isControlAccount || !account.reconciliationEligible)
      ) {
        reasons.push(`ACCOUNT_MAPPING_NOT_CONTROL_ELIGIBLE:${key}`);
      }
    }

    const configuredJournals = new Map(
      configuration?.journalDefaults.map((item) => [item.settingKey, item]) ??
        [],
    );
    for (const required of REQUIRED_JOURNAL_MAPPINGS) {
      const mapping = configuredJournals.get(required.key);
      if (!mapping) {
        reasons.push(`JOURNAL_MAPPING_MISSING:${required.key}`);
        continue;
      }
      const journal = await db.accountingJournal.findFirst({
        where: { id: mapping.journalId, companyId },
      });
      if (!journal) {
        reasons.push(`JOURNAL_MAPPING_NOT_FOUND:${required.key}`);
        continue;
      }
      if (!journal.isActive)
        reasons.push(`JOURNAL_MAPPING_INACTIVE:${required.key}`);
      try {
        assertJournalMappingCompatibility(required.key, journal.type);
      } catch {
        reasons.push(`JOURNAL_MAPPING_INCOMPATIBLE:${required.key}`);
      }
    }

    if (!fiscalYear) reasons.push('OPEN_FISCAL_YEAR_MISSING');
    if (!period) {
      reasons.push('OPEN_ACCOUNTING_PERIOD_MISSING');
    } else if (!fiscalYear || period.fiscalYearId !== fiscalYear.id) {
      reasons.push('ACCOUNTING_PERIOD_FISCAL_YEAR_MISMATCH');
    }

    if (!setup) {
      reasons.push('ACCOUNTING_SETUP_MISSING');
    } else {
      if (setup.status !== AccountingSetupStatus.READY)
        reasons.push(`ACCOUNTING_SETUP_NOT_READY:${setup.status}`);
      if (
        !setup.template.isActive ||
        setup.template.code !== setup.templateCode ||
        setup.template.version !== setup.templateVersion
      ) {
        reasons.push('ACCOUNTING_TEMPLATE_PROVENANCE_INVALID');
      }
      const accountCount = await db.accountingAccount.count({
        where: {
          companyId,
          templateCode: setup.templateCode,
          templateVersion: setup.templateVersion,
        },
      });
      if (accountCount === 0)
        reasons.push('ACCOUNTING_TEMPLATE_ACCOUNTS_MISSING');
    }

    return {
      companyId,
      postingDate: date,
      ready: reasons.length === 0,
      status:
        reasons.length === 0
          ? AccountingSetupStatus.READY
          : setup?.status === AccountingSetupStatus.NOT_CONFIGURED
            ? AccountingSetupStatus.NOT_CONFIGURED
            : AccountingSetupStatus.BLOCKED,
      reasons,
    };
  }
}
