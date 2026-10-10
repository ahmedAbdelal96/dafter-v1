import { randomUUID } from 'crypto';
import {
  AccountingAccountType,
  AccountingJournalType,
  JournalEntryStatus,
  JournalSourceType,
  SalesDiscountType,
  SalesInvoiceStatus,
} from '@prisma/client';

import { SeedContext } from '../types';

export const seedSalesAndAccounting = async (ctx: SeedContext): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const companyId = tenant.company.id;
    const documentId = randomUUID();
    const journalEntryId = randomUUID();

    const journal = await ctx.prisma.accountingJournal.create({
      data: {
        companyId,
        code: 'SALES',
        name: 'Demo Sales Journal',
        type: AccountingJournalType.SALES,
        currencyCode: 'EGP',
      },
    });

    const fiscalYear = await ctx.prisma.fiscalYear.create({
      data: {
        companyId,
        name: 'FY-2026',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      },
    });

    const period = await ctx.prisma.accountingPeriod.create({
      data: {
        companyId,
        fiscalYearId: fiscalYear.id,
        name: '2026-01',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-01-31T00:00:00.000Z'),
      },
    });

    const receivable = await ctx.prisma.accountingAccount.create({
      data: {
        companyId,
        code: '1300',
        name: 'Demo Accounts Receivable',
        accountType: AccountingAccountType.ASSET_RECEIVABLE,
        currencyCode: 'EGP',
        allowDirectPosting: true,
        isControlAccount: true,
        reconciliationEligible: true,
      },
    });

    const revenue = await ctx.prisma.accountingAccount.create({
      data: {
        companyId,
        code: '4100',
        name: 'Demo Sales Revenue',
        accountType: AccountingAccountType.INCOME_OPERATING_REVENUE,
        currencyCode: 'EGP',
        allowDirectPosting: true,
      },
    });

    const partner = tenant.businessPartners[0];
    const product = tenant.products[0];
    const subtotal = 100;
    const taxTotal = 14;
    const grandTotal = 114;

    await ctx.prisma.journalEntry.create({
      data: {
        id: journalEntryId,
        companyId,
        journalId: journal.id,
        accountingPeriodId: period.id,
        entryNumber: `SEED-${tenant.key.toUpperCase()}-0001`,
        status: JournalEntryStatus.DRAFT,
        postingDate: new Date('2026-01-15T00:00:00.000Z'),
        documentDate: new Date('2026-01-15T00:00:00.000Z'),
        transactionCurrencyCode: 'EGP',
        exchangeRate: 1,
        description: 'Seeded SalesInvoice posting',
        sourceType: JournalSourceType.SALES_INVOICE,
        sourceId: documentId,
        idempotencyKey: `seed-sales-${tenant.key}`,
        requestHash: '0'.repeat(64),
        postedById: tenant.owner.id,
        postedAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    });

    await ctx.prisma.journalLine.createMany({
      data: [
        {
          companyId,
          journalEntryId,
          accountId: receivable.id,
          debit: grandTotal,
          credit: 0,
          transactionDebit: grandTotal,
          transactionCredit: 0,
          businessPartnerId: partner.id,
          description: 'Seeded receivable',
          documentReference: 'SEED-INV-0001',
        },
        {
          companyId,
          journalEntryId,
          accountId: revenue.id,
          debit: 0,
          credit: grandTotal,
          transactionDebit: 0,
          transactionCredit: grandTotal,
          description: 'Seeded revenue',
          documentReference: 'SEED-INV-0001',
        },
      ],
    });

    await ctx.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: { status: JournalEntryStatus.POSTED },
    });

    await ctx.prisma.salesInvoice.create({
      data: {
        id: documentId,
        companyId,
        businessPartnerId: partner.id,
        status: SalesInvoiceStatus.DRAFT,
        invoiceNumber: 'SEED-INV-0001',
        documentDate: new Date('2026-01-15T00:00:00.000Z'),
        postingDate: new Date('2026-01-15T00:00:00.000Z'),
        transactionCurrencyCode: 'EGP',
        exchangeRate: 1,
        subtotal,
        discountTotal: 0,
        taxableBaseTotal: subtotal,
        taxTotal,
        grandTotal,
        partnerCodeSnapshot: partner.partnerCode,
        partnerNameSnapshot: partner.displayName,
        partnerLegalNameSnapshot: partner.legalName,
        journalEntryId,
        receivableAccountId: receivable.id,
        createdById: tenant.owner.id,
        postedById: null,
        postedAt: null,
      },
    });

    await ctx.prisma.salesInvoiceLine.create({
      data: {
        companyId,
        salesInvoiceId: documentId,
        sequence: 1,
        productId: product.id,
        descriptionSnapshot: product.name,
        quantity: 1,
        unitPrice: subtotal,
        discountType: SalesDiscountType.NONE,
        discountValue: 0,
        grossBeforeDiscount: subtotal,
        discountAmount: 0,
        taxableBase: subtotal,
        taxAmount: taxTotal,
        lineTotal: grandTotal,
        revenueAccountId: revenue.id,
        revenueAccountCodeSnapshot: revenue.code,
      },
    });

    await ctx.prisma.salesInvoice.update({
      where: { id: documentId },
      data: {
        status: SalesInvoiceStatus.POSTED,
        postedById: tenant.owner.id,
        postedAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    });
  }
};
