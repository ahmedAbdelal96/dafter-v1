-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "SalesCreditNoteStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "SalesDocumentType" AS ENUM ('SALES_INVOICE', 'SALES_CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "SalesDiscountType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- AlterEnum
ALTER TYPE "JournalSourceType" ADD VALUE 'SALES_CREDIT_NOTE';

-- CreateTable
CREATE TABLE "SalesDocumentSequence" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "fiscalYearId" UUID NOT NULL,
    "documentType" "SalesDocumentType" NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" VARCHAR(40),
    "documentDate" DATE NOT NULL,
    "postingDate" DATE,
    "transactionCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(19,8) NOT NULL,
    "paymentTermId" UUID,
    "customerReference" VARCHAR(120),
    "notes" VARCHAR(2000),
    "subtotal" DECIMAL(19,4) NOT NULL,
    "discountTotal" DECIMAL(19,4) NOT NULL,
    "taxableBaseTotal" DECIMAL(19,4) NOT NULL,
    "taxTotal" DECIMAL(19,4) NOT NULL,
    "grandTotal" DECIMAL(19,4) NOT NULL,
    "partnerCodeSnapshot" VARCHAR(40) NOT NULL,
    "partnerNameSnapshot" VARCHAR(200) NOT NULL,
    "partnerLegalNameSnapshot" TEXT,
    "taxRegistrationNumberSnapshot" TEXT,
    "billingAddressSnapshot" JSONB,
    "postedById" UUID,
    "postedAt" TIMESTAMP(3),
    "journalEntryId" UUID,
    "idempotencyKey" VARCHAR(128),
    "requestHash" CHAR(64),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "salesInvoiceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "productId" UUID,
    "descriptionSnapshot" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(19,6) NOT NULL,
    "unitPrice" DECIMAL(19,6) NOT NULL,
    "discountType" "SalesDiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" DECIMAL(19,6) NOT NULL,
    "grossBeforeDiscount" DECIMAL(19,4) NOT NULL,
    "discountAmount" DECIMAL(19,4) NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "revenueAccountId" UUID,
    "revenueAccountCodeSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceLineTax" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "salesInvoiceLineId" UUID NOT NULL,
    "taxTreatmentId" UUID,
    "taxRateId" UUID,
    "treatmentCodeSnapshot" VARCHAR(40) NOT NULL,
    "treatmentCategory" "TaxTreatmentCategory" NOT NULL,
    "rateCodeSnapshot" TEXT,
    "percentageSnapshot" DECIMAL(9,4) NOT NULL,
    "calculationMode" "TaxCalculationMode" NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInvoiceLineTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoicePaymentSchedule" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "salesInvoiceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "paymentTermCodeSnapshot" TEXT,
    "paymentTermNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInvoicePaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCreditNote" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "salesInvoiceId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "status" "SalesCreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "creditNoteNumber" VARCHAR(40),
    "documentDate" DATE NOT NULL,
    "postingDate" DATE,
    "transactionCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(19,8) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "subtotal" DECIMAL(19,4) NOT NULL,
    "taxTotal" DECIMAL(19,4) NOT NULL,
    "grandTotal" DECIMAL(19,4) NOT NULL,
    "partnerCodeSnapshot" VARCHAR(40) NOT NULL,
    "partnerNameSnapshot" VARCHAR(200) NOT NULL,
    "taxRegistrationNumberSnapshot" TEXT,
    "billingAddressSnapshot" JSONB,
    "postedById" UUID,
    "postedAt" TIMESTAMP(3),
    "journalEntryId" UUID,
    "idempotencyKey" VARCHAR(128),
    "requestHash" CHAR(64),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCreditNoteLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "salesCreditNoteId" UUID NOT NULL,
    "originalSalesInvoiceLineId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "descriptionSnapshot" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(19,6) NOT NULL,
    "unitPrice" DECIMAL(19,6) NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesCreditNoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCreditNoteLineTax" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "salesCreditNoteLineId" UUID NOT NULL,
    "treatmentCodeSnapshot" VARCHAR(40) NOT NULL,
    "treatmentCategory" "TaxTreatmentCategory" NOT NULL,
    "rateCodeSnapshot" TEXT,
    "percentageSnapshot" DECIMAL(9,4) NOT NULL,
    "calculationMode" "TaxCalculationMode" NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesCreditNoteLineTax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesDocumentSequence_companyId_documentType_idx" ON "SalesDocumentSequence"("companyId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "SalesDocumentSequence_companyId_fiscalYearId_documentType_key" ON "SalesDocumentSequence"("companyId", "fiscalYearId", "documentType");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_status_documentDate_idx" ON "SalesInvoice"("companyId", "status", "documentDate");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_businessPartnerId_documentDate_idx" ON "SalesInvoice"("companyId", "businessPartnerId", "documentDate");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_postingDate_idx" ON "SalesInvoice"("companyId", "postingDate");

