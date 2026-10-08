-- B01 Accounting Core
-- Additive migration. Legacy LedgerEntry/Balance and all business flows remain intact.
-- The idempotency repair is intentional: the local seeded database lost the
-- previously-applied idempotency table while its migration history remained.

DO $$ BEGIN
  CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "idempotency_records" (
  "id" UUID NOT NULL,
  "scope" VARCHAR(120) NOT NULL,
  "actorUserId" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "operationType" VARCHAR(80) NOT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_records_companyId_operationType_idempotencyKey_key"
  ON "idempotency_records"("companyId", "operationType", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "idempotency_records_expiresAt_idx"
  ON "idempotency_records"("expiresAt");
CREATE INDEX IF NOT EXISTS "idempotency_records_companyId_operationType_status_idx"
  ON "idempotency_records"("companyId", "operationType", "status");

CREATE OR REPLACE FUNCTION "set_idempotency_records_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "idempotency_records_set_updated_at" ON "idempotency_records";
CREATE TRIGGER "idempotency_records_set_updated_at"
BEFORE UPDATE ON "idempotency_records"
FOR EACH ROW EXECUTE FUNCTION "set_idempotency_records_updated_at"();

DO $$ BEGIN
  CREATE TYPE "AccountingAccountType" AS ENUM (
    'ASSET_RECEIVABLE', 'ASSET_CASH', 'ASSET_BANK', 'ASSET_CURRENT',
    'ASSET_INVENTORY', 'ASSET_PREPAID', 'ASSET_FIXED', 'ASSET_OTHER',
    'LIABILITY_PAYABLE', 'LIABILITY_CURRENT', 'LIABILITY_NON_CURRENT',
    'LIABILITY_TAX', 'EQUITY', 'INCOME_OPERATING_REVENUE', 'INCOME_OTHER',
    'EXPENSE_COGS', 'EXPENSE_OPERATING', 'EXPENSE_DEPRECIATION', 'EXPENSE_OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingJournalType" AS ENUM ('GENERAL', 'SALES', 'PURCHASE', 'CASH', 'BANK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'SOFT_CLOSED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JournalSourceType" AS ENUM (
    'MANUAL_JOURNAL', 'OPENING_BALANCE', 'SALES_INVOICE', 'CUSTOMER_PAYMENT',
    'PURCHASE_INVOICE', 'SUPPLIER_PAYMENT', 'EXPENSE', 'CASH_TRANSFER',
    'REVERSAL', 'MIGRATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "AccountingAccount" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "accountType" "AccountingAccountType" NOT NULL,
  "parentId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "allowDirectPosting" BOOLEAN NOT NULL DEFAULT true,
  "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingAccount_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "AccountingAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingAccount_parent_company_fkey" FOREIGN KEY ("parentId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountingAccount_companyId_code_key" ON "AccountingAccount"("companyId", "code");
CREATE INDEX "AccountingAccount_companyId_parentId_idx" ON "AccountingAccount"("companyId", "parentId");
CREATE INDEX "AccountingAccount_companyId_accountType_isActive_idx" ON "AccountingAccount"("companyId", "accountType", "isActive");

CREATE TABLE "AccountingJournal" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "type" "AccountingJournalType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingJournal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingJournal_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "AccountingJournal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountingJournal_companyId_code_key" ON "AccountingJournal"("companyId", "code");
CREATE INDEX "AccountingJournal_companyId_type_isActive_idx" ON "AccountingJournal"("companyId", "type", "isActive");

CREATE TABLE "FiscalYear" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FiscalYear_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "FiscalYear_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FiscalYear_date_order_chk" CHECK ("startDate" <= "endDate")
);
CREATE UNIQUE INDEX "FiscalYear_companyId_name_key" ON "FiscalYear"("companyId", "name");
CREATE INDEX "FiscalYear_companyId_startDate_endDate_idx" ON "FiscalYear"("companyId", "startDate", "endDate");
ALTER TABLE "FiscalYear" ADD CONSTRAINT "FiscalYear_no_overlap_excl"
  EXCLUDE USING gist ("companyId" WITH =, daterange("startDate", "endDate", '[]') WITH &&);

CREATE TABLE "AccountingPeriod" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "fiscalYearId" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPeriod_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "AccountingPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingPeriod_fiscalYear_company_fkey" FOREIGN KEY ("fiscalYearId", "companyId") REFERENCES "FiscalYear"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPeriod_date_order_chk" CHECK ("startDate" <= "endDate")
);
CREATE UNIQUE INDEX "AccountingPeriod_companyId_fiscalYearId_name_key" ON "AccountingPeriod"("companyId", "fiscalYearId", "name");
CREATE INDEX "AccountingPeriod_companyId_startDate_endDate_status_idx" ON "AccountingPeriod"("companyId", "startDate", "endDate", "status");
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_no_overlap_excl"
  EXCLUDE USING gist ("companyId" WITH =, daterange("startDate", "endDate", '[]') WITH &&);

CREATE TABLE "AccountingEntrySequence" (
  "companyId" UUID NOT NULL,
  "fiscalYearId" UUID NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingEntrySequence_pkey" PRIMARY KEY ("companyId", "fiscalYearId"),
  CONSTRAINT "AccountingEntrySequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingEntrySequence_fiscalYear_company_fkey" FOREIGN KEY ("fiscalYearId", "companyId") REFERENCES "FiscalYear"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingEntrySequence_nextValue_chk" CHECK ("nextValue" >= 1)
);

CREATE TABLE "JournalEntry" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "journalId" UUID NOT NULL,
  "accountingPeriodId" UUID NOT NULL,
  "entryNumber" VARCHAR(40) NOT NULL,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "postingDate" DATE NOT NULL,
  "documentDate" DATE,
  "description" VARCHAR(500) NOT NULL,
  "sourceType" "JournalSourceType" NOT NULL,
  "sourceId" UUID,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "postedById" UUID,
  "postedAt" TIMESTAMP(3),
  "reversalOfEntryId" UUID,
  "reversalReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntry_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_journal_company_fkey" FOREIGN KEY ("journalId", "companyId") REFERENCES "AccountingJournal"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_period_company_fkey" FOREIGN KEY ("accountingPeriodId", "companyId") REFERENCES "AccountingPeriod"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_reversal_company_fkey" FOREIGN KEY ("reversalOfEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JournalEntry_companyId_entryNumber_key" ON "JournalEntry"("companyId", "entryNumber");
CREATE UNIQUE INDEX "JournalEntry_companyId_sourceType_idempotencyKey_key" ON "JournalEntry"("companyId", "sourceType", "idempotencyKey");
CREATE INDEX "JournalEntry_companyId_postingDate_idx" ON "JournalEntry"("companyId", "postingDate");
CREATE INDEX "JournalEntry_companyId_journalId_postingDate_idx" ON "JournalEntry"("companyId", "journalId", "postingDate");
CREATE INDEX "JournalEntry_companyId_sourceType_sourceId_idx" ON "JournalEntry"("companyId", "sourceType", "sourceId");
CREATE INDEX "JournalEntry_companyId_status_idx" ON "JournalEntry"("companyId", "status");
CREATE INDEX "JournalEntry_companyId_accountingPeriodId_idx" ON "JournalEntry"("companyId", "accountingPeriodId");

CREATE TABLE "JournalLine" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "journalEntryId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "debit" DECIMAL(19,4) NOT NULL,
  "credit" DECIMAL(19,4) NOT NULL,
  "description" VARCHAR(500),
  "partyType" "PartyType",
  "partyId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JournalLine_entry_company_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JournalLine_account_company_fkey" FOREIGN KEY ("accountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JournalLine_amounts_chk" CHECK (
    "debit" >= 0 AND "credit" >= 0 AND
    (("debit" > 0 AND "credit" = 0) OR ("debit" = 0 AND "credit" > 0))
  )
);
CREATE INDEX "JournalLine_companyId_accountId_idx" ON "JournalLine"("companyId", "accountId");
CREATE INDEX "JournalLine_companyId_journalEntryId_idx" ON "JournalLine"("companyId", "journalEntryId");
CREATE INDEX "JournalLine_accountId_createdAt_idx" ON "JournalLine"("accountId", "createdAt");

CREATE OR REPLACE FUNCTION "accounting_validate_posted_entry"()
RETURNS TRIGGER AS $$
DECLARE
  line_count BIGINT;
  debit_total NUMERIC;
  credit_total NUMERIC;
BEGIN
  IF NEW."status" = 'POSTED' THEN
    SELECT COUNT(*), COALESCE(SUM("debit"), 0), COALESCE(SUM("credit"), 0)
      INTO line_count, debit_total, credit_total
      FROM "JournalLine"
     WHERE "journalEntryId" = NEW."id" AND "companyId" = NEW."companyId";
    IF line_count = 0 OR debit_total <> credit_total THEN
      RAISE EXCEPTION 'POSTED journal entry must have balanced debit and credit lines';
    END IF;
    IF NEW."postedAt" IS NULL OR NEW."postedById" IS NULL THEN
      RAISE EXCEPTION 'POSTED journal entry requires postedAt and postedById';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_protect_posted_entry"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Posted accounting entries cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" IN ('POSTED', 'REVERSED') THEN
    IF NEW."companyId" IS DISTINCT FROM OLD."companyId"
      OR NEW."journalId" IS DISTINCT FROM OLD."journalId"
      OR NEW."accountingPeriodId" IS DISTINCT FROM OLD."accountingPeriodId"
      OR NEW."entryNumber" IS DISTINCT FROM OLD."entryNumber"
      OR NEW."postingDate" IS DISTINCT FROM OLD."postingDate"
      OR NEW."documentDate" IS DISTINCT FROM OLD."documentDate"
      OR NEW."description" IS DISTINCT FROM OLD."description"
      OR NEW."sourceType" IS DISTINCT FROM OLD."sourceType"
      OR NEW."sourceId" IS DISTINCT FROM OLD."sourceId"
      OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey"
      OR NEW."requestHash" IS DISTINCT FROM OLD."requestHash"
      OR NEW."postedById" IS DISTINCT FROM OLD."postedById"
      OR NEW."postedAt" IS DISTINCT FROM OLD."postedAt"
      OR NEW."reversalOfEntryId" IS DISTINCT FROM OLD."reversalOfEntryId"
      OR NEW."reversalReason" IS DISTINCT FROM OLD."reversalReason"
      OR (OLD."status" = 'REVERSED' AND NEW."status" IS DISTINCT FROM OLD."status")
      OR (OLD."status" = 'POSTED' AND NEW."status" NOT IN ('POSTED', 'REVERSED')) THEN
      RAISE EXCEPTION 'Posted accounting entry financial content is immutable';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_protect_posted_line"()
RETURNS TRIGGER AS $$
DECLARE
  entry_status "JournalEntryStatus";
BEGIN
  SELECT "status" INTO entry_status
    FROM "JournalEntry"
   WHERE "id" = COALESCE(NEW."journalEntryId", OLD."journalEntryId")
     AND "companyId" = COALESCE(NEW."companyId", OLD."companyId");
  IF entry_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Posted accounting journal lines are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "accounting_validate_posted_entry_trigger"
BEFORE INSERT OR UPDATE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_validate_posted_entry"();
CREATE TRIGGER "accounting_protect_posted_entry_trigger"
BEFORE UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_protect_posted_entry"();
CREATE TRIGGER "accounting_protect_posted_line_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION "accounting_protect_posted_line"();
