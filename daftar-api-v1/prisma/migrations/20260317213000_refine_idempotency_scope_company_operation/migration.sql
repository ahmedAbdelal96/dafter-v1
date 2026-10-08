-- Add operationType for mutation segregation
ALTER TABLE "idempotency_records"
  ADD COLUMN "operationType" VARCHAR(80);

-- Backfill operationType from existing scope values to keep previous data readable
UPDATE "idempotency_records"
SET "operationType" = CASE
  WHEN "scope" LIKE '%.activate' THEN 'activate'
  WHEN "scope" LIKE '%.suspend' THEN 'suspend'
  WHEN "scope" LIKE '%.extend' THEN 'extend'
  ELSE 'unknown'
END
WHERE "operationType" IS NULL;

-- This table is used for company-scoped lifecycle mutations only.
-- Remove non-company rows before enforcing NOT NULL boundary.
DELETE FROM "idempotency_records"
WHERE "companyId" IS NULL;

ALTER TABLE "idempotency_records"
  ALTER COLUMN "operationType" SET NOT NULL,
  ALTER COLUMN "companyId" SET NOT NULL;

-- Replace old uniqueness model (scope + actor + key)
DROP INDEX IF EXISTS "idempotency_records_scope_actorUserId_idempotencyKey_key";

CREATE UNIQUE INDEX "idempotency_records_companyId_operationType_idempotencyKey_key"
  ON "idempotency_records"("companyId", "operationType", "idempotencyKey");

DROP INDEX IF EXISTS "idempotency_records_companyId_scope_status_idx";
CREATE INDEX "idempotency_records_companyId_operationType_status_idx"
  ON "idempotency_records"("companyId", "operationType", "status");
