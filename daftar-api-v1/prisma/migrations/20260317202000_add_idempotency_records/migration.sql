-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "idempotency_records" (
  "id" UUID NOT NULL,
  "scope" VARCHAR(120) NOT NULL,
  "actorUserId" UUID NOT NULL,
  "companyId" UUID,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "errorCode" VARCHAR(120),
  "lockedUntil" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "idempotency_records_scope_actorUserId_idempotencyKey_key"
  ON "idempotency_records"("scope", "actorUserId", "idempotencyKey");

CREATE INDEX "idempotency_records_expiresAt_idx"
  ON "idempotency_records"("expiresAt");

CREATE INDEX "idempotency_records_companyId_scope_status_idx"
  ON "idempotency_records"("companyId", "scope", "status");

-- Auto-update updatedAt on row updates
CREATE OR REPLACE FUNCTION "set_idempotency_records_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "idempotency_records_set_updated_at"
BEFORE UPDATE ON "idempotency_records"
FOR EACH ROW
EXECUTE FUNCTION "set_idempotency_records_updated_at"();
