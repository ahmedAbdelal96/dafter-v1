-- Reconcile pre-B01 schema drift so a fresh shadow database reproduces
-- prisma/schema.prisma exactly. This migration adds the existing tax setup
-- foundation and records legacy constraint/default/index corrections.

CREATE TYPE "TaxRegistrationStatus" AS ENUM ('NOT_REGISTERED', 'PENDING', 'REGISTERED', 'SUSPENDED');
CREATE TYPE "TaxSetupReadinessStatus" AS ENUM ('NOT_CONFIGURED', 'PARTIALLY_CONFIGURED', 'READY');
CREATE TYPE "TaxLifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "TaxTreatmentCategory" AS ENUM ('STANDARD', 'ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE', 'CUSTOM');
CREATE TYPE "TaxCalculationMode" AS ENUM ('TAX_EXCLUSIVE', 'TAX_INCLUSIVE');
CREATE TYPE "TaxModuleKey" AS ENUM ('SALES', 'PURCHASES', 'EXPENSES', 'JOURNALS');

ALTER TABLE "AccountingConfigurationAccount" DROP CONSTRAINT "AccountingConfigurationAccount_companyId_fkey";
ALTER TABLE "AccountingConfigurationJournal" DROP CONSTRAINT "AccountingConfigurationJournal_companyId_fkey";
DROP INDEX "CompanySubscription_one_live_per_company_idx";

ALTER TABLE "JournalEntry"
  ALTER COLUMN "transactionCurrencyCode" DROP DEFAULT,
  ALTER COLUMN "exchangeRate" DROP DEFAULT;
ALTER TABLE "JournalLine"
  ALTER COLUMN "transactionDebit" DROP DEFAULT,
  ALTER COLUMN "transactionCredit" DROP DEFAULT;
ALTER TABLE "idempotency_records"
  ALTER COLUMN "lockedUntil" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

CREATE TABLE "TaxRegistrationProfile" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "countryCode" TEXT NOT NULL,
  "regimeCode" TEXT,
  "vatRegistrationStatus" "TaxRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
  "vatRegistrationNumber" TEXT,
  "legalTaxName" TEXT,
  "registrationEffectiveDate" TIMESTAMP(3),
  "taxAddressLine1" TEXT,
  "taxAddressLine2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "postalCode" TEXT,
  "readinessStatus" "TaxSetupReadinessStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRegistrationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxTreatment" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "TaxTreatmentCategory" NOT NULL,
  "calculationMode" "TaxCalculationMode" NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "status" "TaxLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxTreatment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxRate" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "treatmentId" UUID,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "percentage" DECIMAL(9,4) NOT NULL,
  "status" "TaxLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxDefaultPolicy" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "defaultCalculationMode" "TaxCalculationMode" NOT NULL DEFAULT 'TAX_EXCLUSIVE',
  "defaultRateId" UUID,
  "defaultTreatmentId" UUID,
  "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxDefaultPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxAccountBinding" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "taxPayableAccountCode" TEXT,
  "recoverableTaxAccountCode" TEXT,
  "outputTaxAccountCode" TEXT,
  "inputTaxAccountCode" TEXT,
  "roundingAccountCode" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxAccountBinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxModuleApplicabilityRule" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "moduleKey" "TaxModuleKey" NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "allowOverride" BOOLEAN NOT NULL DEFAULT true,
  "defaultRateId" UUID,
  "defaultTreatmentId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxModuleApplicabilityRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaxRegistrationProfile_companyId_key" ON "TaxRegistrationProfile"("companyId");
CREATE INDEX "TaxRegistrationProfile_companyId_vatRegistrationStatus_idx" ON "TaxRegistrationProfile"("companyId", "vatRegistrationStatus");
CREATE INDEX "TaxRegistrationProfile_companyId_readinessStatus_idx" ON "TaxRegistrationProfile"("companyId", "readinessStatus");
CREATE INDEX "TaxTreatment_companyId_status_idx" ON "TaxTreatment"("companyId", "status");
CREATE INDEX "TaxTreatment_companyId_category_idx" ON "TaxTreatment"("companyId", "category");
CREATE UNIQUE INDEX "TaxTreatment_companyId_normalizedCode_key" ON "TaxTreatment"("companyId", "normalizedCode");
CREATE INDEX "TaxRate_companyId_status_idx" ON "TaxRate"("companyId", "status");
CREATE INDEX "TaxRate_companyId_treatmentId_idx" ON "TaxRate"("companyId", "treatmentId");
CREATE INDEX "TaxRate_companyId_percentage_idx" ON "TaxRate"("companyId", "percentage");
CREATE UNIQUE INDEX "TaxRate_companyId_normalizedCode_key" ON "TaxRate"("companyId", "normalizedCode");
CREATE UNIQUE INDEX "TaxDefaultPolicy_companyId_key" ON "TaxDefaultPolicy"("companyId");
CREATE INDEX "TaxDefaultPolicy_companyId_defaultCalculationMode_idx" ON "TaxDefaultPolicy"("companyId", "defaultCalculationMode");
CREATE UNIQUE INDEX "TaxAccountBinding_companyId_key" ON "TaxAccountBinding"("companyId");
CREATE INDEX "TaxAccountBinding_companyId_idx" ON "TaxAccountBinding"("companyId");
CREATE INDEX "TaxModuleApplicabilityRule_companyId_isEnabled_idx" ON "TaxModuleApplicabilityRule"("companyId", "isEnabled");
CREATE UNIQUE INDEX "TaxModuleApplicabilityRule_companyId_moduleKey_key" ON "TaxModuleApplicabilityRule"("companyId", "moduleKey");
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

