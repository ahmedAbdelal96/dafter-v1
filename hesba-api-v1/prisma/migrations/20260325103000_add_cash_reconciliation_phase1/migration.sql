-- Phase 1: Optional cash reconciliation (operational only)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashReconciliationMode') THEN
    CREATE TYPE "CashReconciliationMode" AS ENUM ('DISABLED', 'SIMPLE_DAILY');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashReconciliationStatus') THEN
    CREATE TYPE "CashReconciliationStatus" AS ENUM ('DRAFT', 'CLOSED');
  END IF;
END$$;

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "cashReconciliationMode" "CashReconciliationMode" NOT NULL DEFAULT 'DISABLED',
  ADD COLUMN IF NOT EXISTS "cashModeUpdatedByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "cashModeUpdatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CashReconciliationDaily" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "businessDate" DATE NOT NULL,
  "status" "CashReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
  "openingCash" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "cashSalesOutsideSystem" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "cashExpensesOutsideSystem" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "actualCashCounted" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "expectedCash" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "variance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "note" TEXT,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "closedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),

  CONSTRAINT "CashReconciliationDaily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashReconciliationDaily_companyId_fkey" FOREIGN KEY ("companyId")
    REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CashReconciliationDaily_companyId_businessDate_key"
  ON "CashReconciliationDaily"("companyId", "businessDate");

CREATE INDEX IF NOT EXISTS "CashReconciliationDaily_companyId_status_businessDate_idx"
  ON "CashReconciliationDaily"("companyId", "status", "businessDate");

CREATE INDEX IF NOT EXISTS "CashReconciliationDaily_companyId_createdAt_idx"
  ON "CashReconciliationDaily"("companyId", "createdAt");
