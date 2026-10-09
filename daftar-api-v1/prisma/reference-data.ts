import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { installEgStandardV1 } from './seeds/modules/15-accounting-templates';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for reference-data installation');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);
  try {
    await installEgStandardV1(prisma);
    console.log('[reference-data] EG_STANDARD_V1 v1 is installed and verified');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[reference-data] Failed:', error);
  process.exit(1);
});
