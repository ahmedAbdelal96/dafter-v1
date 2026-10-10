import 'dotenv/config';

import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AccountingAccountType,
  BusinessPartnerType,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { SalesPricingService } from './sales-pricing.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';
import { SalesInvoiceService } from './sales-invoice.service';
import { SalesCreditNoteService } from './sales-credit-note.service';
import { BusinessPartnersService } from '../business-partners/business-partners.service';
import { OpeningBalancesService } from '../opening-balances/opening-balances.service';

jest.setTimeout(60_000);

describe('SalesInvoice posting', () => {
  let prisma: PrismaService;
  let accounting: AccountingService;
  let readiness: AccountingReadinessService;
  let sales: SalesInvoiceService;
  let creditNotes: SalesCreditNoteService;
  let companyId: string;
  let ownerId: string;
  let customerId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });

    const stamp = Date.now();
    const company = await prisma.company.create({
      data: { name: `B03 Posting ${stamp}`, currencyCode: 'EGP' },
    });
    companyId = company.id;
    const owner = await prisma.user.create({
      data: {
        email: `b03-posting-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Posting Owner',
        companyId,
        role: 'OWNER',
      },
    });
    ownerId = owner.id;
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `PC-${stamp}`,
        displayName: 'Posting Customer',
        partnerType: 'ORGANIZATION',
      },
    });
    await prisma.customerProfile.create({
      data: { businessPartnerId: partner.id, companyId, creditLimit: '250' },
    });
    customerId = partner.id;

    accounting = new AccountingService(
      prisma,
      new PlatformIdempotencyService(prisma),
    );
    readiness = new AccountingReadinessService(prisma);
    const initializer = new InitializeCompanyAccounting(
      prisma,
      new PlatformIdempotencyService(prisma),
      new TemplateService(prisma),
    );
    const bootstrap = await initializer.execute({
      companyId,
      actorUserId: ownerId,
      idempotencyKey: `b032-posting-${stamp}`,
      countryCode: 'EG',
      localeCode: 'en-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-01-01'),
      fiscalYearEnd: new Date('2026-12-31'),
    });
    expect(bootstrap.status).toBe('READY');
    expect(
      (await readiness.evaluate(companyId, new Date('2026-10-10'))).ready,
    ).toBe(true);
    sales = new SalesInvoiceService(
      prisma,
      new SalesPricingService(),
      new SalesTaxCalculatorService(),
      accounting,
      readiness,
    );
    creditNotes = new SalesCreditNoteService(
      prisma,
      new SalesTaxCalculatorService(),
      accounting,
      readiness,
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('posts exactly once through the accounting engine and allocates a fiscal-year number', async () => {
    const legacyLedgerBefore = await prisma.ledgerEntry.count({
      where: { companyId },
    });
    const legacyBalancesBefore = await prisma.balance.count({
      where: { companyId },
    });
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Consulting',
          quantity: '2',
          unitPrice: '100',
          discountValue: '0',
        },
      ],
    });

    const posted = await sales.postDraft(companyId, ownerId, draft.id);
    expect(posted.status).toBe('POSTED');
    expect(posted.invoiceNumber).toBe('SI-2026-000001');
    expect(posted.journalEntryId).toBeTruthy();
    const entry = await prisma.journalEntry.findFirstOrThrow({
      where: { id: posted.journalEntryId!, companyId },
      include: { lines: true },
    });
    expect(entry.sourceType).toBe(JournalSourceType.SALES_INVOICE);
    expect(entry.sourceId).toBe(draft.id);
    expect(entry.status).toBe('POSTED');
    expect(entry.lines).toHaveLength(2);
    expect(await prisma.ledgerEntry.count({ where: { companyId } })).toBe(
      legacyLedgerBefore,
    );
    expect(await prisma.balance.count({ where: { companyId } })).toBe(
      legacyBalancesBefore,
    );
    expect(
      entry.lines
        .reduce((sum, line) => sum.add(line.debit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('200.00');
    expect(
      entry.lines
        .reduce((sum, line) => sum.add(line.credit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('200.00');

    const replay = await sales.postDraft(companyId, ownerId, draft.id);
    expect(replay.id).toBe(posted.id);
    expect(
      await prisma.journalEntry.count({
        where: { companyId, sourceId: draft.id },
      }),
    ).toBe(1);
  });

  it('creates one AR open item per payment maturity and preserves the exact total', async () => {
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `SPLIT-${stamp}`,
        displayName: 'Split Term Customer',
        legalName: 'Split Term Customer',
        isActive: true,
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const term = await prisma.paymentTerm.create({
      data: {
        companyId,
        code: `HALF-${stamp}`,
        name: '50/50 Net 30',
        lines: {
          create: [
            {
              sequence: 1,
              calculationType: 'PERCENT',
              percentage: '50',
              dueDays: 0,
            },
            {
              sequence: 2,
              calculationType: 'PERCENT',
              percentage: '50',
              dueDays: 30,
            },
          ],
        },
      },
    });
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: partner.id,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId: term.id,
      lines: [
        {
          description: 'Split maturity service',
          quantity: '1',
          unitPrice: '100',
          discountValue: '0',
        },
      ],
    });
    const posted = await sales.postDraft(companyId, ownerId, draft.id, {
      postingDate: new Date('2026-10-11'),
      idempotencyKey: `split-${stamp}`,
    });
    const arLines = await prisma.journalLine.findMany({
      where: {
        journalEntryId: posted.journalEntryId!,
        businessPartnerId: partner.id,
      },
      orderBy: { dueDate: 'asc' },
    });
    expect(arLines).toHaveLength(2);
    expect(arLines.map((line) => line.transactionDebit.toFixed(2))).toEqual([
      '50.00',
      '50.00',
    ]);
    expect(arLines[0].dueDate?.toISOString().slice(0, 10)).toBe('2026-10-10');
    expect(arLines[1].dueDate?.toISOString().slice(0, 10)).toBe('2026-11-09');
    expect(
      arLines
        .reduce((sum, line) => sum.add(line.debit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('100.00');
  });

  it('balances multi-line taxable foreign-currency invoices after bounded conversion rounding', async () => {
    await prisma.currency.upsert({
      where: { code: 'USD' },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: { code: 'USD', name: 'US Dollar', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `FX-${stamp}`,
        displayName: 'Foreign Currency Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const treatment = await prisma.taxTreatment.create({
      data: {
        companyId,
        code: `FX-VAT-${stamp}`,
        normalizedCode: `FX-VAT-${stamp}`,
        name: 'FX VAT',
        category: 'STANDARD',
        calculationMode: 'TAX_EXCLUSIVE',
      },
    });
    const rate = await prisma.taxRate.create({
      data: {
        companyId,
        treatmentId: treatment.id,
        code: `FX-VAT14-${stamp}`,
        normalizedCode: `FX-VAT14-${stamp}`,
        name: 'FX VAT 14%',
        percentage: '14',
      },
    });
    await prisma.taxDefaultPolicy.create({
      data: {
        companyId,
        defaultRateId: rate.id,
        defaultTreatmentId: treatment.id,
        defaultCalculationMode: 'TAX_EXCLUSIVE',
      },
    });
    await prisma.taxModuleApplicabilityRule.create({
      data: {
        companyId,
        moduleKey: 'SALES',
        isEnabled: true,
        defaultRateId: rate.id,
        defaultTreatmentId: treatment.id,
      },
    });
    const term = await prisma.paymentTerm.create({
      data: {
        companyId,
        code: `THREE-${stamp}`,
        name: 'Three-stage term',
        lines: {
          create: [
            {
              sequence: 1,
              calculationType: 'PERCENT',
              percentage: '34',
              dueDays: 0,
            },
            {
              sequence: 2,
              calculationType: 'PERCENT',
              percentage: '33',
              dueDays: 30,
            },
            {
              sequence: 3,
              calculationType: 'PERCENT',
              percentage: '33',
              dueDays: 60,
            },
          ],
        },
      },
    });
    try {
      const draft = await sales.createDraft(companyId, ownerId, {
        businessPartnerId: partner.id,
        documentDate: new Date('2026-10-20'),
        currencyCode: 'USD',
        exchangeRate: '33.33333333',
        paymentTermId: term.id,
        lines: [
          {
            description: 'FX service A',
            quantity: '1',
            unitPrice: '40',
            discountValue: '0',
          },
          {
            description: 'FX service B',
            quantity: '1',
            unitPrice: '60',
            discountValue: '0',
          },
        ],
      });
      expect(draft.grandTotal.toFixed(2)).toBe('114.00');
      const posted = await sales.postDraft(companyId, ownerId, draft.id, {
        postingDate: new Date('2026-10-20'),
        idempotencyKey: `fx-${stamp}`,
      });
      const lines = await prisma.journalLine.findMany({
        where: { journalEntryId: posted.journalEntryId! },
        orderBy: { createdAt: 'asc' },
      });
      expect(
        lines.filter((line) => line.businessPartnerId === partner.id),
      ).toHaveLength(3);
      expect(
        lines
          .reduce(
            (sum, line) => sum.add(line.transactionDebit),
            new Prisma.Decimal(0),
          )
          .toFixed(2),
      ).toBe('114.00');
      expect(
        lines
          .reduce(
            (sum, line) => sum.add(line.transactionCredit),
            new Prisma.Decimal(0),
          )
          .toFixed(2),
      ).toBe('114.00');
      expect(
        lines
          .reduce((sum, line) => sum.add(line.debit), new Prisma.Decimal(0))
          .eq(
            lines.reduce(
              (sum, line) => sum.add(line.credit),
              new Prisma.Decimal(0),
            ),
          ),
      ).toBe(true);
      expect(posted.grandTotal.toFixed(2)).toBe('114.00');
    } finally {
      await prisma.taxModuleApplicabilityRule.deleteMany({
        where: { companyId, moduleKey: 'SALES' },
      });
      await prisma.taxDefaultPolicy.deleteMany({ where: { companyId } });
      await prisma.taxRate.deleteMany({ where: { id: rate.id } });
      await prisma.taxTreatment.deleteMany({ where: { id: treatment.id } });
    }
  });

  it('serializes concurrent post requests into one number and one journal entry', async () => {
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `RACE-${stamp}`,
        displayName: 'Race Customer',
        legalName: 'Race Customer',
        isActive: true,
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: partner.id,
      documentDate: new Date('2026-10-13'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Concurrent service',
          quantity: '1',
          unitPrice: '25',
          discountValue: '0',
        },
      ],
    });
    const results = await Promise.all([
      sales.postDraft(companyId, ownerId, draft.id, {
        postingDate: new Date('2026-10-13'),
        idempotencyKey: `race-${stamp}`,
      }),
      sales.postDraft(companyId, ownerId, draft.id, {
        postingDate: new Date('2026-10-13'),
        idempotencyKey: `race-${stamp}`,
      }),
    ]);
    expect(results[0].invoiceNumber).toBe(results[1].invoiceNumber);
    expect(
      await prisma.journalEntry.count({
        where: { companyId, sourceId: draft.id },
      }),
    ).toBe(1);
  });

  it('blocks posting when the projected receivable exceeds the active customer credit limit', async () => {
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-11'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Large service',
          quantity: '1',
          unitPrice: '100',
          discountValue: '0',
        },
      ],
    });
    await expect(sales.postDraft(companyId, ownerId, draft.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('measures multi-currency credit exposure in base currency across opening balance and credit notes', async () => {
    const stamp = Date.now();
    await prisma.currency.upsert({
      where: { code: 'USD' },
      update: { isActive: true, minorUnitPrecision: 2 },
      create: { code: 'USD', name: 'US Dollar', minorUnitPrecision: 2 },
    });
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `FX-LIMIT-${stamp}`,
        displayName: 'Multi-currency Credit Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: { creditLimit: '5100' } },
      },
    });
    const receivableMapping =
      await prisma.accountingConfigurationAccount.findFirstOrThrow({
        where: { companyId, settingKey: 'RECEIVABLE' },
      });
    const openingEquity = await prisma.accountingAccount.findFirstOrThrow({
      where: { companyId, templateKey: 'OPENING_BALANCE_EQUITY' },
    });
    const period = await prisma.accountingPeriod.findFirstOrThrow({
      where: {
        companyId,
        startDate: { lte: new Date('2026-10-01') },
        endDate: { gte: new Date('2026-10-01') },
      },
    });
    const opening = new OpeningBalancesService(
      prisma,
      accounting,
      new PlatformIdempotencyService(prisma),
    );
    const openingDraft = await opening.createDraft({
      companyId,
      actorUserId: ownerId,
      idempotencyKey: `fx-limit-opening-${stamp}`,
      effectiveDate: new Date('2026-10-01'),
      accountingPeriodId: period.id,
      description: 'Multi-currency credit-limit opening balance',
      lines: [
        {
          accountId: receivableMapping.accountId,
          debit: '500',
          credit: '0',
          businessPartnerId: partner.id,
        },
        { accountId: openingEquity.id, debit: '0', credit: '500' },
      ],
    });
    await opening.validate(companyId, ownerId, openingDraft.id);
    await opening.post(
      companyId,
      ownerId,
      openingDraft.id,
      `fx-limit-opening-post-${stamp}`,
    );

    const postInvoice = async (
      currencyCode: string,
      exchangeRate: string,
      date: string,
      key: string,
    ) => {
      const draft = await sales.createDraft(companyId, ownerId, {
        businessPartnerId: partner.id,
        documentDate: new Date(date),
        currencyCode,
        exchangeRate,
        lines: [
          {
            description: `Credit exposure ${currencyCode}`,
            quantity: '1',
            unitPrice: '100',
            discountValue: '0',
          },
        ],
      });
      return sales.postDraft(companyId, ownerId, draft.id, {
        postingDate: new Date(date),
        idempotencyKey: key,
      });
    };
    await postInvoice('EGP', '1', '2026-10-02', `fx-limit-egp-${stamp}`);
    const postedUsdInvoice = await postInvoice(
      'USD',
      '30',
      '2026-10-03',
      `fx-limit-usd-${stamp}`,
    );
    const creditNote = await creditNotes.createDraft(companyId, ownerId, {
      salesInvoiceId: postedUsdInvoice.id,
      documentDate: new Date('2026-10-04'),
      reason: 'Settled half of USD exposure',
      lines: [
        {
          originalSalesInvoiceLineId: postedUsdInvoice.lines[0].id,
          quantity: '0.5',
        },
      ],
    });
    await creditNotes.postDraft(companyId, ownerId, creditNote.id, {
      postingDate: new Date('2026-10-04'),
      idempotencyKey: `fx-limit-credit-${stamp}`,
    });
    await expect(
      postInvoice('USD', '30', '2026-10-05', `fx-limit-prospective-${stamp}`),
    ).resolves.toMatchObject({ status: 'POSTED' });
    const authoritativeExposure = await prisma.journalLine.aggregate({
      _sum: { debit: true, credit: true },
      where: {
        companyId,
        businessPartnerId: partner.id,
        journalEntry: { status: 'POSTED' },
        account: { accountType: AccountingAccountType.ASSET_RECEIVABLE },
      },
    });
    expect(
      new Prisma.Decimal(authoritativeExposure._sum.debit ?? 0)
        .sub(authoritativeExposure._sum.credit ?? 0)
        .toFixed(4),
    ).toBe('5100.0000');
    await expect(
      postInvoice(
        'USD',
        '30.000001',
        '2026-10-06',
        `fx-limit-over-by-point-one-mil-${stamp}`,
      ),
    ).rejects.toThrow('sales.customer_credit_limit_exceeded');
  });

  it('rejects Sales posting when the real AccountingSetup is not READY', async () => {
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-14'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Readiness gate service',
          quantity: '1',
          unitPrice: '10',
          discountValue: '0',
        },
      ],
    });
    await prisma.accountingSetup.update({
      where: { companyId },
      data: { status: 'BLOCKED' },
    });
    try {
      await expect(
        sales.postDraft(companyId, ownerId, draft.id, {
          postingDate: new Date('2026-10-14'),
          idempotencyKey: `readiness-${draft.id}`,
        }),
      ).rejects.toThrow('Accounting is not ready');
    } finally {
      await prisma.accountingSetup.update({
        where: { companyId },
        data: { status: 'READY' },
      });
    }
  });

  it('enforces control-account semantics for Sales, profiles, and manual journals', async () => {
    const stamp = Date.now();
    const nonControl = await accounting.createAccount(companyId, ownerId, {
      code: `AR-NONCONTROL-${stamp}`,
      name: 'Non-control receivable',
      accountType: AccountingAccountType.ASSET_RECEIVABLE,
      allowDirectPosting: true,
      isControlAccount: false,
      reconciliationEligible: false,
    });
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `CONTROL-${stamp}`,
        displayName: 'Control Test Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    await expect(
      new BusinessPartnersService(prisma).updateCustomerProfile(
        companyId,
        ownerId,
        partner.id,
        { receivableAccountId: nonControl.id },
      ),
    ).rejects.toThrow(BadRequestException);
    await prisma.customerProfile.update({
      where: { businessPartnerId: partner.id },
      data: { receivableAccountId: nonControl.id },
    });
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: partner.id,
      documentDate: new Date('2026-10-16'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Control test',
          quantity: '1',
          unitPrice: '10',
          discountValue: '0',
        },
      ],
    });
    await expect(
      sales.postDraft(companyId, ownerId, draft.id, {
        postingDate: new Date('2026-10-16'),
        idempotencyKey: `control-${stamp}`,
      }),
    ).rejects.toThrow(/Invalid RECEIVABLE account semantics/);

    const configuration =
      await prisma.accountingConfiguration.findUniqueOrThrow({
        where: { companyId },
        include: { accountDefaults: true },
      });
    const incomeId = configuration.accountDefaults.find(
      (mapping) => mapping.settingKey === 'INCOME',
    )!.accountId;
    const generalJournal = await prisma.accountingJournal.findFirstOrThrow({
      where: { companyId, type: 'GENERAL' },
    });
    const period = await prisma.accountingPeriod.findFirstOrThrow({
      where: {
        companyId,
        startDate: { lte: new Date('2026-10-16') },
        endDate: { gte: new Date('2026-10-16') },
      },
    });
    await expect(
      accounting.postManualJournal(companyId, ownerId, {
        journalId: generalJournal.id,
        accountingPeriodId: period.id,
        postingDate: '2026-10-16',
        transactionCurrencyCode: 'EGP',
        exchangeRate: '1',
        description: 'Control bypass attempt',
        idempotencyKey: `control-manual-${stamp}`,
        lines: [
          {
            accountId: nonControl.id,
            businessPartnerId: partner.id,
            transactionDebit: '10',
            transactionCredit: '0',
          },
          {
            accountId: incomeId,
            transactionDebit: '0',
            transactionCredit: '10',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    await prisma.customerProfile.update({
      where: { businessPartnerId: partner.id },
      data: { receivableAccountId: null },
    });
    const posted = await sales.postDraft(companyId, ownerId, draft.id, {
      postingDate: new Date('2026-10-16'),
      idempotencyKey: `control-valid-${stamp}`,
    });
    expect(posted.status).toBe('POSTED');
  });

  it('rejects stale tax defaults, applicability changes, override authority, and inactive terms', async () => {
    const stamp = Date.now();
    const [vat14Treatment, vat15Treatment] = await Promise.all([
      prisma.taxTreatment.create({
        data: {
          companyId,
          code: `STALE14-${stamp}`,
          normalizedCode: `STALE14-${stamp}`,
          name: 'Stale VAT 14',
          category: 'STANDARD',
          calculationMode: 'TAX_EXCLUSIVE',
        },
      }),
      prisma.taxTreatment.create({
        data: {
          companyId,
          code: `STALE15-${stamp}`,
          normalizedCode: `STALE15-${stamp}`,
          name: 'Current VAT 15',
          category: 'STANDARD',
          calculationMode: 'TAX_EXCLUSIVE',
        },
      }),
    ]);
    const [vat14, vat15] = await Promise.all([
      prisma.taxRate.create({
        data: {
          companyId,
          treatmentId: vat14Treatment.id,
          code: `STALE-R14-${stamp}`,
          normalizedCode: `STALE-R14-${stamp}`,
          name: 'Stale rate 14%',
          percentage: '14',
        },
      }),
      prisma.taxRate.create({
        data: {
          companyId,
          treatmentId: vat15Treatment.id,
          code: `STALE-R15-${stamp}`,
          normalizedCode: `STALE-R15-${stamp}`,
          name: 'Current rate 15%',
          percentage: '15',
        },
      }),
    ]);
    const policy = await prisma.taxDefaultPolicy.create({
      data: {
        companyId,
        defaultRateId: vat14.id,
        defaultTreatmentId: vat14Treatment.id,
        defaultCalculationMode: 'TAX_EXCLUSIVE',
        allowManualOverride: true,
      },
    });
    const rule = await prisma.taxModuleApplicabilityRule.create({
      data: {
        companyId,
        moduleKey: 'SALES',
        isEnabled: true,
        allowOverride: true,
        defaultRateId: vat14.id,
        defaultTreatmentId: vat14Treatment.id,
      },
    });
    const createInput = (
      lineOverrides: Record<string, unknown> = {},
      rootOverrides: Record<string, unknown> = {},
    ) => ({
      businessPartnerId: customerId,
      documentDate: new Date('2026-10-17'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      ...rootOverrides,
      lines: [
        {
          description: 'Stale policy service',
          quantity: '1',
          unitPrice: '10',
          discountValue: '0',
          ...lineOverrides,
        },
      ],
    });
    try {
      const defaultDraft = await sales.createDraft(
        companyId,
        ownerId,
        createInput(),
      );
      await prisma.taxModuleApplicabilityRule.update({
        where: { id: rule.id },
        data: {
          defaultRateId: vat15.id,
          defaultTreatmentId: vat15Treatment.id,
        },
      });
      await expect(
        sales.postDraft(companyId, ownerId, defaultDraft.id, {
          postingDate: new Date('2026-10-17'),
          idempotencyKey: `stale-default-${stamp}`,
        }),
      ).rejects.toThrow('sales.draft_requires_recalculation');

      const enabledDraft = await sales.createDraft(
        companyId,
        ownerId,
        createInput(),
      );
      await prisma.taxModuleApplicabilityRule.update({
        where: { id: rule.id },
        data: { isEnabled: false },
      });
      await expect(
        sales.postDraft(companyId, ownerId, enabledDraft.id, {
          postingDate: new Date('2026-10-17'),
          idempotencyKey: `stale-disabled-${stamp}`,
        }),
      ).rejects.toThrow('sales.draft_requires_recalculation');

      const outOfScopeDraft = await sales.createDraft(
        companyId,
        ownerId,
        createInput(),
      );
      await prisma.taxModuleApplicabilityRule.update({
        where: { id: rule.id },
        data: { isEnabled: true },
      });
      await expect(
        sales.postDraft(companyId, ownerId, outOfScopeDraft.id, {
          postingDate: new Date('2026-10-17'),
          idempotencyKey: `stale-enabled-${stamp}`,
        }),
      ).rejects.toThrow('sales.draft_requires_recalculation');

      const overrideDraft = await sales.createDraft(
        companyId,
        ownerId,
        createInput({
          taxTreatmentId: vat15Treatment.id,
          taxRateId: vat15.id,
          taxOverrideReason: 'Approved temporary override',
        }),
      );
      const overrideLine = await prisma.salesInvoiceLine.findFirstOrThrow({
        where: { salesInvoiceId: overrideDraft.id, sequence: 1 },
        include: { taxes: true },
      });
      expect(overrideLine.taxes[0].overrideReasonSnapshot).toBe(
        'Approved temporary override',
      );
      const overrideAudit = await prisma.auditLog.findFirstOrThrow({
        where: {
          companyId,
          action: 'sales.tax.override_selected',
          entityType: 'SalesInvoiceLine',
          entityId: overrideLine.id,
        },
      });
      expect(overrideAudit.metadata).toEqual(
        expect.objectContaining({
          salesInvoiceId: overrideDraft.id,
          salesInvoiceLineId: overrideLine.id,
          normalSelection: expect.any(String),
          overrideSelection: vat15Treatment.code,
          reason: 'Approved temporary override',
          actorUserId: ownerId,
        }),
      );
      await prisma.taxModuleApplicabilityRule.update({
        where: { id: rule.id },
        data: { allowOverride: false },
      });
      await expect(
        sales.postDraft(companyId, ownerId, overrideDraft.id, {
          postingDate: new Date('2026-10-17'),
          idempotencyKey: `stale-override-${stamp}`,
        }),
      ).rejects.toThrow('sales.draft_requires_recalculation');

      const term = await prisma.paymentTerm.create({
        data: {
          companyId,
          code: `STALE-TERM-${stamp}`,
          name: 'Term to deactivate',
          lines: {
            create: [
              {
                sequence: 1,
                calculationType: 'BALANCE',
                percentage: null,
                dueDays: 30,
              },
            ],
          },
        },
      });
      const termDraft = await sales.createDraft(
        companyId,
        ownerId,
        createInput({}, { paymentTermId: term.id }),
      );
      await prisma.paymentTerm.update({
        where: { id: term.id },
        data: { isActive: false },
      });
      await expect(
        sales.postDraft(companyId, ownerId, termDraft.id, {
          postingDate: new Date('2026-10-17'),
          idempotencyKey: `stale-term-${stamp}`,
        }),
      ).rejects.toThrow('sales.draft_requires_recalculation');
      expect(policy.id).toBeTruthy();
    } finally {
      await prisma.taxModuleApplicabilityRule.deleteMany({
        where: { companyId, moduleKey: 'SALES' },
      });
      await prisma.taxDefaultPolicy.deleteMany({ where: { companyId } });
      await prisma.taxRate.deleteMany({
        where: { id: { in: [vat14.id, vat15.id] } },
      });
      await prisma.taxTreatment.deleteMany({
        where: { id: { in: [vat14Treatment.id, vat15Treatment.id] } },
      });
    }
  });

  it('creates and posts a credit note against a posted invoice without mutating the invoice', async () => {
    const legacyLedgerBefore = await prisma.ledgerEntry.count({
      where: { companyId },
    });
    const legacyBalancesBefore = await prisma.balance.count({
      where: { companyId },
    });
    const invoice = await prisma.salesInvoice.findFirstOrThrow({
      where: { companyId, status: 'POSTED' },
      include: { lines: true },
      orderBy: { createdAt: 'asc' },
    });
    const note = await creditNotes.createDraft(companyId, ownerId, {
      salesInvoiceId: invoice.id,
      documentDate: new Date('2026-10-12'),
      reason: 'Partial service reversal',
      lines: [
        { originalSalesInvoiceLineId: invoice.lines[0].id, quantity: '1' },
      ],
    });
    expect(note.status).toBe('DRAFT');
    expect(note.grandTotal.toFixed(2)).toBe('100.00');
    const posted = await creditNotes.postDraft(companyId, ownerId, note.id);
    expect(posted.status).toBe('POSTED');
    expect(await prisma.ledgerEntry.count({ where: { companyId } })).toBe(
      legacyLedgerBefore,
    );
    expect(await prisma.balance.count({ where: { companyId } })).toBe(
      legacyBalancesBefore,
    );
    expect(posted.creditNoteNumber).toMatch(/^CN-2026-\d{6}$/);
    const entry = await prisma.journalEntry.findFirstOrThrow({
      where: { id: posted.journalEntryId!, companyId },
      include: { lines: true },
    });
    expect(entry.sourceType).toBe(JournalSourceType.SALES_CREDIT_NOTE);
    expect(
      entry.lines
        .reduce((sum, line) => sum.add(line.debit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('100.00');
    expect(
      entry.lines
        .reduce((sum, line) => sum.add(line.credit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('100.00');
    const unchanged = await prisma.salesInvoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(unchanged.status).toBe('POSTED');
    expect(unchanged.grandTotal.toFixed(2)).toBe('200.00');
  });

  it('rejects credit quantities above the remaining original quantity', async () => {
    const invoice = await prisma.salesInvoice.findFirstOrThrow({
      where: { companyId, status: 'POSTED' },
      include: { lines: true },
      orderBy: { createdAt: 'asc' },
    });
    await expect(
      creditNotes.createDraft(companyId, ownerId, {
        salesInvoiceId: invoice.id,
        documentDate: new Date('2026-10-13'),
        reason: 'Too much reversal',
        lines: [
          { originalSalesInvoiceLineId: invoice.lines[0].id, quantity: '2' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('serializes concurrent credit notes so cumulative quantity cannot exceed the source line', async () => {
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `CN-RACE-${stamp}`,
        displayName: 'Credit Race Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const invoice = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: partner.id,
      documentDate: new Date('2026-10-21'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Concurrent credit source',
          quantity: '1',
          unitPrice: '100',
          discountValue: '0',
        },
      ],
    });
    const postedInvoice = await sales.postDraft(
      companyId,
      ownerId,
      invoice.id,
      {
        postingDate: new Date('2026-10-21'),
        idempotencyKey: `cn-source-${stamp}`,
      },
    );
    const sourceLine = postedInvoice.lines[0];
    const [first, second] = await Promise.all([
      creditNotes.createDraft(companyId, ownerId, {
        salesInvoiceId: postedInvoice.id,
        documentDate: new Date('2026-10-22'),
        reason: 'Concurrent credit A',
        lines: [
          { originalSalesInvoiceLineId: sourceLine.id, quantity: '0.75' },
        ],
      }),
      creditNotes.createDraft(companyId, ownerId, {
        salesInvoiceId: postedInvoice.id,
        documentDate: new Date('2026-10-22'),
        reason: 'Concurrent credit B',
        lines: [
          { originalSalesInvoiceLineId: sourceLine.id, quantity: '0.75' },
        ],
      }),
    ]);
    const results = await Promise.allSettled([
      creditNotes.postDraft(companyId, ownerId, first.id, {
        postingDate: new Date('2026-10-22'),
        idempotencyKey: `cn-race-a-${stamp}`,
      }),
      creditNotes.postDraft(companyId, ownerId, second.id, {
        postingDate: new Date('2026-10-22'),
        idempotencyKey: `cn-race-b-${stamp}`,
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const postedLines = await prisma.salesCreditNoteLine.findMany({
      where: {
        companyId,
        originalSalesInvoiceLineId: sourceLine.id,
        salesCreditNote: { status: 'POSTED' },
      },
    });
    expect(postedLines).toHaveLength(1);
    expect(postedLines[0].quantity.toFixed(2)).toBe('0.75');
    expect(
      await prisma.journalEntry.count({
        where: {
          companyId,
          sourceType: JournalSourceType.SALES_CREDIT_NOTE,
          sourceId: { in: [first.id, second.id] },
        },
      }),
    ).toBe(1);
  });

  it('allocates exact residuals across repeated partial credit notes', async () => {
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `CN-RESIDUAL-${stamp}`,
        displayName: 'Residual Credit Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const treatment = await prisma.taxTreatment.create({
      data: {
        companyId,
        code: `CN-RES-T-${stamp}`,
        normalizedCode: `CN-RES-T-${stamp}`,
        name: 'Residual VAT',
        category: 'STANDARD',
        calculationMode: 'TAX_EXCLUSIVE',
      },
    });
    const rate = await prisma.taxRate.create({
      data: {
        companyId,
        treatmentId: treatment.id,
        code: `CN-RES-R-${stamp}`,
        normalizedCode: `CN-RES-R-${stamp}`,
        name: 'Residual VAT 14%',
        percentage: '14',
      },
    });
    await prisma.taxDefaultPolicy.create({
      data: {
        companyId,
        defaultRateId: rate.id,
        defaultTreatmentId: treatment.id,
        defaultCalculationMode: 'TAX_EXCLUSIVE',
      },
    });
    await prisma.taxModuleApplicabilityRule.create({
      data: {
        companyId,
        moduleKey: 'SALES',
        isEnabled: true,
        defaultRateId: rate.id,
        defaultTreatmentId: treatment.id,
      },
    });
    try {
      const invoice = await sales.createDraft(companyId, ownerId, {
        businessPartnerId: partner.id,
        documentDate: new Date('2026-10-23'),
        currencyCode: 'EGP',
        exchangeRate: '1',
        lines: [
          {
            description: 'Residual source',
            quantity: '3',
            unitPrice: '0.05',
            discountValue: '0',
          },
        ],
      });
      const postedInvoice = await sales.postDraft(
        companyId,
        ownerId,
        invoice.id,
        {
          postingDate: new Date('2026-10-23'),
          idempotencyKey: `cn-residual-source-${stamp}`,
        },
      );
      const sourceLine = postedInvoice.lines[0];
      for (const [index, quantity] of ['1', '1', '1'].entries()) {
        const note = await creditNotes.createDraft(companyId, ownerId, {
          salesInvoiceId: postedInvoice.id,
          documentDate: new Date(`2026-10-${24 + index}`),
          reason: `Residual credit ${index + 1}`,
          lines: [{ originalSalesInvoiceLineId: sourceLine.id, quantity }],
        });
        await creditNotes.postDraft(companyId, ownerId, note.id, {
          postingDate: new Date(`2026-10-${24 + index}`),
          idempotencyKey: `cn-residual-${stamp}-${index}`,
        });
      }
      const source = await prisma.salesInvoiceLine.findUniqueOrThrow({
        where: { id: sourceLine.id },
      });
      const credited = await prisma.salesCreditNoteLine.aggregate({
        where: {
          companyId,
          originalSalesInvoiceLineId: sourceLine.id,
          salesCreditNote: { status: 'POSTED' },
        },
        _sum: {
          quantity: true,
          taxableBase: true,
          taxAmount: true,
          lineTotal: true,
        },
      });
      expect(credited._sum.quantity?.toFixed(6)).toBe(
        source.quantity.toFixed(6),
      );
      expect(credited._sum.taxableBase?.toFixed(4)).toBe(
        source.taxableBase.toFixed(4),
      );
      expect(credited._sum.taxAmount?.toFixed(4)).toBe(
        source.taxAmount.toFixed(4),
      );
      expect(credited._sum.lineTotal?.toFixed(4)).toBe(
        source.lineTotal.toFixed(4),
      );
    } finally {
      await prisma.taxModuleApplicabilityRule.deleteMany({
        where: { companyId, moduleKey: 'SALES' },
      });
      await prisma.taxDefaultPolicy.deleteMany({ where: { companyId } });
      await prisma.taxRate.deleteMany({ where: { id: rate.id } });
      await prisma.taxTreatment.deleteMany({ where: { id: treatment.id } });
    }
  });

  it('rolls back invoice and journal state when PostgreSQL injects a post-transition failure', async () => {
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `ATOMIC-SI-${stamp}`,
        displayName: 'Atomic Invoice Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: partner.id,
      documentDate: new Date('2026-10-25'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Atomic invoice',
          quantity: '1',
          unitPrice: '25',
          discountValue: '0',
        },
      ],
    });
    const sequenceBefore = await prisma.salesDocumentSequence.count({
      where: { companyId, documentType: 'SALES_INVOICE' },
    });
    const journalBefore = await prisma.journalEntry.count({
      where: { companyId, sourceId: draft.id },
    });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION b032_fail_sales_invoice_post()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."status" = 'POSTED' AND OLD."status" = 'DRAFT' THEN
          RAISE EXCEPTION 'B032 injected invoice failure';
        END IF;
        RETURN NEW;
      END; $$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER b032_fail_sales_invoice_post_trigger
      BEFORE UPDATE OF "status" ON "SalesInvoice"
      FOR EACH ROW EXECUTE FUNCTION b032_fail_sales_invoice_post();
    `);
    try {
      await expect(
        sales.postDraft(companyId, ownerId, draft.id, {
          postingDate: new Date('2026-10-25'),
          idempotencyKey: `atomic-si-${stamp}`,
        }),
      ).rejects.toThrow('B032 injected invoice failure');
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS b032_fail_sales_invoice_post_trigger ON "SalesInvoice"',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS b032_fail_sales_invoice_post()',
      );
    }
    const unchanged = await prisma.salesInvoice.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(unchanged.status).toBe('DRAFT');
    expect(unchanged.invoiceNumber).toBeNull();
    expect(unchanged.journalEntryId).toBeNull();
    expect(
      await prisma.journalEntry.count({
        where: { companyId, sourceId: draft.id },
      }),
    ).toBe(journalBefore);
    expect(
      await prisma.salesDocumentSequence.count({
        where: { companyId, documentType: 'SALES_INVOICE' },
      }),
    ).toBe(sequenceBefore);
  });

  it('rolls back credit note and journal state when PostgreSQL injects a post-transition failure', async () => {
    const stamp = Date.now();
    const partner = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `ATOMIC-CN-${stamp}`,
        displayName: 'Atomic Credit Customer',
        partnerType: BusinessPartnerType.ORGANIZATION,
        customerProfile: { create: {} },
      },
    });
    const draft = await sales.createDraft(companyId, ownerId, {
      businessPartnerId: partner.id,
      documentDate: new Date('2026-10-26'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      lines: [
        {
          description: 'Atomic credit source',
          quantity: '1',
          unitPrice: '25',
          discountValue: '0',
        },
      ],
    });
    const invoice = await sales.postDraft(companyId, ownerId, draft.id, {
      postingDate: new Date('2026-10-26'),
      idempotencyKey: `atomic-cn-source-${stamp}`,
    });
    const note = await creditNotes.createDraft(companyId, ownerId, {
      salesInvoiceId: invoice.id,
      documentDate: new Date('2026-10-27'),
      reason: 'Atomic credit',
      lines: [
        { originalSalesInvoiceLineId: invoice.lines[0].id, quantity: '1' },
      ],
    });
    const sequenceBefore = await prisma.salesDocumentSequence.count({
      where: { companyId, documentType: 'SALES_CREDIT_NOTE' },
    });
    const journalBefore = await prisma.journalEntry.count({
      where: { companyId, sourceId: note.id },
    });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION b032_fail_sales_credit_note_post()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."status" = 'POSTED' AND OLD."status" = 'DRAFT' THEN
          RAISE EXCEPTION 'B032 injected credit note failure';
        END IF;
        RETURN NEW;
      END; $$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER b032_fail_sales_credit_note_post_trigger
      BEFORE UPDATE OF "status" ON "SalesCreditNote"
      FOR EACH ROW EXECUTE FUNCTION b032_fail_sales_credit_note_post();
    `);
    try {
      await expect(
        creditNotes.postDraft(companyId, ownerId, note.id, {
          postingDate: new Date('2026-10-27'),
          idempotencyKey: `atomic-cn-${stamp}`,
        }),
      ).rejects.toThrow('B032 injected credit note failure');
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS b032_fail_sales_credit_note_post_trigger ON "SalesCreditNote"',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS b032_fail_sales_credit_note_post()',
      );
    }
    const unchanged = await prisma.salesCreditNote.findUniqueOrThrow({
      where: { id: note.id },
    });
    expect(unchanged.status).toBe('DRAFT');
    expect(unchanged.creditNoteNumber).toBeNull();
    expect(unchanged.journalEntryId).toBeNull();
    expect(
      await prisma.journalEntry.count({
        where: { companyId, sourceId: note.id },
      }),
    ).toBe(journalBefore);
    expect(
      await prisma.salesDocumentSequence.count({
        where: { companyId, documentType: 'SALES_CREDIT_NOTE' },
      }),
    ).toBe(sequenceBefore);
  });
});
