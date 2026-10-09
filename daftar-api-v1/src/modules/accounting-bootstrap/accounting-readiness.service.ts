import { Injectable } from '@nestjs/common';
import {
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingSetupStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

export interface AccountingReadiness {
  status: AccountingSetupStatus;
  ready: boolean;
  reasons: string[];
  companyId: string;
  postingDate: Date;
}

const REQUIRED_ACCOUNT_MAPPINGS = Object.values(AccountingConfigAccountKey);
const REQUIRED_JOURNAL_MAPPINGS = [
  AccountingConfigJournalKey.GENERAL,
  AccountingConfigJournalKey.SALES,
  AccountingConfigJournalKey.PURCHASE,
  AccountingConfigJournalKey.CASH,
];

@Injectable()
export class AccountingReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
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
    const [company, configuration, journals, fiscalYear, period, setup] =
      await Promise.all([
        this.prisma.company.findFirst({
          where: { id: companyId },
          select: {
            id: true,
            currency: { select: { code: true, isActive: true } },
          },
        }),
        this.prisma.accountingConfiguration.findUnique({
          where: { companyId },
          include: { accountDefaults: true, journalDefaults: true },
        }),
        this.prisma.accountingJournal.findMany({
          where: { companyId, isActive: true },
          select: { type: true },
        }),
        this.prisma.fiscalYear.findFirst({
          where: {
            companyId,
            status: 'OPEN',
            startDate: { lte: date },
            endDate: { gte: date },
          },
        }),
        this.prisma.accountingPeriod.findFirst({
          where: {
            companyId,
            status: 'OPEN',
            startDate: { lte: date },
            endDate: { gte: date },
          },
        }),
        this.prisma.accountingSetup.findUnique({
          where: { companyId },
          select: { status: true },
        }),
      ]);
    const reasons: string[] = [];
    if (!company) reasons.push('COMPANY_NOT_FOUND');
    if (!company?.currency.isActive) reasons.push('BASE_CURRENCY_INACTIVE');
    if (!configuration) reasons.push('ACCOUNTING_CONFIGURATION_MISSING');
    const configuredAccounts = new Set(
      configuration?.accountDefaults.map((item) => item.settingKey),
    );
    for (const key of REQUIRED_ACCOUNT_MAPPINGS)
      if (!configuredAccounts.has(key))
        reasons.push(`ACCOUNT_MAPPING_MISSING:${key}`);
    const configuredJournals = new Set(
      configuration?.journalDefaults.map((item) => item.settingKey),
    );
    for (const key of REQUIRED_JOURNAL_MAPPINGS)
      if (!configuredJournals.has(key))
        reasons.push(`JOURNAL_MAPPING_MISSING:${key}`);
    if (journals.length < REQUIRED_JOURNAL_MAPPINGS.length)
      reasons.push('REQUIRED_JOURNALS_MISSING');
    if (!fiscalYear) reasons.push('OPEN_FISCAL_YEAR_MISSING');
    if (!period) reasons.push('OPEN_ACCOUNTING_PERIOD_MISSING');

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
