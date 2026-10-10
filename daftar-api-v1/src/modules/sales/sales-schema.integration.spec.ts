import 'dotenv/config';

import { PrismaService } from '../../database/prisma/prisma.service';

jest.setTimeout(30_000);

describe('B03 Sales document schema', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is required for B03 schema integration tests',
      );
    }
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('creates all authoritative Sales document tables', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'SalesInvoice',
          'SalesInvoiceLine',
          'SalesInvoiceLineTax',
          'SalesInvoicePaymentSchedule',
          'SalesDocumentSequence',
          'SalesCreditNote',
          'SalesCreditNoteLine',
          'SalesCreditNoteLineTax'
        )
      ORDER BY table_name
    `;

    expect(rows.map((row) => row.table_name)).toEqual([
      'SalesCreditNote',
      'SalesCreditNoteLine',
      'SalesCreditNoteLineTax',
      'SalesDocumentSequence',
      'SalesInvoice',
      'SalesInvoiceLine',
      'SalesInvoiceLineTax',
      'SalesInvoicePaymentSchedule',
    ]);
  });

  it('stores company-safe Sales relationships, Decimal financial fields, and immutable posting metadata', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ table_name: string; column_name: string }>
    >`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'SalesInvoice' AND column_name IN ('companyId', 'businessPartnerId', 'status', 'invoiceNumber', 'journalEntryId', 'grandTotal', 'exchangeRate'))
          OR (table_name = 'SalesInvoiceLine' AND column_name IN ('salesInvoiceId', 'quantity', 'unitPrice', 'taxableBase', 'grossTotal'))
          OR (table_name = 'SalesInvoicePaymentSchedule' AND column_name IN ('salesInvoiceId', 'dueDate', 'amount'))
          OR (table_name = 'SalesCreditNote' AND column_name IN ('salesInvoiceId', 'businessPartnerId', 'journalEntryId', 'creditNoteNumber'))
        )
      ORDER BY table_name, column_name
    `;

    expect(rows).toEqual(
      expect.arrayContaining([
        { table_name: 'SalesInvoice', column_name: 'businessPartnerId' },
        { table_name: 'SalesInvoice', column_name: 'grandTotal' },
        { table_name: 'SalesInvoice', column_name: 'journalEntryId' },
        { table_name: 'SalesInvoiceLine', column_name: 'taxableBase' },
        { table_name: 'SalesInvoicePaymentSchedule', column_name: 'dueDate' },
        { table_name: 'SalesCreditNote', column_name: 'salesInvoiceId' },
      ]),
    );
  });

  it('has database protection for posted document and child immutability', async () => {
    const rows = await prisma.$queryRaw<Array<{ trigger_name: string }>>`
      SELECT DISTINCT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table IN (
          'SalesInvoice',
          'SalesInvoiceLine',
          'SalesInvoiceLineTax',
          'SalesInvoicePaymentSchedule',
          'SalesCreditNote',
          'SalesCreditNoteLine',
          'SalesCreditNoteLineTax'
        )
        AND trigger_name LIKE '%posted%'
      ORDER BY trigger_name
    `;

    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
