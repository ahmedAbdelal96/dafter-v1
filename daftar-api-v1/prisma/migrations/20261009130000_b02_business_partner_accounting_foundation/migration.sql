-- CreateEnum
CREATE TYPE "BusinessPartnerType" AS ENUM ('ORGANIZATION', 'PERSON');

-- CreateEnum
CREATE TYPE "BusinessPartnerAddressType" AS ENUM ('BILLING', 'SHIPPING', 'REGISTERED', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentTermLineType" AS ENUM ('PERCENT', 'BALANCE');

-- CreateEnum
CREATE TYPE "AccountingSetupStatus" AS ENUM ('NOT_CONFIGURED', 'IN_PROGRESS', 'READY', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OpeningBalanceBatchStatus" AS ENUM ('DRAFT', 'VALIDATED', 'POSTED', 'REVERSED');

-- AlterTable
ALTER TABLE "AccountingAccount" ADD COLUMN     "templateCode" VARCHAR(40),
ADD COLUMN     "templateKey" VARCHAR(80),
ADD COLUMN     "templateVersion" INTEGER;

-- AlterTable
ALTER TABLE "JournalLine" DROP COLUMN "partyId",
DROP COLUMN "partyType",
ADD COLUMN     "businessPartnerId" UUID;

-- CreateTable
CREATE TABLE "BusinessPartner" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "partnerCode" VARCHAR(40) NOT NULL,
    "partnerType" "BusinessPartnerType" NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(200),
    "taxRegistrationNumber" VARCHAR(80),
    "commercialRegistrationNumber" VARCHAR(80),
    "email" VARCHAR(320),
    "phone" VARCHAR(40),
    "website" VARCHAR(255),
    "notes" VARCHAR(2000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "businessPartnerId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "paymentTermId" UUID,
    "creditLimit" DECIMAL(19,4),
    "receivableAccountId" UUID,
    "preferredCurrencyCode" CHAR(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("businessPartnerId")
);

-- CreateTable
CREATE TABLE "SupplierProfile" (
    "businessPartnerId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "paymentTermId" UUID,
    "payableAccountId" UUID,
    "preferredCurrencyCode" CHAR(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProfile_pkey" PRIMARY KEY ("businessPartnerId")
);

-- CreateTable
CREATE TABLE "BusinessPartnerAddress" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "addressType" "BusinessPartnerAddressType" NOT NULL,
    "line1" VARCHAR(200) NOT NULL,
    "line2" VARCHAR(200),
    "city" VARCHAR(100),
    "region" VARCHAR(100),
    "postalCode" VARCHAR(30),
    "countryCode" CHAR(2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPartnerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPartnerContact" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "jobTitle" VARCHAR(120),
    "email" VARCHAR(320),
    "phone" VARCHAR(40),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPartnerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerm" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTermLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "paymentTermId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "calculationType" "PaymentTermLineType" NOT NULL,
    "percentage" DECIMAL(9,4),
    "dueDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTermLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingTemplate" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "defaultCurrencyCode" CHAR(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingTemplateAccount" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "stableKey" VARCHAR(80) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "arabicName" VARCHAR(200) NOT NULL,
    "englishName" VARCHAR(200) NOT NULL,
    "accountType" "AccountingAccountType" NOT NULL,
    "parentId" UUID,
    "allowDirectPosting" BOOLEAN NOT NULL DEFAULT true,
    "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationEligible" BOOLEAN NOT NULL DEFAULT false,
    "systemKey" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingTemplateAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalanceBatch" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "accountingPeriodId" UUID NOT NULL,
    "status" "OpeningBalanceBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "description" VARCHAR(500) NOT NULL,
    "createdById" UUID NOT NULL,
    "postedById" UUID,
    "journalEntryId" UUID,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningBalanceBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalanceLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "businessPartnerId" UUID,
    "debit" DECIMAL(19,4) NOT NULL,
    "credit" DECIMAL(19,4) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpeningBalanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingSetup" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "status" "AccountingSetupStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "templateCode" VARCHAR(40) NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "lastError" VARCHAR(2000),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingSetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessPartner_companyId_isActive_displayName_idx" ON "BusinessPartner"("companyId", "isActive", "displayName");

-- CreateIndex
CREATE INDEX "BusinessPartner_companyId_legalName_idx" ON "BusinessPartner"("companyId", "legalName");

-- CreateIndex
CREATE INDEX "BusinessPartner_companyId_phone_idx" ON "BusinessPartner"("companyId", "phone");

-- CreateIndex
CREATE INDEX "BusinessPartner_companyId_taxRegistrationNumber_idx" ON "BusinessPartner"("companyId", "taxRegistrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartner_id_companyId_key" ON "BusinessPartner"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartner_companyId_partnerCode_key" ON "BusinessPartner"("companyId", "partnerCode");

-- CreateIndex
CREATE INDEX "CustomerProfile_companyId_paymentTermId_idx" ON "CustomerProfile"("companyId", "paymentTermId");

-- CreateIndex
CREATE INDEX "CustomerProfile_companyId_receivableAccountId_idx" ON "CustomerProfile"("companyId", "receivableAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_businessPartnerId_companyId_key" ON "CustomerProfile"("businessPartnerId", "companyId");

-- CreateIndex
CREATE INDEX "SupplierProfile_companyId_paymentTermId_idx" ON "SupplierProfile"("companyId", "paymentTermId");

-- CreateIndex
CREATE INDEX "SupplierProfile_companyId_payableAccountId_idx" ON "SupplierProfile"("companyId", "payableAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProfile_businessPartnerId_companyId_key" ON "SupplierProfile"("businessPartnerId", "companyId");

-- CreateIndex
CREATE INDEX "BusinessPartnerAddress_companyId_businessPartnerId_addressT_idx" ON "BusinessPartnerAddress"("companyId", "businessPartnerId", "addressType");

-- CreateIndex
CREATE INDEX "BusinessPartnerAddress_companyId_businessPartnerId_isDefaul_idx" ON "BusinessPartnerAddress"("companyId", "businessPartnerId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartnerAddress_id_companyId_key" ON "BusinessPartnerAddress"("id", "companyId");

-- CreateIndex
CREATE INDEX "BusinessPartnerContact_companyId_businessPartnerId_isPrimar_idx" ON "BusinessPartnerContact"("companyId", "businessPartnerId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPartnerContact_id_companyId_key" ON "BusinessPartnerContact"("id", "companyId");

-- CreateIndex
CREATE INDEX "PaymentTerm_companyId_isActive_name_idx" ON "PaymentTerm"("companyId", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_id_companyId_key" ON "PaymentTerm"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTerm_companyId_code_key" ON "PaymentTerm"("companyId", "code");

-- CreateIndex
CREATE INDEX "PaymentTermLine_companyId_paymentTermId_sequence_idx" ON "PaymentTermLine"("companyId", "paymentTermId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTermLine_id_companyId_key" ON "PaymentTermLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTermLine_companyId_paymentTermId_sequence_key" ON "PaymentTermLine"("companyId", "paymentTermId", "sequence");

-- CreateIndex
CREATE INDEX "AccountingTemplate_countryCode_isActive_idx" ON "AccountingTemplate"("countryCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingTemplate_code_version_key" ON "AccountingTemplate"("code", "version");

-- CreateIndex
CREATE INDEX "AccountingTemplateAccount_templateId_parentId_idx" ON "AccountingTemplateAccount"("templateId", "parentId");

-- CreateIndex
CREATE INDEX "AccountingTemplateAccount_templateId_systemKey_idx" ON "AccountingTemplateAccount"("templateId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingTemplateAccount_id_templateId_key" ON "AccountingTemplateAccount"("id", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingTemplateAccount_templateId_stableKey_key" ON "AccountingTemplateAccount"("templateId", "stableKey");

-- CreateIndex
CREATE INDEX "OpeningBalanceBatch_companyId_status_effectiveDate_idx" ON "OpeningBalanceBatch"("companyId", "status", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceBatch_id_companyId_key" ON "OpeningBalanceBatch"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceBatch_companyId_idempotencyKey_key" ON "OpeningBalanceBatch"("companyId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceBatch_companyId_journalEntryId_key" ON "OpeningBalanceBatch"("companyId", "journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceBatch_journalEntryId_companyId_key" ON "OpeningBalanceBatch"("journalEntryId", "companyId");

-- CreateIndex
CREATE INDEX "OpeningBalanceLine_companyId_batchId_idx" ON "OpeningBalanceLine"("companyId", "batchId");

-- CreateIndex
CREATE INDEX "OpeningBalanceLine_companyId_accountId_idx" ON "OpeningBalanceLine"("companyId", "accountId");

-- CreateIndex
CREATE INDEX "OpeningBalanceLine_companyId_businessPartnerId_idx" ON "OpeningBalanceLine"("companyId", "businessPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceLine_id_companyId_key" ON "OpeningBalanceLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingSetup_companyId_key" ON "AccountingSetup"("companyId");

-- CreateIndex
CREATE INDEX "AccountingSetup_status_idx" ON "AccountingSetup"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingSetup_id_companyId_key" ON "AccountingSetup"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_companyId_templateKey_key" ON "AccountingAccount"("companyId", "templateKey");

-- CreateIndex
CREATE INDEX "JournalLine_companyId_businessPartnerId_idx" ON "JournalLine"("companyId", "businessPartnerId");

-- AddForeignKey
ALTER TABLE "BusinessPartner" ADD CONSTRAINT "BusinessPartner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_paymentTermId_companyId_fkey" FOREIGN KEY ("paymentTermId", "companyId") REFERENCES "PaymentTerm"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_receivableAccountId_companyId_fkey" FOREIGN KEY ("receivableAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_preferredCurrencyCode_fkey" FOREIGN KEY ("preferredCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_paymentTermId_companyId_fkey" FOREIGN KEY ("paymentTermId", "companyId") REFERENCES "PaymentTerm"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_payableAccountId_companyId_fkey" FOREIGN KEY ("payableAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_preferredCurrencyCode_fkey" FOREIGN KEY ("preferredCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPartnerAddress" ADD CONSTRAINT "BusinessPartnerAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPartnerAddress" ADD CONSTRAINT "BusinessPartnerAddress_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPartnerContact" ADD CONSTRAINT "BusinessPartnerContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPartnerContact" ADD CONSTRAINT "BusinessPartnerContact_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerm" ADD CONSTRAINT "PaymentTerm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTermLine" ADD CONSTRAINT "PaymentTermLine_paymentTermId_companyId_fkey" FOREIGN KEY ("paymentTermId", "companyId") REFERENCES "PaymentTerm"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTemplate" ADD CONSTRAINT "AccountingTemplate_defaultCurrencyCode_fkey" FOREIGN KEY ("defaultCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTemplateAccount" ADD CONSTRAINT "AccountingTemplateAccount_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AccountingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTemplateAccount" ADD CONSTRAINT "AccountingTemplateAccount_parentId_templateId_fkey" FOREIGN KEY ("parentId", "templateId") REFERENCES "AccountingTemplateAccount"("id", "templateId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_accountingPeriodId_companyId_fkey" FOREIGN KEY ("accountingPeriodId", "companyId") REFERENCES "AccountingPeriod"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_batchId_companyId_fkey" FOREIGN KEY ("batchId", "companyId") REFERENCES "OpeningBalanceBatch"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_accountId_companyId_fkey" FOREIGN KEY ("accountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingSetup" ADD CONSTRAINT "AccountingSetup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingSetup" ADD CONSTRAINT "AccountingSetup_templateCode_templateVersion_fkey" FOREIGN KEY ("templateCode", "templateVersion") REFERENCES "AccountingTemplate"("code", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentTermLine"
  ADD CONSTRAINT "PaymentTermLine_valid_schedule_values_check"
  CHECK (
    "dueDays" >= 0
    AND (
      ("calculationType" = 'PERCENT' AND "percentage" > 0 AND "percentage" <= 100)
      OR ("calculationType" = 'BALANCE' AND "percentage" IS NULL)
    )
  );

ALTER TABLE "OpeningBalanceLine"
  ADD CONSTRAINT "OpeningBalanceLine_non_negative_balanced_values_check"
  CHECK (
    "debit" >= 0
    AND "credit" >= 0
    AND NOT ("debit" > 0 AND "credit" > 0)
    AND ("debit" > 0 OR "credit" > 0)
  );

