import 'dotenv/config';

import { BadRequestException, ConflictException } from '@nestjs/common';
import { AccountingJournalType, BusinessPartnerType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { BusinessPartnersService } from '../business-partners/business-partners.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { AccountingService } from './accounting.service';

jest.setTimeout(30_000);

describe('B02 GL BusinessPartner validation', () => {
  let prisma: PrismaService;
  let accounting: AccountingService;
  let partners: BusinessPartnersService;
  let companyA: { id: string };
  let companyB: { id: string };
  let ownerA: { id: string };
  let ownerB: { id: string };
  let journalId: string;
  let periodId: string;
  let receivableAccountId: string;
  let payableAccountId: string;
  let cashAccountId: string;
  let customerId: string;
  let supplierId: string;
  let bothId: string;
  let inactiveId: string;
  let otherCompanyPartnerId: string;
  let templateCashAccountId: string;
  let revenueAccountId: string;
  let templateArAccountId: string;
  let templateApAccountId: string;
  let defaultExpenseAccountId: string;
  let assetsAccountId: string;
  let salesJournalId: string;
  let purchaseJournalId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('DATABASE_URL is required for B02 integration tests');
    prisma = new PrismaService();
    await prisma.$connect();
    accounting = new AccountingService(
      prisma,
      new PlatformIdempotencyService(prisma),
    );
    partners = new BusinessPartnersService(prisma);
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    companyA = await prisma.company.create({
      data: { name: `B02 GL A ${stamp}`, currencyCode: 'EGP' },
    });
    companyB = await prisma.company.create({
      data: { name: `B02 GL B ${stamp}`, currencyCode: 'EGP' },
    });
    ownerA = await prisma.user.create({
      data: {
        email: `b02-gl-a-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'GL Owner A',
        companyId: companyA.id,
        role: 'OWNER',
      },
    });
    ownerB = await prisma.user.create({
      data: {
        email: `b02-gl-b-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'GL Owner B',
        companyId: companyB.id,
        role: 'OWNER',
      },
    });
    const initializer = new InitializeCompanyAccounting(
      prisma,
      new PlatformIdempotencyService(prisma),
      new TemplateService(prisma),
    );
    await initializer.execute({
      companyId: companyA.id,
      actorUserId: ownerA.id,
      idempotencyKey: `b02-gl-${stamp}`,
      countryCode: 'EG',
      localeCode: 'ar-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-07-01T00:00:00.000Z'),
      fiscalYearEnd: new Date('2027-06-30T00:00:00.000Z'),
    });
    const journal = await prisma.accountingJournal.findFirstOrThrow({
      where: { companyId: companyA.id, type: AccountingJournalType.GENERAL },
    });
    const period = await prisma.accountingPeriod.findFirstOrThrow({
      where: { companyId: companyA.id, name: '2026-07' },
    });
    journalId = journal.id;
    periodId = period.id;
    templateCashAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: companyA.id, templateKey: 'CASH' },
      })
    ).id;
    revenueAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: companyA.id, templateKey: 'SALES_REVENUE' },
      })
    ).id;
    templateArAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: companyA.id, templateKey: 'AR_CONTROL' },
      })
    ).id;
    templateApAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: companyA.id, templateKey: 'AP_CONTROL' },
      })
    ).id;
    defaultExpenseAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: companyA.id, templateKey: 'DEFAULT_EXPENSE' },
      })
    ).id;
    assetsAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: companyA.id, templateKey: 'ASSETS' },
      })
    ).id;
    salesJournalId = (
      await prisma.accountingJournal.findFirstOrThrow({
        where: { companyId: companyA.id, type: AccountingJournalType.SALES },
      })
    ).id;
    purchaseJournalId = (
      await prisma.accountingJournal.findFirstOrThrow({
        where: { companyId: companyA.id, type: AccountingJournalType.PURCHASE },
      })
    ).id;
    const [receivable, payable, cash] = await Promise.all([
      prisma.accountingAccount.create({
        data: {
          companyId: companyA.id,
          code: `AR-TEST-${stamp}`,
          name: 'Test receivable',
          accountType: 'ASSET_RECEIVABLE',
          allowDirectPosting: true,
          isControlAccount: true,
          reconciliationEligible: true,
          currencyCode: 'EGP',
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: companyA.id,
          code: `AP-TEST-${stamp}`,
          name: 'Test payable',
          accountType: 'LIABILITY_PAYABLE',
          allowDirectPosting: true,
          isControlAccount: true,
          reconciliationEligible: true,
          currencyCode: 'EGP',
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: companyA.id,
          code: `CASH-TEST-${stamp}`,
          name: 'Test cash',
          accountType: 'ASSET_CASH',
          allowDirectPosting: true,
          currencyCode: 'EGP',
        },
      }),
    ]);
    receivableAccountId = receivable.id;
    payableAccountId = payable.id;
    cashAccountId = cash.id;
    customerId = (
      await partners.create(companyA.id, ownerA.id, {
        partnerCode: `GL-CUST-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'GL Customer',
        roles: ['CUSTOMER'],
      })
    ).id;
    supplierId = (
      await partners.create(companyA.id, ownerA.id, {
        partnerCode: `GL-SUP-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'GL Supplier',
        roles: ['SUPPLIER'],
      })
    ).id;
    bothId = (
      await partners.create(companyA.id, ownerA.id, {
        partnerCode: `GL-BOTH-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'GL Both',
        roles: ['CUSTOMER', 'SUPPLIER'],
      })
    ).id;
    inactiveId = (
      await partners.create(companyA.id, ownerA.id, {
        partnerCode: `GL-INACTIVE-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'GL Inactive',
        roles: ['CUSTOMER'],
      })
    ).id;
    await prisma.businessPartner.update({
      where: { id: inactiveId },
      data: { isActive: false },
    });
    otherCompanyPartnerId = (
      await partners.create(companyB.id, ownerB.id, {
        partnerCode: `GL-OTHER-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'Other Company',
        roles: ['CUSTOMER'],
      })
    ).id;
  });

  afterAll(async () => {
    // Posted journal lines are intentionally immutable; the disposable test database is dropped by the test harness.
    await prisma?.$disconnect();
  });

  const post = (
    businessPartnerId: string | undefined,
    accountId: string,
    debit: string,
    credit: string,
    key: string,
  ) =>
    accounting.postManualJournal(companyA.id, ownerA.id, {
      journalId,
      accountingPeriodId: periodId,
      postingDate: '2026-07-01',
      transactionCurrencyCode: 'EGP',
      exchangeRate: '1',
      description: 'B02 counterparty test',
      idempotencyKey: key,
      lines: [
        {
          accountId,
          businessPartnerId,
          transactionDebit: debit,
          transactionCredit: credit,
        },
        {
          accountId: cashAccountId,
          transactionDebit: credit,
          transactionCredit: debit,
        },
      ],
    });

  const postTrusted = (
    businessPartnerId: string | undefined,
    accountId: string,
    debit: string,
    credit: string,
    key: string,
  ) =>
    accounting.postInternal(companyA.id, ownerA.id, {
      journalId,
      accountingPeriodId: periodId,
      postingDate: '2026-07-01',
      transactionCurrencyCode: 'EGP',
      exchangeRate: '1',
      description: 'B02 trusted counterparty test',
      sourceType: 'OPENING_BALANCE',
      sourceId: companyA.id,
      idempotencyKey: key,
      lines: [
        {
          accountId,
          businessPartnerId,
          transactionDebit: debit,
          transactionCredit: credit,
        },
        {
          accountId: cashAccountId,
          transactionDebit: credit,
          transactionCredit: debit,
        },
      ],
    });

  it('accepts customer-only AR, supplier-only AP, and BOTH for both account types', async () => {
    await expect(
      postTrusted(
        customerId,
        receivableAccountId,
        '100',
        '0',
        'gl-customer-ar',
      ),
    ).resolves.toBeDefined();
    await expect(
      postTrusted(supplierId, payableAccountId, '0', '100', 'gl-supplier-ap'),
    ).resolves.toBeDefined();
    await expect(
      postTrusted(bothId, receivableAccountId, '25', '0', 'gl-both-ar'),
    ).resolves.toBeDefined();
    await expect(
      postTrusted(bothId, payableAccountId, '0', '25', 'gl-both-ap'),
    ).resolves.toBeDefined();
  });

  it('rejects wrong roles, inactive partners, and cross-company partners', async () => {
    await expect(
      postTrusted(undefined, receivableAccountId, '10', '0', 'gl-missing-ar'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      postTrusted(undefined, payableAccountId, '0', '10', 'gl-missing-ap'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      postTrusted(supplierId, receivableAccountId, '10', '0', 'gl-wrong-ar'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      postTrusted(customerId, payableAccountId, '0', '10', 'gl-wrong-ap'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      postTrusted(inactiveId, receivableAccountId, '10', '0', 'gl-inactive'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      postTrusted(
        otherCompanyPartnerId,
        receivableAccountId,
        '10',
        '0',
        'gl-cross-company',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts USD through the bootstrapped unconstrained general journal', async () => {
    const entry = await accounting.postManualJournal(companyA.id, ownerA.id, {
      journalId,
      accountingPeriodId: periodId,
      postingDate: '2026-07-01',
      transactionCurrencyCode: 'USD',
      exchangeRate: '50',
      description: 'USD regression gate',
      idempotencyKey: 'gl-usd-regression',
      lines: [
        {
          accountId: templateCashAccountId,
          transactionDebit: '100',
          transactionCredit: '0',
        },
        {
          accountId: revenueAccountId,
          transactionDebit: '0',
          transactionCredit: '100',
        },
      ],
    });
    expect(entry.transactionCurrencyCode).toBe('USD');
    const lines = await prisma.journalLine.findMany({
      where: { journalEntryId: entry.id },
      orderBy: { debit: 'desc' },
    });
    expect(lines[0].transactionDebit.toString()).toBe('100');
    expect(lines[0].debit.toString()).toBe('5000');
    expect(lines[1].transactionCredit.toString()).toBe('100');
    expect(lines[1].credit.toString()).toBe('5000');
  });

  it('supports trusted USD sales and purchase control-account contracts', async () => {
    const sales = await accounting.postInternal(companyA.id, ownerA.id, {
      journalId: salesJournalId,
      accountingPeriodId: periodId,
      postingDate: '2026-07-03',
      transactionCurrencyCode: 'USD',
      exchangeRate: '50',
      description: 'Trusted sales contract',
      sourceType: 'SALES_INVOICE',
      sourceId: customerId,
      idempotencyKey: `trusted-sales-${Date.now()}`,
      lines: [
        {
          accountId: templateArAccountId,
          businessPartnerId: customerId,
          transactionDebit: '100',
          transactionCredit: '0',
        },
        {
          accountId: revenueAccountId,
          transactionDebit: '0',
          transactionCredit: '100',
        },
      ],
    });
    const salesLines = await prisma.journalLine.findMany({
      where: { journalEntryId: sales.id },
      orderBy: { debit: 'desc' },
    });
    expect(salesLines[0]).toEqual(
      expect.objectContaining({
        accountId: templateArAccountId,
        businessPartnerId: customerId,
        transactionDebit: expect.anything(),
        debit: expect.anything(),
      }),
    );
    expect(salesLines[0].transactionDebit.toString()).toBe('100');
    expect(salesLines[0].debit.toString()).toBe('5000');
    expect(salesLines[1].transactionCredit.toString()).toBe('100');
    expect(salesLines[1].credit.toString()).toBe('5000');
    expect(
      salesLines.reduce(
        (sum, line) => sum + Number(line.debit) - Number(line.credit),
        0,
      ),
    ).toBe(0);

    const purchase = await accounting.postInternal(companyA.id, ownerA.id, {
      journalId: purchaseJournalId,
      accountingPeriodId: periodId,
      postingDate: '2026-07-03',
      transactionCurrencyCode: 'USD',
      exchangeRate: '50',
      description: 'Trusted purchase contract',
      sourceType: 'PURCHASE_INVOICE',
      sourceId: supplierId,
      idempotencyKey: `trusted-purchase-${Date.now()}`,
      lines: [
        {
          accountId: defaultExpenseAccountId,
          transactionDebit: '100',
          transactionCredit: '0',
        },
        {
          accountId: templateApAccountId,
          businessPartnerId: supplierId,
          transactionDebit: '0',
          transactionCredit: '100',
        },
      ],
    });
    const purchaseLines = await prisma.journalLine.findMany({
      where: { journalEntryId: purchase.id },
    });
    expect(purchaseLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: templateApAccountId,
          businessPartnerId: supplierId,
          transactionCredit: expect.anything(),
          credit: expect.anything(),
        }),
      ]),
    );
    const payableLine = purchaseLines.find(
      (line) => line.accountId === templateApAccountId,
    )!;
    expect(payableLine.transactionCredit.toString()).toBe('100');
    expect(payableLine.credit.toString()).toBe('5000');
  });

  it('rejects generic manual journals on real AR and AP control accounts', async () => {
    await expect(
      post(customerId, receivableAccountId, '10', '0', 'manual-custom-ar'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      post(supplierId, payableAccountId, '0', '10', 'manual-custom-ap'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      post(customerId, templateArAccountId, '10', '0', 'manual-real-ar'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      post(supplierId, templateApAccountId, '0', '10', 'manual-real-ap'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects group accounts for every application source type', async () => {
    await expect(
      post(undefined, assetsAccountId, '10', '0', 'group-manual'),
    ).rejects.toThrow('does not allow direct posting');
    await expect(
      accounting.postInternal(companyA.id, ownerA.id, {
        journalId,
        accountingPeriodId: periodId,
        postingDate: '2026-07-04',
        transactionCurrencyCode: 'EGP',
        exchangeRate: '1',
        description: 'Group opening rejection',
        sourceType: 'OPENING_BALANCE',
        sourceId: customerId,
        idempotencyKey: 'group-opening',
        lines: [
          {
            accountId: assetsAccountId,
            transactionDebit: '10',
            transactionCredit: '0',
          },
          {
            accountId: templateCashAccountId,
            transactionDebit: '0',
            transactionCredit: '10',
          },
        ],
      }),
    ).rejects.toThrow('does not allow direct posting');
    await expect(
      accounting.postInternal(companyA.id, ownerA.id, {
        journalId: salesJournalId,
        accountingPeriodId: periodId,
        postingDate: '2026-07-04',
        transactionCurrencyCode: 'USD',
        exchangeRate: '50',
        description: 'Group trusted rejection',
        sourceType: 'SALES_INVOICE',
        sourceId: customerId,
        idempotencyKey: 'group-trusted',
        lines: [
          {
            accountId: assetsAccountId,
            transactionDebit: '10',
            transactionCredit: '0',
          },
          {
            accountId: revenueAccountId,
            transactionDebit: '0',
            transactionCredit: '10',
          },
        ],
      }),
    ).rejects.toThrow('does not allow direct posting');
  });

  it('blocks inactive and non-postable accounts at the database POSTED boundary', async () => {
    const inactive = await prisma.accountingAccount.create({
      data: {
        companyId: companyA.id,
        code: `INACTIVE-${Date.now()}`,
        name: 'Inactive posting test',
        accountType: 'EXPENSE_OPERATING',
        isActive: false,
      },
    });
    const createDraftEntry = async (accountId: string, suffix: string) => {
      const entry = await prisma.journalEntry.create({
        data: {
          companyId: companyA.id,
          journalId,
          accountingPeriodId: periodId,
          entryNumber: `B02-POST-${Date.now()}-${suffix}`,
          postingDate: new Date('2026-07-05T00:00:00.000Z'),
          transactionCurrencyCode: 'EGP',
          exchangeRate: '1',
          description: 'Database postability guard',
          sourceType: 'MANUAL_JOURNAL',
          idempotencyKey: `b02-db-postability-${Date.now()}-${suffix}`,
          requestHash: 'c'.repeat(64),
          postedAt: new Date('2026-07-05T00:00:00.000Z'),
          postedById: ownerA.id,
          lines: {
            create: [
              {
                sequence: 1,
                accountId,
                debit: '10',
                credit: '0',
                transactionDebit: '10',
                transactionCredit: '0',
              },
              {
                sequence: 2,
                accountId: cashAccountId,
                debit: '0',
                credit: '10',
                transactionDebit: '0',
                transactionCredit: '10',
              },
            ],
          },
        },
      });
      await expect(
        prisma.journalEntry.update({
          where: { id: entry.id },
          data: { status: 'POSTED' },
        }),
      ).rejects.toThrow();
      await prisma.journalLine.deleteMany({
        where: { journalEntryId: entry.id },
      });
      await prisma.journalEntry.delete({ where: { id: entry.id } });
    };
    await createDraftEntry(assetsAccountId, 'group');
    await createDraftEntry(inactive.id, 'inactive');
  });

  it('keeps role removal and posting race-safe', async () => {
    const stamp = Date.now();
    const partner = await partners.create(companyA.id, ownerA.id, {
      partnerCode: `GL-RACE-${stamp}`,
      partnerType: BusinessPartnerType.ORGANIZATION,
      displayName: 'GL Race Customer',
      roles: ['CUSTOMER'],
    });
    const results = await Promise.allSettled([
      postTrusted(
        partner.id,
        receivableAccountId,
        '11',
        '0',
        `gl-race-post-${stamp}`,
      ),
      partners.removeCustomerProfile(companyA.id, ownerA.id, partner.id),
    ]);
    const posted = await prisma.journalEntry.findFirst({
      where: {
        companyId: companyA.id,
        idempotencyKey: `gl-race-post-${stamp}`,
        status: 'POSTED',
      },
    });
    if (posted) {
      await expect(
        partners.removeCustomerProfile(companyA.id, ownerA.id, partner.id),
      ).rejects.toThrow();
      await expect(
        prisma.customerProfile.findUniqueOrThrow({
          where: { businessPartnerId: partner.id },
        }),
      ).resolves.toEqual(expect.objectContaining({ isActive: true }));
    } else {
      expect(results.some((result) => result.status === 'rejected')).toBe(true);
    }
  });

  it('rejects a direct database transition to POSTED without an AR partner', async () => {
    const entry = await prisma.journalEntry.create({
      data: {
        companyId: companyA.id,
        journalId,
        accountingPeriodId: periodId,
        entryNumber: `B02-DB-AR-${Date.now()}`,
        postingDate: new Date('2026-07-01T00:00:00.000Z'),
        transactionCurrencyCode: 'EGP',
        exchangeRate: '1',
        description: 'Database trigger counterparty guard',
        sourceType: 'MANUAL_JOURNAL',
        idempotencyKey: `b02-db-ar-${Date.now()}`,
        requestHash: 'b'.repeat(64),
        postedAt: new Date('2026-07-01T00:00:00.000Z'),
        postedById: ownerA.id,
        lines: {
          create: [
            {
              sequence: 1,
              accountId: receivableAccountId,
              debit: '10',
              credit: '0',
              transactionDebit: '10',
              transactionCredit: '0',
            },
            {
              sequence: 2,
              accountId: cashAccountId,
              debit: '0',
              credit: '10',
              transactionDebit: '0',
              transactionCredit: '10',
            },
          ],
        },
      },
    });
    await expect(
      prisma.journalEntry.update({
        where: { id: entry.id },
        data: { status: 'POSTED' },
      }),
    ).rejects.toThrow('Manual journals cannot post');
    await prisma.journalLine.deleteMany({
      where: { journalEntryId: entry.id },
    });
    await prisma.journalEntry.delete({ where: { id: entry.id } });
  });
});
