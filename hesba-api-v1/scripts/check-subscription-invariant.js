/* eslint-disable no-console */
const { Client } = require('pg');

const INDEX_NAME = 'CompanySubscription_one_live_per_company_idx';
const CONSTRAINT_NAME = 'CompanySubscription_end_after_start_chk';

function isStrictMode() {
  return process.env.CI === 'true' || process.env.SUBSCRIPTION_INVARIANT_STRICT === 'true';
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (isStrictMode()) {
      console.error(
        'DATABASE_URL is required for subscription invariant check in strict mode (CI/staging).',
      );
      process.exit(1);
    }

    console.log(
      'Subscription invariant check skipped: DATABASE_URL is not set (non-strict local mode).',
    );
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const indexResult = await client.query(
      `
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = $1
      `,
      [INDEX_NAME],
    );

    if (indexResult.rowCount !== 1) {
      throw new Error(`Missing index: ${INDEX_NAME}`);
    }

    const indexDef = indexResult.rows[0].indexdef || '';
    const hasPartialPredicate =
      indexDef.includes("status") &&
      indexDef.includes("'ACTIVE'") &&
      indexDef.includes("'TRIAL'") &&
      indexDef.includes("'SUSPENDED'");

    if (!hasPartialPredicate) {
      throw new Error(
        `Index ${INDEX_NAME} exists but does not enforce live-status partial predicate.`,
      );
    }

    const constraintResult = await client.query(
      `
      SELECT pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'CompanySubscription'
        AND c.conname = $1
      `,
      [CONSTRAINT_NAME],
    );

    if (constraintResult.rowCount !== 1) {
      throw new Error(`Missing constraint: ${CONSTRAINT_NAME}`);
    }

    const definition = constraintResult.rows[0].definition || '';
    const hasDateRule =
      definition.includes('"endDate" > "startDate"') ||
      definition.includes('(endDate > startDate)');

    if (!hasDateRule) {
      throw new Error(
        `Constraint ${CONSTRAINT_NAME} exists but has unexpected definition: ${definition}`,
      );
    }

    console.log('Subscription invariants are present and valid.');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Subscription invariant check failed:', error.message);
  process.exit(1);
});
