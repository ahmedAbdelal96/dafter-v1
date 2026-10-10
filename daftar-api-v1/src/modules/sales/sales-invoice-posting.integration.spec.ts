import 'dotenv/config';

import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AccountingAccountType,
  AccountingConfigAccountKey,
  AccountingConfigJournalKey,
  AccountingJournalType,
  BusinessPartnerType,
  JournalSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { AccountingService } from '../accounting/accounting.service';
import { SalesPricingService } from './sales-pricing.service';
import { SalesTaxCalculatorService } from './sales-tax-calculator.service';
import { SalesInvoiceService } from './sales-invoice.service';
import { SalesCreditNoteService } from './sales-credit-note.service';

jest.setTimeout(60_000);

describe('SalesInvoice posting', () => {
  let prisma: PrismaService;
  let accounting: AccountingService;
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
    await accounting.updateConfiguration(companyId, ownerId, {
      baseCurrencyCode: 'EGP',
      countryCode: 'EG',
      localeCode: 'en-EG',
    });
    const receivable = await accounting.createAccount(companyId, ownerId, {
      code: `AR-${stamp}`,
      name: 'Receivables',
      accountType: AccountingAccountType.ASSET_RECEIVABLE,
    });
    const revenue = await accounting.createAccount(companyId, ownerId, {
      code: `REV-${stamp}`,
      name: 'Sales Revenue',
      accountType: AccountingAccountType.INCOME_OPERATING_REVENUE,
    });
    const journal = await accounting.createJournal(companyId, ownerId, {
      code: `SALES-${stamp}`.slice(-36),
      name: 'Sales Journal',
      type: AccountingJournalType.SALES,
    });
    const fiscalYear = await accounting.createFiscalYear(companyId, ownerId, {
      name: `FY-${stamp}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const period = await accounting.createPeriod(companyId, ownerId, {
      fiscalYearId: fiscalYear.id,
      name: `2026-${stamp}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const configuration =
      await prisma.accountingConfiguration.findUniqueOrThrow({
        where: { companyId },
      });
    await prisma.accountingConfigurationAccount.createMany({
      data: [
        {
          companyId,
          configurationId: configuration.id,
          settingKey: AccountingConfigAccountKey.RECEIVABLE,
          accountId: receivable.id,
        },
        {
          companyId,
          configurationId: configuration.id,
          settingKey: AccountingConfigAccountKey.INCOME,
          accountId: revenue.id,
        },
      ],
    });
    await prisma.accountingConfigurationJournal.create({
      data: {
        companyId,
        configurationId: configuration.id,
        settingKey: AccountingConfigJournalKey.SALES,
        journalId: journal.id,
      },
    });
    expect(period.id).toBeTruthy();
    sales = new SalesInvoiceService(
      prisma,
      new SalesPricingService(),
      new SalesTaxCalculatorService(),
      accounting,
    );
    creditNotes = new SalesCreditNoteService(
      prisma,
      new SalesTaxCalculatorService(),
      accounting,
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
    expect(posted.creditNoteNumber).toBe('CN-2026-000001');
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
});
