import * as fs from 'fs';
import * as path from 'path';

describe('Subscription invariant migration', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../prisma/migrations/20260317180000_subscription_invariant_hardening/migration.sql',
  );

  it('contains deterministic self-heal ranking rule', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain("WHEN 'ACTIVE' THEN 1");
    expect(sql).toContain("WHEN 'TRIAL' THEN 2");
    expect(sql).toContain("WHEN 'SUSPENDED' THEN 3");
    expect(sql).toContain('"endDate" DESC');
    expect(sql).toContain('"createdAt" DESC');
  });

  it('enforces one-live-subscription partial unique index', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "CompanySubscription_one_live_per_company_idx"',
    );
    expect(sql).toContain(
      `WHERE "status" IN ('ACTIVE', 'TRIAL', 'SUSPENDED')`,
    );
  });

  it('enforces subscription date integrity constraint', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain(
      'ADD CONSTRAINT "CompanySubscription_end_after_start_chk"',
    );
    expect(sql).toContain('CHECK ("endDate" > "startDate")');
  });
});
