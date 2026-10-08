-- STEP 1 (P0-1): Subscription invariant hardening
-- 1) Self-heal duplicate live subscriptions deterministically.
-- 2) Enforce one-live-subscription invariant at DB level.
-- 3) Enforce temporal validity: endDate > startDate.

WITH ranked_live AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "companyId"
      ORDER BY
        CASE "status"
          WHEN 'ACTIVE' THEN 1
          WHEN 'TRIAL' THEN 2
          WHEN 'SUSPENDED' THEN 3
          ELSE 99
        END ASC,
        "endDate" DESC,
        "createdAt" DESC,
        id DESC
    ) AS rn
  FROM "CompanySubscription"
  WHERE "status" IN ('ACTIVE', 'TRIAL', 'SUSPENDED')
)
UPDATE "CompanySubscription" cs
SET
  "status" = 'EXPIRED',
  "updatedAt" = NOW()
FROM ranked_live rl
WHERE cs.id = rl.id
  AND rl.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "CompanySubscription_one_live_per_company_idx"
ON "CompanySubscription" ("companyId")
WHERE "status" IN ('ACTIVE', 'TRIAL', 'SUSPENDED');

ALTER TABLE "CompanySubscription"
DROP CONSTRAINT IF EXISTS "CompanySubscription_end_after_start_chk";

ALTER TABLE "CompanySubscription"
ADD CONSTRAINT "CompanySubscription_end_after_start_chk"
CHECK ("endDate" > "startDate");