ALTER TABLE "AccountingAccount" RENAME CONSTRAINT "AccountingAccount_parent_company_fkey" TO "AccountingAccount_parentId_companyId_fkey";
ALTER TABLE "AccountingConfigurationAccount" RENAME CONSTRAINT "AccountingConfigurationAccount_account_company_fkey" TO "AccountingConfigurationAccount_accountId_companyId_fkey";
ALTER TABLE "AccountingConfigurationAccount" RENAME CONSTRAINT "AccountingConfigurationAccount_configuration_company_fkey" TO "AccountingConfigurationAccount_configurationId_companyId_fkey";
ALTER TABLE "AccountingConfigurationJournal" RENAME CONSTRAINT "AccountingConfigurationJournal_configuration_company_fkey" TO "AccountingConfigurationJournal_configurationId_companyId_fkey";
ALTER TABLE "AccountingConfigurationJournal" RENAME CONSTRAINT "AccountingConfigurationJournal_journal_company_fkey" TO "AccountingConfigurationJournal_journalId_companyId_fkey";
ALTER TABLE "AccountingEntrySequence" RENAME CONSTRAINT "AccountingEntrySequence_fiscalYear_company_fkey" TO "AccountingEntrySequence_fiscalYearId_companyId_fkey";
ALTER TABLE "AccountingPeriod" RENAME CONSTRAINT "AccountingPeriod_fiscalYear_company_fkey" TO "AccountingPeriod_fiscalYearId_companyId_fkey";
ALTER TABLE "JournalEntry" RENAME CONSTRAINT "JournalEntry_journal_company_fkey" TO "JournalEntry_journalId_companyId_fkey";
ALTER TABLE "JournalEntry" RENAME CONSTRAINT "JournalEntry_period_company_fkey" TO "JournalEntry_accountingPeriodId_companyId_fkey";
ALTER TABLE "JournalEntry" RENAME CONSTRAINT "JournalEntry_reversal_company_fkey" TO "JournalEntry_reversalOfEntryId_companyId_fkey";
ALTER TABLE "JournalLine" RENAME CONSTRAINT "JournalLine_account_company_fkey" TO "JournalLine_accountId_companyId_fkey";
ALTER TABLE "JournalLine" RENAME CONSTRAINT "JournalLine_entry_company_fkey" TO "JournalLine_journalEntryId_companyId_fkey";

ALTER TABLE "TaxRegistrationProfile" ADD CONSTRAINT "TaxRegistrationProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxTreatment" ADD CONSTRAINT "TaxTreatment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "TaxTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxDefaultPolicy" ADD CONSTRAINT "TaxDefaultPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxDefaultPolicy" ADD CONSTRAINT "TaxDefaultPolicy_defaultRateId_fkey" FOREIGN KEY ("defaultRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxDefaultPolicy" ADD CONSTRAINT "TaxDefaultPolicy_defaultTreatmentId_fkey" FOREIGN KEY ("defaultTreatmentId") REFERENCES "TaxTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxAccountBinding" ADD CONSTRAINT "TaxAccountBinding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxModuleApplicabilityRule" ADD CONSTRAINT "TaxModuleApplicabilityRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxModuleApplicabilityRule" ADD CONSTRAINT "TaxModuleApplicabilityRule_defaultRateId_fkey" FOREIGN KEY ("defaultRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxModuleApplicabilityRule" ADD CONSTRAINT "TaxModuleApplicabilityRule_defaultTreatmentId_fkey" FOREIGN KEY ("defaultTreatmentId") REFERENCES "TaxTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER INDEX "AccountingConfigurationAccount_companyId_configurationId_settin" RENAME TO "AccountingConfigurationAccount_companyId_configurationId_se_key";
ALTER INDEX "AccountingConfigurationJournal_companyId_configurationId_settin" RENAME TO "AccountingConfigurationJournal_companyId_configurationId_se_key";
