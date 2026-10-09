import 'dotenv/config';

import { PrismaService } from '../../database/prisma/prisma.service';

jest.setTimeout(30_000);

describe('B02 JournalLine schema foundation', () => {
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

  it('uses a relational business partner counterparty instead of party polymorphism', async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'JournalLine'
    `;

    const names = columns.map((row) => row.column_name);
    expect(names).toContain('businessPartnerId');
    expect(names).not.toEqual(expect.arrayContaining(['partyType', 'partyId']));
  });
});
