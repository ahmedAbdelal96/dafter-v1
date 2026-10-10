-- B04: customer payments and AR reconciliation on the authoritative GL.
-- Payment allocations identify JournalLine/maturity rows directly; invoice ids
-- are only descriptive provenance and are never used as the reconciliation key.

CREATE TYPE "CustomerPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
CREATE TYPE "CustomerPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER');

CREATE UNIQUE INDEX "JournalLine_id_companyId_key"
  ON "JournalLine" ("id", "companyId");

ALTER TABLE "SalesInvoicePaymentSchedule"
  ADD COLUMN "journalLineId" UUID;

ALTER TABLE "SalesInvoicePaymentSchedule"
  ADD CONSTRAINT "SalesInvoicePaymentSchedule_journalLineId_companyId_fkey"
  FOREIGN KEY ("journalLineId", "companyId")
  REFERENCES "JournalLine" ("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SalesInvoicePaymentSchedule_journalLineId_companyId_key"
  ON "SalesInvoicePaymentSchedule" ("journalLineId", "companyId");

CREATE TABLE "CustomerPaymentSequence" (
  "companyId" UUID NOT NULL,
  "fiscalYearId" UUID NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPaymentSequence_pkey" PRIMARY KEY ("companyId", "fiscalYearId"),
  CONSTRAINT "CustomerPaymentSequence_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerPaymentSequence_fiscalYearId_companyId_fkey"
    FOREIGN KEY ("fiscalYearId", "companyId") REFERENCES "FiscalYear" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CustomerPayment" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "businessPartnerId" UUID NOT NULL,
  "status" "CustomerPaymentStatus" NOT NULL DEFAULT 'DRAFT',
  "paymentNumber" VARCHAR(40),
  "paymentDate" DATE NOT NULL,
  "postingDate" DATE,
  "method" "CustomerPaymentMethod" NOT NULL,
  "destinationAccountId" UUID NOT NULL,
  "transactionCurrencyCode" CHAR(3) NOT NULL,
  "exchangeRate" DECIMAL(19,8) NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "unappliedAmount" DECIMAL(19,4) NOT NULL,
  "notes" VARCHAR(2000),
  "journalEntryId" UUID,
  "reversalJournalEntryId" UUID,
  "idempotencyKey" VARCHAR(128),
  "requestHash" CHAR(64),
  "createdById" UUID NOT NULL,
  "postedById" UUID,
  "reversedById" UUID,
  "postedAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "reversalReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerPayment_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "CustomerPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_destinationAccountId_companyId_fkey" FOREIGN KEY ("destinationAccountId", "companyId") REFERENCES "AccountingAccount" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_reversalJournalEntryId_companyId_fkey" FOREIGN KEY ("reversalJournalEntryId", "companyId") REFERENCES "JournalEntry" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPayment_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "CustomerPayment_unapplied_nonnegative" CHECK ("unappliedAmount" >= 0),
  CONSTRAINT "CustomerPayment_exchangeRate_positive" CHECK ("exchangeRate" > 0)
);

CREATE UNIQUE INDEX "CustomerPayment_companyId_paymentNumber_key" ON "CustomerPayment" ("companyId", "paymentNumber");
CREATE UNIQUE INDEX "CustomerPayment_companyId_idempotencyKey_key" ON "CustomerPayment" ("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "CustomerPayment_journalEntryId_companyId_key" ON "CustomerPayment" ("journalEntryId", "companyId");
CREATE UNIQUE INDEX "CustomerPayment_reversalJournalEntryId_companyId_key" ON "CustomerPayment" ("reversalJournalEntryId", "companyId");
CREATE INDEX "CustomerPayment_companyId_status_paymentDate_idx" ON "CustomerPayment" ("companyId", "status", "paymentDate");
CREATE INDEX "CustomerPayment_companyId_businessPartnerId_paymentDate_idx" ON "CustomerPayment" ("companyId", "businessPartnerId", "paymentDate");

CREATE TABLE "CustomerPaymentAllocation" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "customerPaymentId" UUID NOT NULL,
  "journalLineId" UUID NOT NULL,
  "salesInvoicePaymentScheduleId" UUID,
  "amount" DECIMAL(19,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerPaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerPaymentAllocation_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "CustomerPaymentAllocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomerPaymentAllocation_customerPaymentId_companyId_fkey" FOREIGN KEY ("customerPaymentId", "companyId") REFERENCES "CustomerPayment" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPaymentAllocation_journalLineId_companyId_fkey" FOREIGN KEY ("journalLineId", "companyId") REFERENCES "JournalLine" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPaymentAllocation_salesInvoicePaymentScheduleId_co_fkey" FOREIGN KEY ("salesInvoicePaymentScheduleId", "companyId") REFERENCES "SalesInvoicePaymentSchedule" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerPaymentAllocation_amount_positive" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "CustomerPaymentAllocation_companyId_customerPaymentId_journ_key"
  ON "CustomerPaymentAllocation" ("companyId", "customerPaymentId", "journalLineId");
CREATE INDEX "CustomerPaymentAllocation_companyId_journalLineId_idx"
  ON "CustomerPaymentAllocation" ("companyId", "journalLineId");
CREATE INDEX "CustomerPaymentAllocation_companyId_customerPaymentId_idx"
  ON "CustomerPaymentAllocation" ("companyId", "customerPaymentId");

CREATE TABLE "ARReconciliation" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "customerPaymentId" UUID NOT NULL,
  "journalLineId" UUID NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ARReconciliation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ARReconciliation_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "ARReconciliation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_customerPaymentId_companyId_fkey" FOREIGN KEY ("customerPaymentId", "companyId") REFERENCES "CustomerPayment" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_journalLineId_companyId_fkey" FOREIGN KEY ("journalLineId", "companyId") REFERENCES "JournalLine" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_amount_positive" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "ARReconciliation_companyId_idempotencyKey_key"
  ON "ARReconciliation" ("companyId", "idempotencyKey");
CREATE INDEX "ARReconciliation_companyId_journalLineId_idx"
  ON "ARReconciliation" ("companyId", "journalLineId");

CREATE OR REPLACE FUNCTION b04_ar_reconciliation_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AR reconciliations are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b04_ar_reconciliation_immutable_update
  BEFORE UPDATE ON "ARReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b04_ar_reconciliation_immutable();

CREATE TRIGGER b04_ar_reconciliation_immutable_delete
  BEFORE DELETE ON "ARReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b04_ar_reconciliation_immutable();

CREATE OR REPLACE FUNCTION b04_customer_payment_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' THEN
    IF OLD."status" = 'POSTED'
       AND NEW."status" = 'REVERSED'
       AND NEW."reversalJournalEntryId" IS NOT NULL
       AND NEW."reversedById" IS NOT NULL
       AND NEW."reversalReason" IS NOT NULL
       AND NEW."id" = OLD."id"
       AND NEW."companyId" = OLD."companyId"
       AND NEW."businessPartnerId" = OLD."businessPartnerId"
       AND NEW."amount" = OLD."amount"
       AND NEW."unappliedAmount" = OLD."unappliedAmount"
       AND NEW."journalEntryId" = OLD."journalEntryId"
       AND NEW."paymentNumber" = OLD."paymentNumber"
       AND NEW."destinationAccountId" = OLD."destinationAccountId"
       AND NEW."transactionCurrencyCode" = OLD."transactionCurrencyCode"
       AND NEW."exchangeRate" = OLD."exchangeRate"
       AND NEW."method" = OLD."method"
       AND NEW."paymentDate" = OLD."paymentDate"
       AND NEW."postingDate" = OLD."postingDate"
    THEN RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Posted customer payments are immutable; use reversal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b04_customer_payment_immutable
  BEFORE UPDATE ON "CustomerPayment"
  FOR EACH ROW EXECUTE FUNCTION b04_customer_payment_immutable();

CREATE OR REPLACE FUNCTION b04_customer_payment_allocation_immutable() RETURNS trigger AS $$
DECLARE
  payment_id UUID;
  payment_company_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payment_id := OLD."customerPaymentId";
    payment_company_id := OLD."companyId";
  ELSE
    payment_id := NEW."customerPaymentId";
    payment_company_id := NEW."companyId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM "CustomerPayment" p
    WHERE p."id" = payment_id
      AND p."companyId" = payment_company_id
      AND p."status" <> 'DRAFT'
  ) THEN
    RAISE EXCEPTION 'Allocations of posted customer payments are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b04_customer_payment_allocation_immutable_update
  BEFORE UPDATE ON "CustomerPaymentAllocation"
  FOR EACH ROW EXECUTE FUNCTION b04_customer_payment_allocation_immutable();

CREATE TRIGGER b04_customer_payment_allocation_immutable_insert
  BEFORE INSERT ON "CustomerPaymentAllocation"
  FOR EACH ROW EXECUTE FUNCTION b04_customer_payment_allocation_immutable();

CREATE TRIGGER b04_customer_payment_allocation_immutable_delete
  BEFORE DELETE ON "CustomerPaymentAllocation"
  FOR EACH ROW EXECUTE FUNCTION b04_customer_payment_allocation_immutable();
