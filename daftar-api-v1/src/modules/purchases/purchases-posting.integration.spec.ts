import 'dotenv/config';

import { ConflictException } from '@nestjs/common';
import { BusinessPartnerType, JournalSourceType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { AccountingReadinessService } from '../accounting-bootstrap/accounting-readiness.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { PurchaseOrderService } from './purchase-order.service';
import { SupplierCreditNoteService } from './supplier-credit-note.service';
import { SupplierInvoiceService } from './supplier-invoice.service';

jest.setTimeout(60_000);

describe('B05 purchase/AP posting', () => {
  let prisma: PrismaService;
  let purchaseOrders: PurchaseOrderService;
  let supplierInvoices: SupplierInvoiceService;
  let creditNotes: SupplierCreditNoteService;
  let companyId: string;
  let ownerId: string;
  let supplierId: string;
  let paymentTermId: string;

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
      data: { name: `B05 Purchase ${stamp}`, currencyCode: 'EGP' },
    });
    companyId = company.id;
    const owner = await prisma.user.create({
      data: {
        email: `b05-purchase-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Purchase Owner',
        companyId,
        role: 'OWNER',
      },
    });
    ownerId = owner.id;
    const term = await prisma.paymentTerm.create({
      data: {
        companyId,
        code: `NET-${stamp}`,
        name: 'Net 30',
        lines: {
          create: [
            {
              sequence: 1,
              calculationType: 'PERCENT',
              percentage: 100,
              dueDays: 30,
            },
          ],
        },
      },
    });
    paymentTermId = term.id;
    const supplier = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `SUP-${stamp}`,
        displayName: 'B05 Supplier',
        partnerType: BusinessPartnerType.ORGANIZATION,
      },
    });
    supplierId = supplier.id;
    await prisma.supplierProfile.create({
      data: { businessPartnerId: supplierId, companyId, paymentTermId },
    });

    const initializer = new InitializeCompanyAccounting(
      prisma,
      new PlatformIdempotencyService(prisma),
      new TemplateService(prisma),
    );
    const bootstrap = await initializer.execute({
      companyId,
      actorUserId: ownerId,
      idempotencyKey: `b05-bootstrap-${stamp}`,
      countryCode: 'EG',
      localeCode: 'en-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-01-01'),
      fiscalYearEnd: new Date('2026-12-31'),
    });
    expect(bootstrap.status).toBe('READY');

    const accounting = new AccountingService(
      prisma,
      new PlatformIdempotencyService(prisma),
    );
    const readiness = new AccountingReadinessService(prisma);
    purchaseOrders = new PurchaseOrderService(prisma);
    supplierInvoices = new SupplierInvoiceService(
      prisma,
      accounting,
      readiness,
    );
    creditNotes = new SupplierCreditNoteService(prisma, accounting, readiness);
  });

  afterAll(async () => prisma?.$disconnect());

  const line = (description = 'Professional service') => ({
    description,
    quantity: '1',
    unitPrice: '1000',
    discountValue: '0',
  });

  it('keeps purchase orders non-financial and converts approved snapshots into a draft invoice', async () => {
    const before = await prisma.journalEntry.count({ where: { companyId } });
    const order = await purchaseOrders.createDraft(companyId, ownerId, {
      businessPartnerId: supplierId,
      documentDate: new Date('2026-10-10'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId,
      lines: [line()],
    });
    expect(order.status).toBe('DRAFT');
    expect(await prisma.journalEntry.count({ where: { companyId } })).toBe(
      before,
    );
    await purchaseOrders.approve(companyId, ownerId, order.id);
    const invoice = await purchaseOrders.convertToInvoice(
      companyId,
      ownerId,
      order.id,
    );
    expect(invoice.status).toBe('DRAFT');
    expect(invoice.purchaseOrderId).toBe(order.id);
    expect(invoice.businessPartnerId).toBe(supplierId);
    const converted = await supplierInvoices.findOne(companyId, invoice.id);
    expect(converted.lines).toHaveLength(1);
  });

  it('posts AP maturities through the purchase journal and is idempotent by date and key', async () => {
    const draft = await supplierInvoices.createDraft(companyId, ownerId, {
      businessPartnerId: supplierId,
      documentDate: new Date('2026-10-11'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId,
      supplierReference: `SUP-REF-${Date.now()}`,
      lines: [line('Direct service invoice')],
    });
    const posted = await supplierInvoices.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-12'),
      `invoice-${draft.id}`,
    );
    expect(posted.status).toBe('POSTED');
    expect(posted.invoiceNumber).toBe('SI-2026-000001');
    const entry = await prisma.journalEntry.findFirstOrThrow({
      where: { id: posted.journalEntryId!, companyId },
      include: { lines: true, journal: true },
    });
    expect(entry.sourceType).toBe(JournalSourceType.PURCHASE_INVOICE);
    expect(entry.journal.type).toBe('PURCHASE');
    expect(entry.lines).toHaveLength(2);
    expect(
      entry.lines
        .reduce((sum, item) => sum.add(item.debit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('1000.00');
    expect(
      entry.lines
        .reduce((sum, item) => sum.add(item.credit), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('1000.00');
    const schedule = await prisma.supplierInvoicePaymentSchedule.findMany({
      where: { supplierInvoiceId: posted.id },
    });
    expect(schedule).toHaveLength(1);
    expect(schedule[0].journalLineId).toBeTruthy();
    expect(
      (
        await supplierInvoices.postDraft(
          companyId,
          ownerId,
          draft.id,
          new Date('2026-10-12'),
          `invoice-${draft.id}`,
        )
      ).id,
    ).toBe(posted.id);
    await expect(
      supplierInvoices.postDraft(
        companyId,
        ownerId,
        draft.id,
        new Date('2026-10-13'),
        `invoice-${draft.id}`,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps three AP maturities to persisted journal sequences with multiple tax lines', async () => {
    const stamp = Date.now();
    const stagedTerm = await prisma.paymentTerm.create({
      data: {
        companyId,
        code: `STAGED-${stamp}`,
        name: 'Three stage supplier term',
        lines: {
          create: [
            {
              sequence: 1,
              calculationType: 'PERCENT',
              percentage: 25,
              dueDays: 0,
            },
            {
              sequence: 2,
              calculationType: 'PERCENT',
              percentage: 35,
              dueDays: 30,
            },
            {
              sequence: 3,
              calculationType: 'PERCENT',
              percentage: 40,
              dueDays: 60,
            },
          ],
        },
      },
    });
    const treatment = await prisma.taxTreatment.create({
      data: {
        companyId,
        code: `PURCHASE-STANDARD-${stamp}`,
        normalizedCode: `purchase-standard-${stamp}`,
        name: 'Purchase standard',
        category: 'STANDARD',
        calculationMode: 'TAX_EXCLUSIVE',
      },
    });
    const rate = await prisma.taxRate.create({
      data: {
        companyId,
        treatmentId: treatment.id,
        code: `PURCHASE-VAT-${stamp}`,
        normalizedCode: `purchase-vat-${stamp}`,
        name: 'Purchase VAT',
        percentage: 14,
      },
    });
    await prisma.taxModuleApplicabilityRule.create({
      data: {
        companyId,
        moduleKey: 'PURCHASES',
        isEnabled: true,
        defaultTreatmentId: treatment.id,
        defaultRateId: rate.id,
      },
    });
    const draft = await supplierInvoices.createDraft(companyId, ownerId, {
      businessPartnerId: supplierId,
      documentDate: new Date('2026-10-20'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId: stagedTerm.id,
      supplierReference: `SUP-STAGED-${stamp}`,
      lines: [line('Staged service one'), line('Staged service two')],
    });
    await prisma.taxRate.update({
      where: { id: rate.id },
      data: { status: 'INACTIVE' },
    });
    await expect(
      supplierInvoices.postDraft(
        companyId,
        ownerId,
        draft.id,
        new Date('2026-10-20'),
        `stale-tax-${draft.id}`,
      ),
    ).rejects.toThrow('recalculation');
    await prisma.taxRate.update({
      where: { id: rate.id },
      data: { status: 'ACTIVE' },
    });
    const posted = await supplierInvoices.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-20'),
      `invoice-${draft.id}`,
    );
    const entry = await prisma.journalEntry.findFirstOrThrow({
      where: { id: posted.journalEntryId!, companyId },
      include: { lines: true },
    });
    const payableLines = entry.lines
      .filter((item) => item.accountId === posted.payableAccountId)
      .sort((a, b) => a.sequence - b.sequence);
    const schedules = await prisma.supplierInvoicePaymentSchedule.findMany({
      where: { supplierInvoiceId: posted.id },
      orderBy: { sequence: 'asc' },
    });
    expect(schedules).toHaveLength(3);
    expect(payableLines.map((item) => item.sequence)).toEqual([1, 2, 3]);
    expect(schedules.map((item) => item.journalLineId)).toEqual(
      payableLines.map((item) => item.id),
    );
    expect(schedules.map((item) => item.amount.toFixed(2))).toEqual([
      '570.00',
      '798.00',
      '912.00',
    ]);
    expect(entry.lines.filter((item) => item.taxTreatmentCode)).toHaveLength(2);
    expect(
      entry.lines.filter(
        (item) =>
          item.accountId !== posted.payableAccountId && !item.taxTreatmentCode,
      ),
    ).toHaveLength(2);
    await prisma.taxModuleApplicabilityRule.update({
      where: { companyId_moduleKey: { companyId, moduleKey: 'PURCHASES' } },
      data: { isEnabled: false },
    });
  });

  it('rejects posting when the supplier or selected payment term becomes inactive', async () => {
    const staleSupplier = await prisma.businessPartner.create({
      data: {
        companyId,
        partnerCode: `STALE-SUP-${Date.now()}`,
        displayName: 'Stale supplier',
        partnerType: BusinessPartnerType.ORGANIZATION,
      },
    });
    await prisma.supplierProfile.create({
      data: { businessPartnerId: staleSupplier.id, companyId, paymentTermId },
    });
    const supplierDraft = await supplierInvoices.createDraft(
      companyId,
      ownerId,
      {
        businessPartnerId: staleSupplier.id,
        documentDate: new Date('2026-10-21'),
        currencyCode: 'EGP',
        exchangeRate: '1',
        paymentTermId,
        supplierReference: `SUP-INACTIVE-${Date.now()}`,
        lines: [line('Inactive supplier check')],
      },
    );
    await prisma.businessPartner.update({
      where: { id: staleSupplier.id },
      data: { isActive: false },
    });
    await expect(
      supplierInvoices.postDraft(
        companyId,
        ownerId,
        supplierDraft.id,
        new Date('2026-10-21'),
        `invoice-${supplierDraft.id}`,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    const termDraft = await supplierInvoices.createDraft(companyId, ownerId, {
      businessPartnerId: supplierId,
      documentDate: new Date('2026-10-22'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId,
      supplierReference: `TERM-INACTIVE-${Date.now()}`,
      lines: [line('Inactive term check')],
    });
    await prisma.paymentTerm.update({
      where: { id: paymentTermId },
      data: { isActive: false },
    });
    await expect(
      supplierInvoices.postDraft(
        companyId,
        ownerId,
        termDraft.id,
        new Date('2026-10-22'),
        `invoice-${termDraft.id}`,
      ),
    ).rejects.toThrow('payment term is required');
    await prisma.paymentTerm.update({
      where: { id: paymentTermId },
      data: { isActive: true },
    });
  });

  it('reverses the original AP basis with a partial supplier credit note and prevents over-credit', async () => {
    const draft = await supplierInvoices.createDraft(companyId, ownerId, {
      businessPartnerId: supplierId,
      documentDate: new Date('2026-10-14'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId,
      supplierReference: `SUP-CN-${Date.now()}`,
      lines: [line('Creditable service')],
    });
    const invoice = await supplierInvoices.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-14'),
      `invoice-${draft.id}`,
    );
    const postedInvoice = await supplierInvoices.findOne(companyId, invoice.id);
    const sourceLine = postedInvoice.lines[0];
    const noteDraft = await creditNotes.createDraft(companyId, ownerId, {
      supplierInvoiceId: invoice.id,
      documentDate: new Date('2026-10-15'),
      reason: 'Service correction',
      lines: [
        { originalSupplierInvoiceLineId: sourceLine.id, quantity: '0.5' },
      ],
    });
    const note = await creditNotes.postDraft(
      companyId,
      ownerId,
      noteDraft.id,
      new Date('2026-10-15'),
      `cn-${noteDraft.id}`,
    );
    expect(note.status).toBe('POSTED');
    const entry = await prisma.journalEntry.findFirstOrThrow({
      where: { id: note.journalEntryId!, companyId },
      include: { lines: true },
    });
    expect(entry.sourceType).toBe(JournalSourceType.SUPPLIER_CREDIT_NOTE);
    expect(entry.lines).toHaveLength(2);
    expect(entry.lines.some((item) => item.debit.gt(0))).toBe(true);
    const secondDraft = await creditNotes.createDraft(companyId, ownerId, {
      supplierInvoiceId: invoice.id,
      documentDate: new Date('2026-10-16'),
      reason: 'Second correction',
      lines: [
        { originalSupplierInvoiceLineId: sourceLine.id, quantity: '0.5' },
      ],
    });
    const second = await creditNotes.postDraft(
      companyId,
      ownerId,
      secondDraft.id,
      new Date('2026-10-16'),
      `cn-${secondDraft.id}`,
    );
    expect(second.status).toBe('POSTED');
    await expect(
      creditNotes.createDraft(companyId, ownerId, {
        supplierInvoiceId: invoice.id,
        documentDate: new Date('2026-10-17'),
        reason: 'Over correction',
        lines: [
          { originalSupplierInvoiceLineId: sourceLine.id, quantity: '0.1' },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('serializes two full credit notes against the same source line', async () => {
    const draft = await supplierInvoices.createDraft(companyId, ownerId, {
      businessPartnerId: supplierId,
      documentDate: new Date('2026-10-18'),
      currencyCode: 'EGP',
      exchangeRate: '1',
      paymentTermId,
      supplierReference: `SUP-RACE-${Date.now()}`,
      lines: [line('Concurrent service')],
    });
    const invoice = await supplierInvoices.postDraft(
      companyId,
      ownerId,
      draft.id,
      new Date('2026-10-18'),
      `invoice-${draft.id}`,
    );
    const postedInvoice = await supplierInvoices.findOne(companyId, invoice.id);
    const sourceLine = postedInvoice.lines[0];
    const inputs = await Promise.all([
      creditNotes.createDraft(companyId, ownerId, {
        supplierInvoiceId: invoice.id,
        documentDate: new Date('2026-10-19'),
        reason: 'Race one',
        lines: [
          { originalSupplierInvoiceLineId: sourceLine.id, quantity: '1' },
        ],
      }),
      creditNotes.createDraft(companyId, ownerId, {
        supplierInvoiceId: invoice.id,
        documentDate: new Date('2026-10-19'),
        reason: 'Race two',
        lines: [
          { originalSupplierInvoiceLineId: sourceLine.id, quantity: '1' },
        ],
      }),
    ]);
    const results = await Promise.allSettled(
      inputs.map((note) =>
        creditNotes.postDraft(
          companyId,
          ownerId,
          note.id,
          new Date('2026-10-19'),
          `race-${note.id}`,
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });
});
