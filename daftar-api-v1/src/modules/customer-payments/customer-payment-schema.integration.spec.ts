import 'dotenv/config';

import { PrismaService } from '../../database/prisma/prisma.service';

jest.setTimeout(30_000);

describe('B04 customer payment and AR reconciliation schema', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('creates the authoritative payment, allocation, later-reconciliation, and numbering tables', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('CustomerPayment', 'CustomerPaymentAllocation', 'ARReconciliation', 'CustomerPaymentSequence')
      ORDER BY table_name
    `;
    expect(rows.map((row) => row.table_name)).toEqual([
      'ARReconciliation',
      'CustomerPayment',
      'CustomerPaymentAllocation',
      'CustomerPaymentSequence',
    ]);
  });

  it('keeps each invoice maturity tied to an identifiable AR JournalLine', async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'SalesInvoicePaymentSchedule'
        AND column_name = 'journalLineId'
    `;
    expect(columns).toHaveLength(1);
  });

  it('installs database immutability guards for posted payments and reconciliations', async () => {
    const triggers = await prisma.$queryRaw<{ trigger_name: string }[]>`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND trigger_name IN (
          'b04_customer_payment_immutable',
          'b04_customer_payment_allocation_immutable_insert',
          'b04_customer_payment_allocation_immutable_update',
          'b04_customer_payment_allocation_immutable_delete',
          'b04_ar_reconciliation_immutable_update',
          'b04_ar_reconciliation_immutable_delete'
        )
      ORDER BY trigger_name
    `;
    expect(triggers.map((trigger) => trigger.trigger_name)).toEqual([
      'b04_ar_reconciliation_immutable_delete',
      'b04_ar_reconciliation_immutable_update',
      'b04_customer_payment_allocation_immutable_delete',
      'b04_customer_payment_allocation_immutable_insert',
      'b04_customer_payment_allocation_immutable_update',
      'b04_customer_payment_immutable',
    ]);
  });
});
