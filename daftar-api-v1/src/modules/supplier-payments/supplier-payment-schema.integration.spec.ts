import 'dotenv/config';

import { PrismaService } from '../../database/prisma/prisma.service';

jest.setTimeout(30_000);

describe('B06 supplier payment and AP reconciliation schema', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('creates the authoritative supplier payment and AP tables', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('SupplierPayment', 'SupplierPaymentAllocation', 'SupplierPaymentSequence', 'APReconciliation')
      ORDER BY table_name
    `;
    expect(rows.map((row) => row.table_name)).toEqual([
      'APReconciliation',
      'SupplierPayment',
      'SupplierPaymentAllocation',
      'SupplierPaymentSequence',
    ]);
  });

  it('installs database guards for AP cumulative allocation and immutability', async () => {
    const triggers = await prisma.$queryRaw<{ trigger_name: string }[]>`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND trigger_name LIKE 'b06_%'
      ORDER BY trigger_name
    `;
    expect(triggers.map((trigger) => trigger.trigger_name)).toEqual([
      'b06_ap_reconciliation_immutable_delete',
      'b06_ap_reconciliation_immutable_update',
      'b06_ap_reconciliation_validate',
      'b06_supplier_payment_allocation_immutable_delete',
      'b06_supplier_payment_allocation_immutable_insert',
      'b06_supplier_payment_allocation_immutable_update',
      'b06_supplier_payment_immutable',
    ]);
  });
});
