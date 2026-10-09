import 'dotenv/config';

import { AccountingSetupStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingReadinessService } from './accounting-readiness.service';
import { InitializeCompanyAccounting } from './accounting-bootstrap.service';
import { TemplateService } from './template.service';
import { installEgStandardV1 } from '../../../prisma/seeds/modules/15-accounting-templates';

jest.setTimeout(30_000);

describe('B02 company accounting bootstrap', () => {
  let prisma: PrismaService;
  let initializer: InitializeCompanyAccounting;
  let readiness: AccountingReadinessService;
  let company: { id: string };
  let owner: { id: string };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('DATABASE_URL is required for B02 integration tests');
    prisma = new PrismaService();
    await prisma.$connect();
    initializer = new InitializeCompanyAccounting(
      prisma,
      new PlatformIdempotencyService(prisma),
      new TemplateService(prisma),
    );
    readiness = new AccountingReadinessService(prisma);
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    company = await prisma.company.create({
      data: { name: `B02 Bootstrap ${stamp}`, currencyCode: 'EGP' },
    });
    owner = await prisma.user.create({
      data: {
        email: `b02-bootstrap-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Bootstrap Owner',
        companyId: company.id,
        role: 'OWNER',
      },
    });
  });

  afterAll(async () => {
    if (company?.id) {
      await prisma.accountingConfigurationAccount.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.accountingConfigurationJournal.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.accountingSetup.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.accountingPeriod.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.accountingEntrySequence.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.fiscalYear.deleteMany({ where: { companyId: company.id } });
      await prisma.accountingConfiguration.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.accountingJournal.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.accountingAccount.deleteMany({
        where: { companyId: company.id },
      });
      await prisma.company.delete({ where: { id: company.id } });
    }
    await prisma?.$disconnect();
  });

  it('bootstraps EG_STANDARD_V1 with July-June periods and READY status', async () => {
    const result = await initializer.execute({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'b02-bootstrap-1',
      countryCode: 'EG',
      localeCode: 'ar-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-07-01T00:00:00.000Z'),
      fiscalYearEnd: new Date('2027-06-30T00:00:00.000Z'),
    });

    expect(result.status).toBe(AccountingSetupStatus.READY);
    expect(
      await prisma.accountingAccount.count({
        where: { companyId: company.id },
      }),
    ).toBeGreaterThan(10);
    expect(
      await prisma.accountingJournal.count({
        where: { companyId: company.id },
      }),
    ).toBe(4);
    expect(
      await prisma.accountingPeriod.count({ where: { companyId: company.id } }),
    ).toBe(12);
    expect(
      await prisma.accountingAccount.findFirst({
        where: { companyId: company.id, templateKey: 'AR_CONTROL' },
      }),
    ).toEqual(
      expect.objectContaining({
        templateCode: 'EG_STANDARD_V1',
        templateVersion: 1,
      }),
    );
    expect(
      (
        await readiness.evaluate(
          company.id,
          new Date('2026-07-01T00:00:00.000Z'),
        )
      ).status,
    ).toBe(AccountingSetupStatus.READY);
  });

  it('replays the same idempotency key and rejects a different payload after setup', async () => {
    const payload = {
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'b02-bootstrap-1',
      countryCode: 'EG',
      localeCode: 'ar-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-07-01T00:00:00.000Z'),
      fiscalYearEnd: new Date('2027-06-30T00:00:00.000Z'),
    };
    const first = await initializer.execute(payload);
    const replay = await initializer.execute(payload);
    expect(replay.id).toBe(first.id);
    await expect(
      initializer.execute({
        ...payload,
        idempotencyKey: 'b02-bootstrap-different',
        localeCode: 'en-EG',
      }),
    ).rejects.toThrow();
  });

  it('keeps failure atomic when the template is missing', async () => {
    const stamp = Date.now();
    const rollbackCompany = await prisma.company.create({
      data: { name: `B02 Rollback ${stamp}`, currencyCode: 'EGP' },
    });
    const rollbackOwner = await prisma.user.create({
      data: {
        email: `b02-rollback-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Rollback Owner',
        companyId: rollbackCompany.id,
        role: 'OWNER',
      },
    });
    await expect(
      initializer.execute({
        companyId: rollbackCompany.id,
        actorUserId: rollbackOwner.id,
        idempotencyKey: 'b02-bootstrap-missing-template',
        countryCode: 'EG',
        localeCode: 'ar-EG',
        baseCurrencyCode: 'EGP',
        templateCode: 'MISSING',
        templateVersion: 1,
        fiscalYearStart: new Date('2028-07-01T00:00:00.000Z'),
        fiscalYearEnd: new Date('2029-06-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow();
    expect(
      await prisma.accountingConfiguration.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingAccount.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingJournal.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.fiscalYear.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingPeriod.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingSetup.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    await prisma.company.delete({ where: { id: rollbackCompany.id } });
  });

  it('rolls back objects created before an injected bootstrap failure', async () => {
    const stamp = Date.now();
    const rollbackCompany = await prisma.company.create({
      data: { name: `B02 Injected Rollback ${stamp}`, currencyCode: 'EGP' },
    });
    const rollbackOwner = await prisma.user.create({
      data: {
        email: `b02-injected-rollback-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Injected Rollback Owner',
        companyId: rollbackCompany.id,
        role: 'OWNER',
      },
    });
    const instantiateSpy = jest
      .spyOn(TemplateService.prototype, 'instantiate')
      .mockRejectedValueOnce(new Error('injected bootstrap failure'));
    try {
      await expect(
        initializer.execute({
          companyId: rollbackCompany.id,
          actorUserId: rollbackOwner.id,
          idempotencyKey: 'b02-bootstrap-injected-failure',
          countryCode: 'EG',
          localeCode: 'ar-EG',
          baseCurrencyCode: 'EGP',
          templateCode: 'EG_STANDARD_V1',
          templateVersion: 1,
          fiscalYearStart: new Date('2028-07-01T00:00:00.000Z'),
          fiscalYearEnd: new Date('2029-06-30T00:00:00.000Z'),
        }),
      ).rejects.toThrow('injected bootstrap failure');
    } finally {
      instantiateSpy.mockRestore();
    }
    expect(
      await prisma.accountingConfiguration.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingAccount.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingJournal.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.fiscalYear.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accountingSetup.count({
        where: { companyId: rollbackCompany.id },
      }),
    ).toBe(0);
    await prisma.company.delete({ where: { id: rollbackCompany.id } });
  });

  it('reports blocked readiness reasons for inactive mappings and currencies', async () => {
    const mapping =
      await prisma.accountingConfigurationAccount.findFirstOrThrow({
        where: { companyId: company.id, settingKey: 'RECEIVABLE' },
      });
    const account = await prisma.accountingAccount.findUniqueOrThrow({
      where: { id: mapping.accountId },
    });
    await prisma.accountingAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });
    const inactiveAccount = await readiness.evaluate(
      company.id,
      new Date('2026-07-01T00:00:00.000Z'),
    );
    expect(inactiveAccount.ready).toBe(false);
    expect(inactiveAccount.reasons).toContain(
      'ACCOUNT_MAPPING_INACTIVE:RECEIVABLE',
    );
    await prisma.accountingAccount.update({
      where: { id: account.id },
      data: { isActive: true },
    });

    const missingMapping =
      await prisma.accountingConfigurationAccount.findFirstOrThrow({
        where: { companyId: company.id, settingKey: 'EXPENSE' },
      });
    await prisma.accountingConfigurationAccount.delete({
      where: { id: missingMapping.id },
    });
    const incomplete = await readiness.evaluate(
      company.id,
      new Date('2026-07-01T00:00:00.000Z'),
    );
    expect(incomplete.ready).toBe(false);
    expect(incomplete.reasons).toContain('ACCOUNT_MAPPING_MISSING:EXPENSE');
    await prisma.accountingConfigurationAccount.create({
      data: {
        companyId: company.id,
        configurationId: missingMapping.configurationId,
        settingKey: missingMapping.settingKey,
        accountId: missingMapping.accountId,
      },
    });

    await prisma.currency.update({
      where: { code: 'EGP' },
      data: { isActive: false },
    });
    const inactiveCurrency = await readiness.evaluate(
      company.id,
      new Date('2026-07-01T00:00:00.000Z'),
    );
    expect(inactiveCurrency.ready).toBe(false);
    expect(inactiveCurrency.reasons).toEqual(
      expect.arrayContaining([
        'COMPANY_CURRENCY_INACTIVE',
        'BASE_CURRENCY_INACTIVE',
      ]),
    );
    await prisma.currency.update({
      where: { code: 'EGP' },
      data: { isActive: true },
    });
  });

  it('blocks readiness when a required journal mapping has the wrong type', async () => {
    const salesMapping =
      await prisma.accountingConfigurationJournal.findFirstOrThrow({
        where: { companyId: company.id, settingKey: 'SALES' },
      });
    const cashJournal = await prisma.accountingJournal.findFirstOrThrow({
      where: { companyId: company.id, type: 'CASH' },
    });
    const originalJournalId = salesMapping.journalId;
    await prisma.accountingConfigurationJournal.update({
      where: { id: salesMapping.id },
      data: { journalId: cashJournal.id },
    });
    const blocked = await readiness.evaluate(
      company.id,
      new Date('2026-07-01T00:00:00.000Z'),
    );
    expect(blocked.ready).toBe(false);
    expect(blocked.reasons).toContain('JOURNAL_MAPPING_INCOMPATIBLE:SALES');
    await prisma.accountingConfigurationJournal.update({
      where: { id: salesMapping.id },
      data: { journalId: originalJournalId },
    });
  });

  it('rejects immutable reference-data name drift instead of silently verifying it', async () => {
    const account = await prisma.accountingTemplateAccount.findFirstOrThrow({
      where: {
        template: { code: 'EG_STANDARD_V1', version: 1 },
        stableKey: 'CASH',
      },
    });
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "AccountingTemplateAccount" DISABLE TRIGGER "dafter_protect_used_accounting_template_account"',
    );
    try {
      await prisma.accountingTemplateAccount.update({
        where: { id: account.id },
        data: { englishName: 'Tampered cash name' },
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "AccountingTemplateAccount" ENABLE TRIGGER "dafter_protect_used_accounting_template_account"',
      );
    }
    await expect(installEgStandardV1(prisma)).rejects.toThrow(
      'differs from immutable reference data',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "AccountingTemplateAccount" DISABLE TRIGGER "dafter_protect_used_accounting_template_account"',
    );
    try {
      await prisma.accountingTemplateAccount.update({
        where: { id: account.id },
        data: { englishName: 'Cash' },
      });
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "AccountingTemplateAccount" ENABLE TRIGGER "dafter_protect_used_accounting_template_account"',
      );
    }
  });
});
