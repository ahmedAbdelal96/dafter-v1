-- B01 architecture update: multi-currency, reconciliation-ready lines,
-- first-class company accounting configuration, and future dimensions boundary.

DO $$ BEGIN
  CREATE TYPE "AccountingConfigAccountKey" AS ENUM (
    'RECEIVABLE', 'PAYABLE', 'INCOME', 'EXPENSE', 'RETAINED_EARNINGS',
    'EXCHANGE_GAIN', 'EXCHANGE_LOSS', 'ROUNDING', 'TAX_PAYABLE',
    'TAX_RECOVERABLE', 'INVENTORY', 'COGS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingConfigJournalKey" AS ENUM (
    'GENERAL', 'SALES', 'PURCHASE', 'CASH', 'BANK', 'EXCHANGE_DIFFERENCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "AccountingAccount"
  ADD COLUMN "currencyCode" CHAR(3),
  ADD COLUMN "reconciliationEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccountingJournal"
  ADD COLUMN "currencyCode" CHAR(3);
ALTER TABLE "JournalEntry"
  ADD COLUMN "dueDate" DATE,
  ADD COLUMN "transactionCurrencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
  ADD COLUMN "exchangeRate" DECIMAL(19,8) NOT NULL DEFAULT 1.00000000,
  ADD COLUMN "documentReference" VARCHAR(120);
ALTER TABLE "JournalLine"
  ADD COLUMN "transactionDebit" DECIMAL(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN "transactionCredit" DECIMAL(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN "dueDate" DATE,
  ADD COLUMN "documentReference" VARCHAR(120),
  ADD COLUMN "reconciliationReference" VARCHAR(160),
  ADD COLUMN "taxCode" VARCHAR(40),
  ADD COLUMN "taxTreatmentCode" VARCHAR(40),
  ADD COLUMN "taxRate" DECIMAL(9,4);

ALTER TABLE "AccountingAccount"
  ADD CONSTRAINT "AccountingAccount_currency_code_chk"
  CHECK ("currencyCode" IS NULL OR btrim("currencyCode") ~ '^[A-Z]{3}$');
ALTER TABLE "AccountingJournal"
  ADD CONSTRAINT "AccountingJournal_currency_code_chk"
  CHECK ("currencyCode" IS NULL OR btrim("currencyCode") ~ '^[A-Z]{3}$');
ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_currency_code_chk"
  CHECK (btrim("transactionCurrencyCode") ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "JournalEntry_exchange_rate_chk"
  CHECK ("exchangeRate" > 0);
ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_transaction_amounts_chk"
  CHECK (
    "transactionDebit" >= 0 AND "transactionCredit" >= 0 AND
    (("transactionDebit" > 0 AND "transactionCredit" = 0)
      OR ("transactionDebit" = 0 AND "transactionCredit" > 0))
  );
ALTER TABLE "JournalLine"
  ADD CONSTRAINT "JournalLine_tax_rate_chk"
  CHECK ("taxRate" IS NULL OR "taxRate" >= 0);

CREATE UNIQUE INDEX "JournalEntry_companyId_reversalOfEntryId_key"
  ON "JournalEntry"("companyId", "reversalOfEntryId");

CREATE TABLE "AccountingConfiguration" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "baseCurrencyCode" CHAR(3) NOT NULL,
  "reportingCurrencyCode" CHAR(3),
  "countryCode" CHAR(2) NOT NULL,
  "localeCode" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingConfiguration_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "AccountingConfiguration_companyId_key" UNIQUE ("companyId"),
  CONSTRAINT "AccountingConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingConfiguration_base_currency_chk" CHECK (btrim("baseCurrencyCode") ~ '^[A-Z]{3}$'),
  CONSTRAINT "AccountingConfiguration_reporting_currency_chk" CHECK ("reportingCurrencyCode" IS NULL OR btrim("reportingCurrencyCode") ~ '^[A-Z]{3}$')
);

CREATE TABLE "AccountingConfigurationAccount" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "configurationId" UUID NOT NULL,
  "settingKey" "AccountingConfigAccountKey" NOT NULL,
  "accountId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingConfigurationAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingConfigurationAccount_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "AccountingConfigurationAccount_companyId_configurationId_settingKey_key" UNIQUE ("companyId", "configurationId", "settingKey"),
  CONSTRAINT "AccountingConfigurationAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingConfigurationAccount_configuration_company_fkey" FOREIGN KEY ("configurationId", "companyId") REFERENCES "AccountingConfiguration"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingConfigurationAccount_account_company_fkey" FOREIGN KEY ("accountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AccountingConfigurationAccount_companyId_accountId_idx"
  ON "AccountingConfigurationAccount"("companyId", "accountId");

CREATE TABLE "AccountingConfigurationJournal" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "configurationId" UUID NOT NULL,
  "settingKey" "AccountingConfigJournalKey" NOT NULL,
  "journalId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingConfigurationJournal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingConfigurationJournal_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "AccountingConfigurationJournal_companyId_configurationId_settingKey_key" UNIQUE ("companyId", "configurationId", "settingKey"),
  CONSTRAINT "AccountingConfigurationJournal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingConfigurationJournal_configuration_company_fkey" FOREIGN KEY ("configurationId", "companyId") REFERENCES "AccountingConfiguration"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountingConfigurationJournal_journal_company_fkey" FOREIGN KEY ("journalId", "companyId") REFERENCES "AccountingJournal"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AccountingConfigurationJournal_companyId_journalId_idx"
  ON "AccountingConfigurationJournal"("companyId", "journalId");

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
      OR NEW."dueDate" IS DISTINCT FROM OLD."dueDate"
      OR NEW."transactionCurrencyCode" IS DISTINCT FROM OLD."transactionCurrencyCode"
      OR NEW."exchangeRate" IS DISTINCT FROM OLD."exchangeRate"
      OR NEW."documentReference" IS DISTINCT FROM OLD."documentReference"
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