-- CreateIndex
CREATE INDEX "SalesInvoice_companyId_transactionCurrencyCode_idx" ON "SalesInvoice"("companyId", "transactionCurrencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_id_companyId_key" ON "SalesInvoice"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_invoiceNumber_key" ON "SalesInvoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_journalEntryId_companyId_key" ON "SalesInvoice"("journalEntryId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_companyId_idempotencyKey_key" ON "SalesInvoice"("companyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SalesInvoiceLine_companyId_productId_idx" ON "SalesInvoiceLine"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoiceLine_id_companyId_key" ON "SalesInvoiceLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoiceLine_companyId_salesInvoiceId_sequence_key" ON "SalesInvoiceLine"("companyId", "salesInvoiceId", "sequence");

-- CreateIndex
CREATE INDEX "SalesInvoiceLineTax_companyId_taxRateId_idx" ON "SalesInvoiceLineTax"("companyId", "taxRateId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoiceLineTax_companyId_salesInvoiceLineId_key" ON "SalesInvoiceLineTax"("companyId", "salesInvoiceLineId");

-- CreateIndex
CREATE INDEX "SalesInvoicePaymentSchedule_companyId_dueDate_idx" ON "SalesInvoicePaymentSchedule"("companyId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoicePaymentSchedule_id_companyId_key" ON "SalesInvoicePaymentSchedule"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoicePaymentSchedule_companyId_salesInvoiceId_sequen_key" ON "SalesInvoicePaymentSchedule"("companyId", "salesInvoiceId", "sequence");

-- CreateIndex
CREATE INDEX "SalesCreditNote_companyId_salesInvoiceId_idx" ON "SalesCreditNote"("companyId", "salesInvoiceId");

-- CreateIndex
CREATE INDEX "SalesCreditNote_companyId_businessPartnerId_documentDate_idx" ON "SalesCreditNote"("companyId", "businessPartnerId", "documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNote_id_companyId_key" ON "SalesCreditNote"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNote_companyId_creditNoteNumber_key" ON "SalesCreditNote"("companyId", "creditNoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNote_journalEntryId_companyId_key" ON "SalesCreditNote"("journalEntryId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNote_companyId_idempotencyKey_key" ON "SalesCreditNote"("companyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SalesCreditNoteLine_companyId_originalSalesInvoiceLineId_idx" ON "SalesCreditNoteLine"("companyId", "originalSalesInvoiceLineId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNoteLine_id_companyId_key" ON "SalesCreditNoteLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNoteLine_companyId_salesCreditNoteId_sequence_key" ON "SalesCreditNoteLine"("companyId", "salesCreditNoteId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCreditNoteLineTax_companyId_salesCreditNoteLineId_key" ON "SalesCreditNoteLineTax"("companyId", "salesCreditNoteLineId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_companyId_key" ON "Product"("id", "companyId");

-- AddForeignKey
ALTER TABLE "SalesDocumentSequence" ADD CONSTRAINT "SalesDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDocumentSequence" ADD CONSTRAINT "SalesDocumentSequence_fiscalYearId_companyId_fkey" FOREIGN KEY ("fiscalYearId", "companyId") REFERENCES "FiscalYear"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_paymentTermId_companyId_fkey" FOREIGN KEY ("paymentTermId", "companyId") REFERENCES "PaymentTerm"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_salesInvoiceId_companyId_fkey" FOREIGN KEY ("salesInvoiceId", "companyId") REFERENCES "SalesInvoice"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLineTax" ADD CONSTRAINT "SalesInvoiceLineTax_salesInvoiceLineId_companyId_fkey" FOREIGN KEY ("salesInvoiceLineId", "companyId") REFERENCES "SalesInvoiceLine"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoicePaymentSchedule" ADD CONSTRAINT "SalesInvoicePaymentSchedule_salesInvoiceId_companyId_fkey" FOREIGN KEY ("salesInvoiceId", "companyId") REFERENCES "SalesInvoice"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_salesInvoiceId_companyId_fkey" FOREIGN KEY ("salesInvoiceId", "companyId") REFERENCES "SalesInvoice"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNote" ADD CONSTRAINT "SalesCreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNoteLine" ADD CONSTRAINT "SalesCreditNoteLine_salesCreditNoteId_companyId_fkey" FOREIGN KEY ("salesCreditNoteId", "companyId") REFERENCES "SalesCreditNote"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNoteLine" ADD CONSTRAINT "SalesCreditNoteLine_originalSalesInvoiceLineId_companyId_fkey" FOREIGN KEY ("originalSalesInvoiceLineId", "companyId") REFERENCES "SalesInvoiceLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCreditNoteLineTax" ADD CONSTRAINT "SalesCreditNoteLineTax_salesCreditNoteLineId_companyId_fkey" FOREIGN KEY ("salesCreditNoteLineId", "companyId") REFERENCES "SalesCreditNoteLine"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesInvoice"
  ADD CONSTRAINT "SalesInvoice_posted_fields_check"
  CHECK ("status" <> 'POSTED' OR ("invoiceNumber" IS NOT NULL AND "postingDate" IS NOT NULL AND "journalEntryId" IS NOT NULL AND "postedById" IS NOT NULL AND "postedAt" IS NOT NULL));

ALTER TABLE "SalesCreditNote"
  ADD CONSTRAINT "SalesCreditNote_posted_fields_check"
  CHECK ("status" <> 'POSTED' OR ("creditNoteNumber" IS NOT NULL AND "postingDate" IS NOT NULL AND "journalEntryId" IS NOT NULL AND "postedById" IS NOT NULL AND "postedAt" IS NOT NULL));

ALTER TABLE "SalesInvoiceLine"
  ADD CONSTRAINT "SalesInvoiceLine_amounts_non_negative_check"
  CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "discountValue" >= 0 AND "grossBeforeDiscount" >= 0 AND "discountAmount" >= 0 AND "taxableBase" >= 0 AND "taxAmount" >= 0 AND "lineTotal" >= 0);

ALTER TABLE "SalesInvoicePaymentSchedule"
  ADD CONSTRAINT "SalesInvoicePaymentSchedule_amount_positive_check"
  CHECK ("amount" > 0);

ALTER TABLE "SalesCreditNoteLine"
  ADD CONSTRAINT "SalesCreditNoteLine_amounts_positive_check"
  CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "taxableBase" >= 0 AND "taxAmount" >= 0 AND "lineTotal" >= 0);

CREATE OR REPLACE FUNCTION "sales_reject_posted_invoice_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" = 'POSTED' THEN
    RAISE EXCEPTION 'posted sales invoice is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "sales_reject_posted_credit_note_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" = 'POSTED' THEN
    RAISE EXCEPTION 'posted sales credit note is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "sales_reject_posted_invoice_child_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_id UUID;
  tenant_id UUID;
  parent_status "SalesInvoiceStatus";
BEGIN
  IF TG_TABLE_NAME = 'SalesInvoiceLine' THEN
    invoice_id := COALESCE(NEW."salesInvoiceId", OLD."salesInvoiceId");
    tenant_id := COALESCE(NEW."companyId", OLD."companyId");
  ELSIF TG_TABLE_NAME = 'SalesInvoiceLineTax' THEN
    SELECT "salesInvoiceId", "companyId" INTO invoice_id, tenant_id FROM "SalesInvoiceLine" WHERE "id" = COALESCE(NEW."salesInvoiceLineId", OLD."salesInvoiceLineId") AND "companyId" = COALESCE(NEW."companyId", OLD."companyId");
  ELSE
    invoice_id := COALESCE(NEW."salesInvoiceId", OLD."salesInvoiceId");
    tenant_id := COALESCE(NEW."companyId", OLD."companyId");
  END IF;
  SELECT "status" INTO parent_status FROM "SalesInvoice" WHERE "id" = invoice_id AND "companyId" = tenant_id;
  IF parent_status = 'POSTED' THEN
    RAISE EXCEPTION 'posted sales invoice child is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "sales_reject_posted_credit_note_child_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  credit_note_id UUID;
  tenant_id UUID;
  parent_status "SalesCreditNoteStatus";
BEGIN
  IF TG_TABLE_NAME = 'SalesCreditNoteLine' THEN
    credit_note_id := COALESCE(NEW."salesCreditNoteId", OLD."salesCreditNoteId");
    tenant_id := COALESCE(NEW."companyId", OLD."companyId");
  ELSE
    SELECT "salesCreditNoteId", "companyId" INTO credit_note_id, tenant_id FROM "SalesCreditNoteLine" WHERE "id" = COALESCE(NEW."salesCreditNoteLineId", OLD."salesCreditNoteLineId") AND "companyId" = COALESCE(NEW."companyId", OLD."companyId");
  END IF;
  SELECT "status" INTO parent_status FROM "SalesCreditNote" WHERE "id" = credit_note_id AND "companyId" = tenant_id;
  IF parent_status = 'POSTED' THEN
    RAISE EXCEPTION 'posted sales credit note child is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "sales_invoice_posted_immutability_trigger"
BEFORE UPDATE OR DELETE ON "SalesInvoice"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_invoice_mutation"();

CREATE TRIGGER "sales_invoice_line_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SalesInvoiceLine"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_invoice_child_mutation"();

CREATE TRIGGER "sales_invoice_line_tax_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SalesInvoiceLineTax"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_invoice_child_mutation"();

CREATE TRIGGER "sales_invoice_schedule_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SalesInvoicePaymentSchedule"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_invoice_child_mutation"();

CREATE TRIGGER "sales_credit_note_posted_immutability_trigger"
BEFORE UPDATE OR DELETE ON "SalesCreditNote"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_credit_note_mutation"();

CREATE TRIGGER "sales_credit_note_line_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SalesCreditNoteLine"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_credit_note_child_mutation"();

CREATE TRIGGER "sales_credit_note_line_tax_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SalesCreditNoteLineTax"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_credit_note_child_mutation"();
