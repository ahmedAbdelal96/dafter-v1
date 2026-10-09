import 'dotenv/config';

import { PrismaService } from '../../database/prisma/prisma.service';

jest.setTimeout(30_000);

describe('B02 BusinessPartner schema foundation', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for B02 integration tests');
    }
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('creates the authoritative partner tables without monetary balance fields', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'BusinessPartner',
          'CustomerProfile',
          'SupplierProfile',
          'BusinessPartnerAddress',
          'BusinessPartnerContact'
        )
    `;

    expect(tables.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        'BusinessPartner',
        'CustomerProfile',
        'SupplierProfile',
        'BusinessPartnerAddress',
        'BusinessPartnerContact',
      ]),
    );

    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'BusinessPartner'
    `;

    expect(columns.map((row) => row.column_name)).not.toEqual(
      expect.arrayContaining([
        'openingBalance',
        'currentBalance',
        'receivableBalance',
        'payableBalance',
        'availableBalance',
      ]),
    );
  });
});
