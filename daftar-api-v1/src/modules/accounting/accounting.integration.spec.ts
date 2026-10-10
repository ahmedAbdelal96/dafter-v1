import 'dotenv/config';

import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  AccountingAccountType,
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  AccountingPeriodStatus,
  JournalEntryStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from './accounting.service';

jest.setTimeout(60_000);

type Fixture = {
  companyId: string;
  actorUserId: string;
  fiscalYearId: string;
  periodId: string;
  controlPeriodId: string;
  journalId: string;
  cashAccountId: string;
  incomeAccountId: string;
  receivableAccountId: string;
};

describe('Accounting B01.1 PostgreSQL integration', () => {
  let prisma: PrismaService;
  let service: AccountingService;
  let fixture: Fixture;
  const companyIds: string[] = [];
  const userIds: string[] = [];

  const unique = (label: string) =>
    `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const manualPosting = (overrides: Record<string, unknown> = {}) => ({
    journalId: fixture.journalId,
    accountingPeriodId: fixture.periodId,
    postingDate: '2026-01-15',
    transactionCurrencyCode: 'EGP',
    exchangeRate: '1',
    description: 'Integration posting',
    idempotencyKey: unique('manual'),
    lines: [
      {
        accountId: fixture.cashAccountId,
        transactionDebit: '100.10',
        transactionCredit: '0',
      },
      {
        accountId: fixture.incomeAccountId,
        transactionDebit: '0',
        transactionCredit: '100.10',
      },
    ],
    ...overrides,
  });

  const expectHttpConflict = async (promise: Promise<unknown>) => {
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
  };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is required for accounting integration tests',
      );
    }

    prisma = new PrismaService();
    await prisma.$connect();
    service = new AccountingService(
      prisma,
      new PlatformIdempotencyService(prisma),
    );

    const company = (await prisma.company.create({
      data: { name: unique('B011 integration company'), currencyCode: 'EGP' },
    })) as { id: string };
    companyIds.push(company.id);
    const actor = (await prisma.user.create({
      data: {
        email: `${unique('b011-owner')}@example.local`,
        passwordHash: 'integration-only',
        fullName: 'B01.1 Integration Owner',
        role: UserRole.OWNER,
        companyId: company.id,
      },
    })) as { id: string };
    userIds.push(actor.id);

    await service.updateConfiguration(company.id, actor.id, {
      baseCurrencyCode: 'EGP',
      reportingCurrencyCode: 'USD',
      countryCode: 'EG',
      localeCode: 'en-EG',
    });
    const cash = (await service.createAccount(company.id, actor.id, {
      code: '1000',
      name: 'Cash',
      accountType: AccountingAccountType.ASSET_CASH,
    })) as { id: string };
    const income = (await service.createAccount(company.id, actor.id, {
      code: '4000',
      name: 'Income',
      accountType: AccountingAccountType.INCOME_OPERATING_REVENUE,
    })) as { id: string };
    const receivable = (await service.createAccount(company.id, actor.id, {
      code: '1100',
      name: 'Receivables',
      accountType: AccountingAccountType.ASSET_RECEIVABLE,
      isControlAccount: true,
      reconciliationEligible: true,
    })) as { id: string };
    const journal = (await service.createJournal(company.id, actor.id, {
      code: 'GEN',
      name: 'General',
      type: AccountingJournalType.GENERAL,
    })) as { id: string };
    const fiscalYear = (await service.createFiscalYear(company.id, actor.id, {
      name: 'FY 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    })) as { id: string };
    const period = (await service.createPeriod(company.id, actor.id, {
      fiscalYearId: fiscalYear.id,
      name: 'January 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    })) as { id: string };
    const controlPeriod = (await service.createPeriod(company.id, actor.id, {
      fiscalYearId: fiscalYear.id,
      name: 'February 2026',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    })) as { id: string };

    fixture = {
      companyId: company.id,
      actorUserId: actor.id,
      fiscalYearId: fiscalYear.id,
      periodId: period.id,
      controlPeriodId: controlPeriod.id,
      journalId: journal.id,
      cashAccountId: cash.id,
      incomeAccountId: income.id,
      receivableAccountId: receivable.id,
    };
  });

  afterAll(async () => {
    for (const companyId of companyIds) {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "JournalLine" DISABLE TRIGGER "accounting_protect_posted_line_trigger"',
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "JournalEntry" DISABLE TRIGGER "accounting_protect_posted_entry_trigger"',
      );
      await prisma.idempotencyRecord.deleteMany({ where: { companyId } });
      await prisma.journalLine.deleteMany({ where: { companyId } });
      await prisma.journalEntry.deleteMany({ where: { companyId } });
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.accountingConfigurationAccount.deleteMany({
        where: { companyId },
      });
      await prisma.accountingConfigurationJournal.deleteMany({
        where: { companyId },
      });
      await prisma.accountingConfiguration.deleteMany({ where: { companyId } });
      await prisma.accountingEntrySequence.deleteMany({ where: { companyId } });
      await prisma.accountingPeriod.deleteMany({ where: { companyId } });
      await prisma.fiscalYear.deleteMany({ where: { companyId } });
      await prisma.accountingJournal.deleteMany({ where: { companyId } });
      await prisma.accountingAccount.deleteMany({ where: { companyId } });
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "JournalEntry" ENABLE TRIGGER "accounting_protect_posted_entry_trigger"',
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "JournalLine" ENABLE TRIGGER "accounting_protect_posted_line_trigger"',
      );
    }
    for (const userId of userIds) {
      await prisma.user.delete({ where: { id: userId } });
    }
    for (const companyId of companyIds) {
      await prisma.company.delete({ where: { id: companyId } });
    }
    await prisma.onModuleDestroy();
  });

  it('posts balanced multi-currency lines with centrally derived company amounts', async () => {
    const entry = await service.postManualJournal(
      fixture.companyId,
      fixture.actorUserId,
      {
        ...manualPosting({
          transactionCurrencyCode: 'USD',
          exchangeRate: '50',
          lines: [
            {
              accountId: fixture.cashAccountId,
              transactionDebit: '100.00',
              transactionCredit: '0',
            },
            {
              accountId: fixture.incomeAccountId,
              transactionDebit: '0',
              transactionCredit: '100.00',
            },
          ],
        }),
      } as never,
    );

    expect(entry.sourceType).toBe('MANUAL_JOURNAL');
    expect(entry.lines).toHaveLength(2);
    expect(entry.lines[0].debit).toBe('5000.0000');
    expect(entry.lines[1].credit).toBe('5000.0000');
    expect(entry.lines[0].transactionDebit).toBe('100.0000');

    const audit = await prisma.auditLog.findFirst({
      where: {
        companyId: fixture.companyId,
        action: 'accounting.journal.posted',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects unbalanced, zero, both-sided, and over-precise transaction lines', async () => {
    await expect(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          lines: [
            {
              accountId: fixture.cashAccountId,
              transactionDebit: '10',
              transactionCredit: '0',
            },
            {
              accountId: fixture.incomeAccountId,
              transactionDebit: '0',
              transactionCredit: '9',
            },
          ],
        }) as never,
      ),
    ).rejects.toThrow('not balanced');

    await expect(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          lines: [
            {
              accountId: fixture.cashAccountId,
              transactionDebit: '0',
              transactionCredit: '0',
            },
            {
              accountId: fixture.incomeAccountId,
              transactionDebit: '1',
              transactionCredit: '1',
            },
          ],
        }) as never,
      ),
    ).rejects.toThrow('must contain a debit or credit');

    await expect(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          lines: [
            {
              accountId: fixture.cashAccountId,
              transactionDebit: '1',
              transactionCredit: '1',
            },
            {
              accountId: fixture.incomeAccountId,
              transactionDebit: '0',
              transactionCredit: '2',
            },
          ],
        }) as never,
      ),
    ).rejects.toThrow('both debit and credit');

    await expect(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          lines: [
            {
              accountId: fixture.cashAccountId,
              transactionDebit: '1.001',
              transactionCredit: '0',
            },
            {
              accountId: fixture.incomeAccountId,
              transactionDebit: '0',
              transactionCredit: '1.001',
            },
          ],
        }) as never,
      ),
    ).rejects.toThrow('at most 2 decimal places');
  });

  it('enforces tenant isolation, periods, and controlled soft-close overrides', async () => {
    const otherCompany = (await prisma.company.create({
      data: { name: unique('B011 tenant'), currencyCode: 'EGP' },
    })) as { id: string };
    companyIds.push(otherCompany.id);
    const otherAccount = (await prisma.accountingAccount.create({
      data: {
        companyId: otherCompany.id,
        code: '1000',
        name: 'Other Cash',
        accountType: AccountingAccountType.ASSET_CASH,
      },
    })) as { id: string };
    await expect(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          lines: [
            {
              accountId: otherAccount.id,
              transactionDebit: '1',
              transactionCredit: '0',
            },
            {
              accountId: fixture.incomeAccountId,
              transactionDebit: '0',
              transactionCredit: '1',
            },
          ],
        }) as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await service.changePeriodStatus(
      fixture.companyId,
      fixture.actorUserId,
      fixture.controlPeriodId,
      {
        status: AccountingPeriodStatus.SOFT_CLOSED,
      },
    );
    await expectHttpConflict(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          accountingPeriodId: fixture.controlPeriodId,
          postingDate: '2026-02-15',
        }),
      ) as never,
    );
    const overridden = await service.postManualJournal(
      fixture.companyId,
      fixture.actorUserId,
      manualPosting({
        accountingPeriodId: fixture.controlPeriodId,
        postingDate: '2026-02-15',
        periodOverrideReason: 'Month-end correction approved by owner',
      }) as never,
    );
    expect(overridden.status).toBe('POSTED');
    expect(
      await prisma.auditLog.count({
        where: {
          companyId: fixture.companyId,
          action: 'accounting.period.soft_close_override',
        },
      }),
    ).toBeGreaterThan(0);

    await service.changePeriodStatus(
      fixture.companyId,
      fixture.actorUserId,
      fixture.controlPeriodId,
      {
        status: AccountingPeriodStatus.CLOSED,
      },
    );
    await expectHttpConflict(
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        manualPosting({
          accountingPeriodId: fixture.controlPeriodId,
          postingDate: '2026-02-15',
          periodOverrideReason: 'This must never bypass CLOSED',
        }) as never,
      ),
    );
  });

  it('replays sequential idempotency and prevents duplicate concurrent posting', async () => {
    const idempotencyKey = unique('same-key');
    const command = manualPosting({ idempotencyKey });
    const first = await service.postManualJournal(
      fixture.companyId,
      fixture.actorUserId,
      command as never,
    );
    const replay = await service.postManualJournal(
      fixture.companyId,
      fixture.actorUserId,
      command as never,
    );
    expect(replay.id).toBe(first.id);

    const concurrentKey = unique('concurrent');
    const concurrent = manualPosting({ idempotencyKey: concurrentKey });
    const results = await Promise.allSettled([
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        concurrent as never,
      ),
      service.postManualJournal(
        fixture.companyId,
        fixture.actorUserId,
        concurrent as never,
      ),
    ]);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    expect(
      (results[0] as PromiseFulfilledResult<{ id: string }>).value.id,
    ).toBe((results[1] as PromiseFulfilledResult<{ id: string }>).value.id);
    expect(
      await prisma.journalEntry.count({
        where: { companyId: fixture.companyId, idempotencyKey: concurrentKey },
      }),
    ).toBe(1);
  });

  it('allocates unique journal numbers under concurrent posting', async () => {
    const results = (await Promise.all(
      Array.from({ length: 4 }, () =>
        service.postManualJournal(
          fixture.companyId,
          fixture.actorUserId,
          manualPosting(),
        ),
      ),
    )) as Array<{ entryNumber: string }>;
    expect(new Set(results.map((entry) => entry.entryNumber)).size).toBe(4);
  });

  it('enforces database-level posted invariants and immutability', async () => {
    const entry = await service.postManualJournal(
      fixture.companyId,
      fixture.actorUserId,
      manualPosting(),
    );
    await expect(
      prisma.journalEntry.update({
        where: { id: entry.id },
        data: { description: 'tampered' },
      }),
    ).rejects.toThrow('immutable');

    const line = await prisma.journalLine.findFirstOrThrow({
      where: { journalEntryId: entry.id },
    });
    await expect(
      prisma.journalLine.update({
        where: { id: line.id },
        data: { debit: new Prisma.Decimal(9) },
      }),
    ).rejects.toThrow('immutable');
    await expect(
      prisma.journalEntry.delete({ where: { id: entry.id } }),
    ).rejects.toThrow('cannot be deleted');

    const draft = await prisma.journalEntry.create({
      data: {
        companyId: fixture.companyId,
        journalId: fixture.journalId,
        accountingPeriodId: fixture.periodId,
        entryNumber: `DRAFT-${unique('trigger')}`,
        postingDate: new Date('2026-01-15'),
        transactionCurrencyCode: 'EGP',
        exchangeRate: new Prisma.Decimal(1),
        description: 'Trigger balance test',
        sourceType: 'MANUAL_JOURNAL',
        idempotencyKey: unique('draft'),
        requestHash:
          '0000000000000000000000000000000000000000000000000000000000000000',
      },
    });
    await prisma.journalLine.createMany({
      data: [
        {
          companyId: fixture.companyId,
          journalEntryId: draft.id,
          accountId: fixture.cashAccountId,
          debit: new Prisma.Decimal(10),
          credit: new Prisma.Decimal(0),
          transactionDebit: new Prisma.Decimal(10),
          transactionCredit: new Prisma.Decimal(0),
        },
        {
          companyId: fixture.companyId,
          journalEntryId: draft.id,
          accountId: fixture.incomeAccountId,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(9),
          transactionDebit: new Prisma.Decimal(0),
          transactionCredit: new Prisma.Decimal(9),
        },
      ],
    });
    await expect(
      prisma.journalEntry.update({
        where: { id: draft.id },
        data: {
          status: JournalEntryStatus.POSTED,
          postedAt: new Date(),
          postedById: fixture.actorUserId,
        },
      }),
    ).rejects.toThrow('balanced');
    await prisma.journalLine.deleteMany({
      where: { journalEntryId: draft.id },
    });
    await prisma.journalEntry.delete({ where: { id: draft.id } });
  });

  it('protects reversal integrity and maps concurrent reversal conflicts', async () => {
    const original = await service.postManualJournal(
      fixture.companyId,
      fixture.actorUserId,
      manualPosting(),
    );
    const originalId = String(original.id);
    const reverse = (key: string) =>
      service.reverse(fixture.companyId, fixture.actorUserId, originalId, {
        accountingPeriodId: fixture.periodId,
        postingDate: '2026-01-15',
        reason: 'Integration reversal',
        idempotencyKey: key,
      });

    const results = await Promise.allSettled([
      reverse(unique('reverse')),
      reverse(unique('reverse')),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const reversal = await prisma.journalEntry.findFirstOrThrow({
      where: { companyId: fixture.companyId, reversalOfEntryId: originalId },
    });
    expect(reversal.sourceType).toBe('REVERSAL');
    expect(
      await prisma.journalEntry.count({
        where: { companyId: fixture.companyId, reversalOfEntryId: originalId },
      }),
    ).toBe(1);
    expect(
      await prisma.journalEntry.findUniqueOrThrow({
        where: { id: originalId },
      }),
    ).toMatchObject({ status: JournalEntryStatus.REVERSED });
  });

  it('locks currencies after posted use and validates typed default mappings', async () => {
    await expect(
      service.setDefaultAccount(fixture.companyId, fixture.actorUserId, {
        settingKey: AccountingConfigAccountKey.RECEIVABLE,
        accountId: fixture.cashAccountId,
        reason: 'Wrong semantic type',
      }),
    ).rejects.toThrow('not compatible');
    await service.setDefaultAccount(fixture.companyId, fixture.actorUserId, {
      settingKey: AccountingConfigAccountKey.RECEIVABLE,
      accountId: fixture.receivableAccountId,
      reason: 'Configure receivables',
    });
    await expect(
      service.setDefaultJournal(fixture.companyId, fixture.actorUserId, {
        settingKey: AccountingConfigJournalKey.GENERAL,
        journalId: fixture.journalId,
        reason: 'Configure general journal',
      }),
    ).resolves.toBeDefined();

    await expect(
      service.updateAccount(
        fixture.companyId,
        fixture.actorUserId,
        fixture.cashAccountId,
        {
          currencyCode: 'USD',
          reason: 'Attempt after posting',
        },
      ),
    ).rejects.toThrow('cannot change after posted history');
    await expect(
      service.updateJournal(
        fixture.companyId,
        fixture.actorUserId,
        fixture.journalId,
        {
          currencyCode: 'USD',
          reason: 'Attempt after posting',
        },
      ),
    ).rejects.toThrow('cannot change after posted history');
    await expect(
      service.updateConfiguration(fixture.companyId, fixture.actorUserId, {
        baseCurrencyCode: 'USD',
        reportingCurrencyCode: 'EGP',
        countryCode: 'EG',
        localeCode: 'en-EG',
      }),
    ).rejects.toThrow('cannot change after posted');

    await expect(
      prisma.company.update({
        where: { id: fixture.companyId },
        data: { currencyCode: 'USD' },
      }),
    ).rejects.toThrow('cannot change after posted accounting history');
  });
});
