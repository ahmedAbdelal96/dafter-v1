-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SupplierPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "APReconciliationStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- AlterEnum
ALTER TYPE "JournalSourceType" ADD VALUE 'AP_RECONCILIATION';

-- CreateTable
CREATE TABLE "SupplierPaymentSequence" (
    "companyId" UUID NOT NULL,
    "fiscalYearId" UUID NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPaymentSequence_pkey" PRIMARY KEY ("companyId","fiscalYearId")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentNumber" VARCHAR(40),
    "paymentDate" DATE NOT NULL,
    "postingDate" DATE,
    "method" "SupplierPaymentMethod" NOT NULL,
    "sourceAccountId" UUID NOT NULL,
    "payableAccountId" UUID NOT NULL,
    "transactionCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(19,8) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "unappliedAmount" DECIMAL(19,4) NOT NULL,
    "notes" VARCHAR(2000),
    "reference" VARCHAR(200),
    "journalEntryId" UUID,
    "apJournalLineId" UUID,
    "reversalJournalEntryId" UUID,
    "idempotencyKey" VARCHAR(128),
    "requestHash" CHAR(64),
    "createdById" UUID NOT NULL,
    "postedById" UUID,
    "reversedById" UUID,
    "postedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" VARCHAR(500),
    "reversalIdempotencyKey" VARCHAR(128),
    "reversalRequestHash" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPaymentAllocation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierPaymentId" UUID NOT NULL,
    "journalLineId" UUID NOT NULL,
    "supplierInvoicePaymentScheduleId" UUID,
    "amount" DECIMAL(19,4) NOT NULL,
    "apReconciliationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APReconciliation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "debitJournalLineId" UUID NOT NULL,
    "creditJournalLineId" UUID NOT NULL,
    "supplierPaymentId" UUID,
    "transactionAmount" DECIMAL(19,4) NOT NULL,
    "debitBaseAmountApplied" DECIMAL(19,4) NOT NULL,
    "creditBaseAmountApplied" DECIMAL(19,4) NOT NULL,
    "realizedFxAmount" DECIMAL(19,4) NOT NULL,
    "status" "APReconciliationStatus" NOT NULL DEFAULT 'ACTIVE',
    "adjustmentJournalEntryId" UUID,
    "reversalJournalEntryId" UUID,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "createdById" UUID NOT NULL,
    "reversedById" UUID,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" VARCHAR(500),
    "reversalIdempotencyKey" VARCHAR(128),
    "reversalRequestHash" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPayment_companyId_status_paymentDate_idx" ON "SupplierPayment"("companyId", "status", "paymentDate");

-- CreateIndex
CREATE INDEX "SupplierPayment_companyId_businessPartnerId_paymentDate_idx" ON "SupplierPayment"("companyId", "businessPartnerId", "paymentDate");

-- CreateIndex
CREATE INDEX "SupplierPayment_companyId_payableAccountId_idx" ON "SupplierPayment"("companyId", "payableAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_id_companyId_key" ON "SupplierPayment"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_companyId_paymentNumber_key" ON "SupplierPayment"("companyId", "paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_companyId_idempotencyKey_key" ON "SupplierPayment"("companyId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_journalEntryId_companyId_key" ON "SupplierPayment"("journalEntryId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_apJournalLineId_companyId_key" ON "SupplierPayment"("apJournalLineId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_reversalJournalEntryId_companyId_key" ON "SupplierPayment"("reversalJournalEntryId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_companyId_reversalIdempotencyKey_key" ON "SupplierPayment"("companyId", "reversalIdempotencyKey");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_companyId_journalLineId_idx" ON "SupplierPaymentAllocation"("companyId", "journalLineId");

-- CreateIndex
CREATE INDEX "SupplierPaymentAllocation_companyId_supplierPaymentId_idx" ON "SupplierPaymentAllocation"("companyId", "supplierPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPaymentAllocation_id_companyId_key" ON "SupplierPaymentAllocation"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPaymentAllocation_apReconciliationId_companyId_key" ON "SupplierPaymentAllocation"("apReconciliationId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPaymentAllocation_companyId_supplierPaymentId_journ_key" ON "SupplierPaymentAllocation"("companyId", "supplierPaymentId", "journalLineId");

-- CreateIndex
CREATE INDEX "APReconciliation_companyId_debitJournalLineId_status_idx" ON "APReconciliation"("companyId", "debitJournalLineId", "status");

-- CreateIndex
CREATE INDEX "APReconciliation_companyId_creditJournalLineId_status_idx" ON "APReconciliation"("companyId", "creditJournalLineId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "APReconciliation_id_companyId_key" ON "APReconciliation"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "APReconciliation_companyId_idempotencyKey_key" ON "APReconciliation"("companyId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "APReconciliation_companyId_reversalIdempotencyKey_key" ON "APReconciliation"("companyId", "reversalIdempotencyKey");

-- AddForeignKey
ALTER TABLE "SupplierPaymentSequence" ADD CONSTRAINT "SupplierPaymentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentSequence" ADD CONSTRAINT "SupplierPaymentSequence_fiscalYearId_companyId_fkey" FOREIGN KEY ("fiscalYearId", "companyId") REFERENCES "FiscalYear"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_sourceAccountId_companyId_fkey" FOREIGN KEY ("sourceAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_payableAccountId_companyId_fkey" FOREIGN KEY ("payableAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_apJournalLineId_companyId_fkey" FOREIGN KEY ("apJournalLineId", "companyId") REFERENCES "JournalLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_reversalJournalEntryId_companyId_fkey" FOREIGN KEY ("reversalJournalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_supplierPaymentId_companyId_fkey" FOREIGN KEY ("supplierPaymentId", "companyId") REFERENCES "SupplierPayment"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_journalLineId_companyId_fkey" FOREIGN KEY ("journalLineId", "companyId") REFERENCES "JournalLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_supplierInvoicePaymentScheduleId_fkey" FOREIGN KEY ("supplierInvoicePaymentScheduleId", "companyId") REFERENCES "SupplierInvoicePaymentSchedule"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPaymentAllocation" ADD CONSTRAINT "SupplierPaymentAllocation_apReconciliationId_companyId_fkey" FOREIGN KEY ("apReconciliationId", "companyId") REFERENCES "APReconciliation"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_debitJournalLineId_companyId_fkey" FOREIGN KEY ("debitJournalLineId", "companyId") REFERENCES "JournalLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_creditJournalLineId_companyId_fkey" FOREIGN KEY ("creditJournalLineId", "companyId") REFERENCES "JournalLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_supplierPaymentId_companyId_fkey" FOREIGN KEY ("supplierPaymentId", "companyId") REFERENCES "SupplierPayment"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_adjustmentJournalEntryId_companyId_fkey" FOREIGN KEY ("adjustmentJournalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_reversalJournalEntryId_companyId_fkey" FOREIGN KEY ("reversalJournalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APReconciliation" ADD CONSTRAINT "APReconciliation_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierPayment"
  ADD CONSTRAINT "SupplierPayment_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "SupplierPayment_unapplied_nonnegative" CHECK ("unappliedAmount" >= 0),
  ADD CONSTRAINT "SupplierPayment_exchangeRate_positive" CHECK ("exchangeRate" > 0);
ALTER TABLE "SupplierPaymentAllocation"
  ADD CONSTRAINT "SupplierPaymentAllocation_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "APReconciliation"
  ADD CONSTRAINT "APReconciliation_transactionAmount_positive" CHECK ("transactionAmount" > 0),
  ADD CONSTRAINT "APReconciliation_debitBaseAmount_positive" CHECK ("debitBaseAmountApplied" > 0),
  ADD CONSTRAINT "APReconciliation_creditBaseAmount_positive" CHECK ("creditBaseAmountApplied" > 0);

CREATE OR REPLACE FUNCTION b06_validate_ap_reconciliation() RETURNS trigger AS $$
DECLARE
  debit_line RECORD;
  credit_line RECORD;
  existing_debit NUMERIC;
  existing_credit NUMERIC;
BEGIN
  SELECT jl.*, je."status" AS entry_status, je."transactionCurrencyCode" AS currency_code,
         je."sourceType" AS source_type, je."reversalOfEntryId" AS reversal_of_entry_id,
         aa."accountType" AS account_type, aa."isControlAccount" AS is_control,
         aa."reconciliationEligible" AS reconciliation_eligible
  INTO debit_line
  FROM "JournalLine" jl
  JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
  JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
  WHERE jl."id" = NEW."debitJournalLineId" AND jl."companyId" = NEW."companyId";
  SELECT jl.*, je."status" AS entry_status, je."transactionCurrencyCode" AS currency_code,
         je."sourceType" AS source_type, je."reversalOfEntryId" AS reversal_of_entry_id,
         aa."accountType" AS account_type, aa."isControlAccount" AS is_control,
         aa."reconciliationEligible" AS reconciliation_eligible
  INTO credit_line
  FROM "JournalLine" jl
  JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
  JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
  WHERE jl."id" = NEW."creditJournalLineId" AND jl."companyId" = NEW."companyId";
  IF debit_line IS NULL OR credit_line IS NULL
     OR debit_line.entry_status <> 'POSTED'
     OR credit_line.entry_status <> 'POSTED'
     OR debit_line.source_type IN ('AP_RECONCILIATION', 'REVERSAL')
     OR credit_line.source_type IN ('AP_RECONCILIATION', 'REVERSAL')
     OR debit_line.reversal_of_entry_id IS NOT NULL
     OR credit_line.reversal_of_entry_id IS NOT NULL
     OR debit_line."businessPartnerId" IS NULL
     OR debit_line."businessPartnerId" <> credit_line."businessPartnerId"
     OR debit_line.currency_code <> credit_line.currency_code
     OR debit_line.account_type <> 'LIABILITY_PAYABLE'
     OR credit_line.account_type <> 'LIABILITY_PAYABLE'
     OR NOT debit_line.is_control OR NOT debit_line.reconciliation_eligible
     OR NOT credit_line.is_control OR NOT credit_line.reconciliation_eligible
     OR debit_line."transactionDebit" <= debit_line."transactionCredit"
     OR credit_line."transactionCredit" <= credit_line."transactionDebit"
  THEN RAISE EXCEPTION 'AP reconciliation lines are not valid authoritative AP control lines';
  END IF;
  IF NEW."status" = 'ACTIVE' THEN
    SELECT COALESCE(SUM("transactionAmount"), 0)
      INTO existing_debit FROM "APReconciliation"
      WHERE "companyId" = NEW."companyId" AND "debitJournalLineId" = NEW."debitJournalLineId"
        AND "status" = 'ACTIVE' AND "id" <> NEW."id";
    SELECT COALESCE(SUM("transactionAmount"), 0)
      INTO existing_credit FROM "APReconciliation"
      WHERE "companyId" = NEW."companyId" AND "creditJournalLineId" = NEW."creditJournalLineId"
        AND "status" = 'ACTIVE' AND "id" <> NEW."id";
    IF NEW."transactionAmount" > debit_line."transactionDebit" - debit_line."transactionCredit" - existing_debit
       OR NEW."transactionAmount" > credit_line."transactionCredit" - credit_line."transactionDebit" - existing_credit
    THEN RAISE EXCEPTION 'AP reconciliation exceeds an open debit or credit line';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION b06_ap_reconciliation_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'ACTIVE'
     AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId"
     AND NEW."debitJournalLineId" = OLD."debitJournalLineId"
     AND NEW."creditJournalLineId" = OLD."creditJournalLineId"
     AND NEW."supplierPaymentId" IS NOT DISTINCT FROM OLD."supplierPaymentId"
     AND NEW."transactionAmount" = OLD."transactionAmount"
     AND NEW."debitBaseAmountApplied" = OLD."debitBaseAmountApplied"
     AND NEW."creditBaseAmountApplied" = OLD."creditBaseAmountApplied"
     AND NEW."realizedFxAmount" = OLD."realizedFxAmount"
     AND NEW."idempotencyKey" = OLD."idempotencyKey"
     AND NEW."requestHash" = OLD."requestHash"
     AND OLD."adjustmentJournalEntryId" IS NULL
     AND NEW."adjustmentJournalEntryId" IS NOT NULL
  THEN RETURN NEW;
  END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'REVERSED'
     AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId"
     AND NEW."debitJournalLineId" = OLD."debitJournalLineId"
     AND NEW."creditJournalLineId" = OLD."creditJournalLineId"
     AND NEW."supplierPaymentId" IS NOT DISTINCT FROM OLD."supplierPaymentId"
     AND NEW."transactionAmount" = OLD."transactionAmount"
     AND NEW."debitBaseAmountApplied" = OLD."debitBaseAmountApplied"
     AND NEW."creditBaseAmountApplied" = OLD."creditBaseAmountApplied"
     AND NEW."realizedFxAmount" = OLD."realizedFxAmount"
     AND NEW."adjustmentJournalEntryId" IS NOT DISTINCT FROM OLD."adjustmentJournalEntryId"
     AND NEW."idempotencyKey" = OLD."idempotencyKey"
     AND NEW."requestHash" = OLD."requestHash"
     AND NEW."reversedById" IS NOT NULL AND NEW."reversalReason" IS NOT NULL
  THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AP reconciliation financial content is immutable; use controlled reversal';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b06_ap_reconciliation_validate
  BEFORE INSERT ON "APReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b06_validate_ap_reconciliation();
CREATE TRIGGER b06_ap_reconciliation_immutable_update
  BEFORE UPDATE ON "APReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b06_ap_reconciliation_immutable();
CREATE TRIGGER b06_ap_reconciliation_immutable_delete
  BEFORE DELETE ON "APReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b06_ap_reconciliation_immutable();

CREATE OR REPLACE FUNCTION b06_supplier_payment_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' THEN
    IF OLD."status" = 'POSTED' AND NEW."status" = 'POSTED'
       AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId"
       AND NEW."businessPartnerId" = OLD."businessPartnerId"
       AND NEW."amount" = OLD."amount"
       AND NEW."unappliedAmount" = OLD."unappliedAmount"
       AND NEW."paymentNumber" = OLD."paymentNumber"
       AND NEW."sourceAccountId" = OLD."sourceAccountId"
       AND NEW."payableAccountId" = OLD."payableAccountId"
       AND NEW."transactionCurrencyCode" = OLD."transactionCurrencyCode"
       AND NEW."exchangeRate" = OLD."exchangeRate" AND NEW."method" = OLD."method"
       AND NEW."paymentDate" = OLD."paymentDate" AND NEW."postingDate" = OLD."postingDate"
       AND NEW."journalEntryId" = OLD."journalEntryId"
    THEN RETURN NEW;
    END IF;
    IF OLD."status" = 'POSTED' AND NEW."status" = 'REVERSED'
       AND NEW."reversalJournalEntryId" IS NOT NULL AND NEW."reversedById" IS NOT NULL
       AND NEW."reversalReason" IS NOT NULL
       AND NEW."id" = OLD."id" AND NEW."companyId" = OLD."companyId"
       AND NEW."businessPartnerId" = OLD."businessPartnerId"
       AND NEW."amount" = OLD."amount" AND NEW."unappliedAmount" = OLD."unappliedAmount"
       AND NEW."journalEntryId" = OLD."journalEntryId"
       AND NEW."paymentNumber" = OLD."paymentNumber"
       AND NEW."sourceAccountId" = OLD."sourceAccountId"
       AND NEW."payableAccountId" = OLD."payableAccountId"
       AND NEW."transactionCurrencyCode" = OLD."transactionCurrencyCode"
       AND NEW."exchangeRate" = OLD."exchangeRate" AND NEW."method" = OLD."method"
       AND NEW."paymentDate" = OLD."paymentDate" AND NEW."postingDate" = OLD."postingDate"
    THEN RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Posted supplier payments are immutable; use reversal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b06_supplier_payment_immutable
  BEFORE UPDATE ON "SupplierPayment"
  FOR EACH ROW EXECUTE FUNCTION b06_supplier_payment_immutable();

CREATE OR REPLACE FUNCTION b06_supplier_payment_allocation_immutable() RETURNS trigger AS $$
DECLARE payment_id UUID; payment_company_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN payment_id := OLD."supplierPaymentId"; payment_company_id := OLD."companyId";
  ELSE payment_id := NEW."supplierPaymentId"; payment_company_id := NEW."companyId"; END IF;
  IF EXISTS (SELECT 1 FROM "SupplierPayment" p WHERE p."id" = payment_id
    AND p."companyId" = payment_company_id AND p."status" <> 'DRAFT') THEN
    RAISE EXCEPTION 'Allocations of posted supplier payments are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b06_supplier_payment_allocation_immutable_update
  BEFORE UPDATE ON "SupplierPaymentAllocation"
  FOR EACH ROW EXECUTE FUNCTION b06_supplier_payment_allocation_immutable();
CREATE TRIGGER b06_supplier_payment_allocation_immutable_insert
  BEFORE INSERT ON "SupplierPaymentAllocation"
  FOR EACH ROW EXECUTE FUNCTION b06_supplier_payment_allocation_immutable();
CREATE TRIGGER b06_supplier_payment_allocation_immutable_delete
  BEFORE DELETE ON "SupplierPaymentAllocation"
  FOR EACH ROW EXECUTE FUNCTION b06_supplier_payment_allocation_immutable();
