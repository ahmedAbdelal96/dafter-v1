import 'dotenv/config';

import { PrismaService } from '../../database/prisma/prisma.service';

jest.setTimeout(30_000);

describe('B05 purchases/AP schema', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error(
        'DATABASE_URL is required for B05 schema integration tests',
      );
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => prisma?.$disconnect());

  it('creates the authoritative purchase, AP maturity, and supplier credit-note tables', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN (
        'PurchaseOrder', 'PurchaseOrderLine', 'PurchaseOrderLineTax', 'PurchaseOrderSequence',
        'SupplierDocumentSequence', 'SupplierInvoice', 'SupplierInvoiceLine',
        'SupplierInvoiceLineTax', 'SupplierInvoicePaymentSchedule',
        'SupplierCreditNote', 'SupplierCreditNoteLine', 'SupplierCreditNoteLineTax'
      ) ORDER BY table_name
    `;
    expect(rows.map((row) => row.table_name)).toEqual([
      'PurchaseOrder',
      'PurchaseOrderLine',
      'PurchaseOrderLineTax',
      'PurchaseOrderSequence',
      'SupplierCreditNote',
      'SupplierCreditNoteLine',
      'SupplierCreditNoteLineTax',
      'SupplierDocumentSequence',
      'SupplierInvoice',
      'SupplierInvoiceLine',
      'SupplierInvoiceLineTax',
      'SupplierInvoicePaymentSchedule',
    ]);
  });

  it('protects supplier duplicate references and financial line invariants at the database boundary', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
        AND indexname = 'SupplierInvoice_companyId_businessPartnerId_supplierDocumen_key'
    `;
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE conname IN (
        'PurchaseOrderLine_positive_quantity_check',
        'SupplierInvoiceLine_positive_quantity_check',
        'SupplierCreditNoteLine_positive_quantity_check'
      ) ORDER BY conname
    `;
    expect(indexes).toHaveLength(1);
    expect(constraints.map((row) => row.conname)).toEqual([
      'PurchaseOrderLine_positive_quantity_check',
      'SupplierCreditNoteLine_positive_quantity_check',
      'SupplierInvoiceLine_positive_quantity_check',
    ]);
  });

  it('keeps purchase invoice payment maturities linked to journal lines for AP aging', async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'SupplierInvoicePaymentSchedule'
        AND column_name IN ('supplierInvoiceId', 'dueDate', 'amount', 'journalLineId')
      ORDER BY column_name
    `;
    expect(columns.map((row) => row.column_name)).toEqual([
      'amount',
      'dueDate',
      'journalLineId',
      'supplierInvoiceId',
    ]);
  });

  it('installs database immutability and credit-note overage guards', async () => {
    const triggers = await prisma.$queryRaw<Array<{ tgname: string }>>`
      SELECT tgname FROM pg_trigger
      WHERE NOT tgisinternal AND tgname IN (
        'b05_supplier_invoice_posted_immutability_trigger',
        'b05_supplier_invoice_line_posted_immutability_trigger',
        'b05_supplier_invoice_line_tax_posted_immutability_trigger',
        'b05_supplier_invoice_schedule_posted_immutability_trigger',
        'b05_supplier_credit_note_posted_immutability_trigger',
        'b05_supplier_credit_note_line_posted_immutability_trigger',
        'b05_supplier_credit_note_line_tax_posted_immutability_trigger',
        'b05_supplier_credit_note_overage_guard_trigger'
      ) ORDER BY tgname
    `;
    expect(triggers.map((row) => row.tgname)).toEqual([
      'b05_supplier_credit_note_line_posted_immutability_trigger',
      'b05_supplier_credit_note_line_tax_posted_immutability_trigger',
      'b05_supplier_credit_note_overage_guard_trigger',
      'b05_supplier_credit_note_posted_immutability_trigger',
      'b05_supplier_invoice_line_posted_immutability_trigger',
      'b05_supplier_invoice_line_tax_posted_immutability_trigger',
      'b05_supplier_invoice_posted_immutability_trigger',
      'b05_supplier_invoice_schedule_posted_immutability_trigger',
    ]);
  });
});
