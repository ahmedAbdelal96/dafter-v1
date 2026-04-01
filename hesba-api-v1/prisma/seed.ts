import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

import { runAllSeeds } from './seeds';
import { createSeedContext } from './seeds/types';

const createPrismaClient = (): { prisma: PrismaClient; pool: Pool } => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  return { prisma, pool };
};

async function main(): Promise<void> {
  const { prisma, pool } = createPrismaClient();
  const context = createSeedContext(prisma);

  try {
    await runAllSeeds(context);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[seed] Failed:', error);
  process.exit(1);
});
