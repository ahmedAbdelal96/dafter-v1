-- Subscription governance hardening
-- 1) Self-heal historical data inconsistencies (multiple live subscriptions).
-- 2) Enforce invariant at DB level going forward.

WITH ranked_live AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "companyId"
      ORDER BY "createdAt" DESC
    ) AS rn
  FROM "CompanySubscription"
  WHERE "status" IN ('TRIAL', 'ACTIVE', 'SUSPENDED')
)
UPDATE "CompanySubscription" cs
SET
  "status" = 'EXPIRED',
  "updatedAt" = NOW()
FROM ranked_live rl
WHERE cs.id = rl.id
  AND rl.rn > 1;

CREATE UNIQUE INDEX "CompanySubscription_one_live_per_company_idx"
ON "CompanySubscription" ("companyId")
WHERE "status" IN ('TRIAL', 'ACTIVE', 'SUSPENDED');

