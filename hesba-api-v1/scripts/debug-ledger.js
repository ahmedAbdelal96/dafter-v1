require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const partyId = '5b09b6ad-4d13-4bd8-9da7-74e254f39659';

  // All ledger entries for this party (including deleted)
  const entries = await prisma.ledgerEntry.findMany({
    where: { partyId },
    select: {
      id: true,
      companyId: true,
      partyType: true,
      entryType: true,
      signedAmount: true,
      isDeleted: true,
      createdAt: true,
      note: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log('\n=== LedgerEntry rows for this customer ===');
  console.log(JSON.stringify(entries, null, 2));
  console.log(`Total found (including deleted): ${entries.length}`);

  // Also check the Invoice table (including ledgerEntryId now)
  const invoices = await prisma.invoice.findMany({
    where: { partyId },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      ledgerEntryId: true,
      isDeleted: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('\n=== Invoice rows for this customer ===');
  console.log(JSON.stringify(invoices, null, 2));

  // Check the Balance table (composite PK: companyId+partyType+partyId)
  const balances = await prisma.balance.findMany({
    where: { partyId },
    select: {
      companyId: true,
      partyType: true,
      partyId: true,
      balance: true,
      updatedAt: true,
    },
  });

  console.log('\n=== Balance rows for this customer ===');
  console.log(JSON.stringify(balances, null, 2));

  // Check ALL LedgerEntry rows (no filter) to see what exists
  const allEntries = await prisma.ledgerEntry.findMany({
    select: {
      id: true,
      partyId: true,
      partyType: true,
      entryType: true,
      signedAmount: true,
      isDeleted: true,
      companyId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('\n=== ALL LedgerEntry rows (latest 10) ===');
  console.log(JSON.stringify(allEntries, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
