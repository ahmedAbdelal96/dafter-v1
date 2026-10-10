-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "SupplierCreditNoteStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "PurchaseAccountType" AS ENUM ('EXPENSE', 'ASSET');

-- CreateEnum
CREATE TYPE "SupplierDocumentSequenceType" AS ENUM ('SUPPLIER_INVOICE', 'SUPPLIER_CREDIT_NOTE');

-- AlterEnum
ALTER TYPE "JournalSourceType" ADD VALUE 'SUPPLIER_CREDIT_NOTE';

-- CreateTable
CREATE TABLE "PurchaseOrderSequence" (
    "companyId" UUID NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderSequence_pkey" PRIMARY KEY ("companyId")
);

-- CreateTable
CREATE TABLE "SupplierDocumentSequence" (
    "companyId" UUID NOT NULL,
    "fiscalYearId" UUID NOT NULL,
    "documentType" "SupplierDocumentSequenceType" NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDocumentSequence_pkey" PRIMARY KEY ("companyId","fiscalYearId","documentType")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderNumber" VARCHAR(40),
    "documentDate" DATE NOT NULL,
    "requestedDeliveryDate" DATE,
    "transactionCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(19,8) NOT NULL,
    "paymentTermId" UUID,
    "supplierReference" VARCHAR(120),
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
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
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
    "accountType" "PurchaseAccountType" NOT NULL DEFAULT 'EXPENSE',
    "expenseAccountId" UUID,
    "assetAccountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLineTax" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "purchaseOrderLineId" UUID NOT NULL,
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

    CONSTRAINT "PurchaseOrderLineTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "purchaseOrderId" UUID,
    "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" VARCHAR(40),
    "supplierDocumentReference" VARCHAR(120),
    "documentDate" DATE NOT NULL,
    "postingDate" DATE,
    "dueDate" DATE,
    "transactionCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(19,8) NOT NULL,
    "paymentTermId" UUID,
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
    "payableAccountId" UUID,
    "journalEntryId" UUID,
    "idempotencyKey" VARCHAR(128),
    "requestHash" CHAR(64),
    "createdById" UUID NOT NULL,
    "postedById" UUID,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoiceLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierInvoiceId" UUID NOT NULL,
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
    "accountType" "PurchaseAccountType" NOT NULL DEFAULT 'EXPENSE',
    "expenseAccountId" UUID,
    "assetAccountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoiceLineTax" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierInvoiceLineId" UUID NOT NULL,
    "taxTreatmentId" UUID,
    "taxRateId" UUID,
    "taxInputAccountId" UUID,
    "treatmentCodeSnapshot" VARCHAR(40) NOT NULL,
    "treatmentCategory" "TaxTreatmentCategory" NOT NULL,
    "rateCodeSnapshot" TEXT,
    "percentageSnapshot" DECIMAL(9,4) NOT NULL,
    "calculationMode" "TaxCalculationMode" NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierInvoiceLineTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoicePaymentSchedule" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierInvoiceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "journalLineId" UUID,
    "paymentTermCodeSnapshot" TEXT,
    "paymentTermNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierInvoicePaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCreditNote" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierInvoiceId" UUID NOT NULL,
    "businessPartnerId" UUID NOT NULL,
    "status" "SupplierCreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
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
    "payableAccountId" UUID NOT NULL,
    "journalEntryId" UUID,
    "idempotencyKey" VARCHAR(128),
    "requestHash" CHAR(64),
    "createdById" UUID NOT NULL,
    "postedById" UUID,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCreditNoteLine" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierCreditNoteId" UUID NOT NULL,
    "originalSupplierInvoiceLineId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "descriptionSnapshot" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(19,6) NOT NULL,
    "unitPrice" DECIMAL(19,6) NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "accountType" "PurchaseAccountType" NOT NULL DEFAULT 'EXPENSE',
    "expenseAccountId" UUID,
    "assetAccountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCreditNoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCreditNoteLineTax" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierCreditNoteLineId" UUID NOT NULL,
    "taxTreatmentId" UUID,
    "taxRateId" UUID,
    "taxInputAccountId" UUID,
    "treatmentCodeSnapshot" VARCHAR(40) NOT NULL,
    "treatmentCategory" "TaxTreatmentCategory" NOT NULL,
    "rateCodeSnapshot" TEXT,
    "percentageSnapshot" DECIMAL(9,4) NOT NULL,
    "calculationMode" "TaxCalculationMode" NOT NULL,
    "taxableBase" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCreditNoteLineTax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierDocumentSequence_companyId_documentType_idx" ON "SupplierDocumentSequence"("companyId", "documentType");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_status_documentDate_idx" ON "PurchaseOrder"("companyId", "status", "documentDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_businessPartnerId_documentDate_idx" ON "PurchaseOrder"("companyId", "businessPartnerId", "documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_id_companyId_key" ON "PurchaseOrder"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_companyId_orderNumber_key" ON "PurchaseOrder"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_companyId_productId_idx" ON "PurchaseOrderLine"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLine_id_companyId_key" ON "PurchaseOrderLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLine_companyId_purchaseOrderId_sequence_key" ON "PurchaseOrderLine"("companyId", "purchaseOrderId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLineTax_companyId_purchaseOrderLineId_key" ON "PurchaseOrderLineTax"("companyId", "purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_companyId_status_documentDate_idx" ON "SupplierInvoice"("companyId", "status", "documentDate");

-- CreateIndex
CREATE INDEX "SupplierInvoice_companyId_businessPartnerId_documentDate_idx" ON "SupplierInvoice"("companyId", "businessPartnerId", "documentDate");

-- CreateIndex
CREATE INDEX "SupplierInvoice_companyId_supplierDocumentReference_idx" ON "SupplierInvoice"("companyId", "supplierDocumentReference");

-- CreateIndex
CREATE INDEX "SupplierInvoice_companyId_purchaseOrderId_idx" ON "SupplierInvoice"("companyId", "purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_id_companyId_key" ON "SupplierInvoice"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_companyId_invoiceNumber_key" ON "SupplierInvoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_journalEntryId_companyId_key" ON "SupplierInvoice"("journalEntryId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_companyId_idempotencyKey_key" ON "SupplierInvoice"("companyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SupplierInvoiceLine_companyId_productId_idx" ON "SupplierInvoiceLine"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoiceLine_id_companyId_key" ON "SupplierInvoiceLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoiceLine_companyId_supplierInvoiceId_sequence_key" ON "SupplierInvoiceLine"("companyId", "supplierInvoiceId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoiceLineTax_companyId_supplierInvoiceLineId_key" ON "SupplierInvoiceLineTax"("companyId", "supplierInvoiceLineId");

-- CreateIndex
CREATE INDEX "SupplierInvoicePaymentSchedule_companyId_dueDate_idx" ON "SupplierInvoicePaymentSchedule"("companyId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoicePaymentSchedule_id_companyId_key" ON "SupplierInvoicePaymentSchedule"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoicePaymentSchedule_companyId_supplierInvoiceId__key" ON "SupplierInvoicePaymentSchedule"("companyId", "supplierInvoiceId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoicePaymentSchedule_journalLineId_companyId_key" ON "SupplierInvoicePaymentSchedule"("journalLineId", "companyId");

-- CreateIndex
CREATE INDEX "SupplierCreditNote_companyId_status_documentDate_idx" ON "SupplierCreditNote"("companyId", "status", "documentDate");

-- CreateIndex
CREATE INDEX "SupplierCreditNote_companyId_supplierInvoiceId_idx" ON "SupplierCreditNote"("companyId", "supplierInvoiceId");

-- CreateIndex
CREATE INDEX "SupplierCreditNote_companyId_businessPartnerId_documentDate_idx" ON "SupplierCreditNote"("companyId", "businessPartnerId", "documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNote_id_companyId_key" ON "SupplierCreditNote"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNote_companyId_creditNoteNumber_key" ON "SupplierCreditNote"("companyId", "creditNoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNote_journalEntryId_companyId_key" ON "SupplierCreditNote"("journalEntryId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNote_companyId_idempotencyKey_key" ON "SupplierCreditNote"("companyId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SupplierCreditNoteLine_companyId_originalSupplierInvoiceLin_idx" ON "SupplierCreditNoteLine"("companyId", "originalSupplierInvoiceLineId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNoteLine_id_companyId_key" ON "SupplierCreditNoteLine"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNoteLine_companyId_supplierCreditNoteId_seque_key" ON "SupplierCreditNoteLine"("companyId", "supplierCreditNoteId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCreditNoteLineTax_companyId_supplierCreditNoteLineI_key" ON "SupplierCreditNoteLineTax"("companyId", "supplierCreditNoteLineId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderSequence" ADD CONSTRAINT "PurchaseOrderSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocumentSequence" ADD CONSTRAINT "SupplierDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocumentSequence" ADD CONSTRAINT "SupplierDocumentSequence_fiscalYearId_companyId_fkey" FOREIGN KEY ("fiscalYearId", "companyId") REFERENCES "FiscalYear"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_paymentTermId_companyId_fkey" FOREIGN KEY ("paymentTermId", "companyId") REFERENCES "PaymentTerm"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_companyId_fkey" FOREIGN KEY ("purchaseOrderId", "companyId") REFERENCES "PurchaseOrder"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_expenseAccountId_companyId_fkey" FOREIGN KEY ("expenseAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_assetAccountId_companyId_fkey" FOREIGN KEY ("assetAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineTax" ADD CONSTRAINT "PurchaseOrderLineTax_purchaseOrderLineId_companyId_fkey" FOREIGN KEY ("purchaseOrderLineId", "companyId") REFERENCES "PurchaseOrderLine"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_purchaseOrderId_companyId_fkey" FOREIGN KEY ("purchaseOrderId", "companyId") REFERENCES "PurchaseOrder"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_paymentTermId_companyId_fkey" FOREIGN KEY ("paymentTermId", "companyId") REFERENCES "PaymentTerm"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_payableAccountId_companyId_fkey" FOREIGN KEY ("payableAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "SupplierInvoiceLine_supplierInvoiceId_companyId_fkey" FOREIGN KEY ("supplierInvoiceId", "companyId") REFERENCES "SupplierInvoice"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "SupplierInvoiceLine_productId_companyId_fkey" FOREIGN KEY ("productId", "companyId") REFERENCES "Product"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "SupplierInvoiceLine_expenseAccountId_companyId_fkey" FOREIGN KEY ("expenseAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLine" ADD CONSTRAINT "SupplierInvoiceLine_assetAccountId_companyId_fkey" FOREIGN KEY ("assetAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLineTax" ADD CONSTRAINT "SupplierInvoiceLineTax_supplierInvoiceLineId_companyId_fkey" FOREIGN KEY ("supplierInvoiceLineId", "companyId") REFERENCES "SupplierInvoiceLine"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoiceLineTax" ADD CONSTRAINT "SupplierInvoiceLineTax_taxInputAccountId_companyId_fkey" FOREIGN KEY ("taxInputAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoicePaymentSchedule" ADD CONSTRAINT "SupplierInvoicePaymentSchedule_supplierInvoiceId_companyId_fkey" FOREIGN KEY ("supplierInvoiceId", "companyId") REFERENCES "SupplierInvoice"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoicePaymentSchedule" ADD CONSTRAINT "SupplierInvoicePaymentSchedule_journalLineId_companyId_fkey" FOREIGN KEY ("journalLineId", "companyId") REFERENCES "JournalLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_supplierInvoiceId_companyId_fkey" FOREIGN KEY ("supplierInvoiceId", "companyId") REFERENCES "SupplierInvoice"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_businessPartnerId_companyId_fkey" FOREIGN KEY ("businessPartnerId", "companyId") REFERENCES "BusinessPartner"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_transactionCurrencyCode_fkey" FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_payableAccountId_companyId_fkey" FOREIGN KEY ("payableAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_journalEntryId_companyId_fkey" FOREIGN KEY ("journalEntryId", "companyId") REFERENCES "JournalEntry"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNote" ADD CONSTRAINT "SupplierCreditNote_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNoteLine" ADD CONSTRAINT "SupplierCreditNoteLine_supplierCreditNoteId_companyId_fkey" FOREIGN KEY ("supplierCreditNoteId", "companyId") REFERENCES "SupplierCreditNote"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNoteLine" ADD CONSTRAINT "SupplierCreditNoteLine_originalSupplierInvoiceLineId_compa_fkey" FOREIGN KEY ("originalSupplierInvoiceLineId", "companyId") REFERENCES "SupplierInvoiceLine"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNoteLine" ADD CONSTRAINT "SupplierCreditNoteLine_expenseAccountId_companyId_fkey" FOREIGN KEY ("expenseAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNoteLine" ADD CONSTRAINT "SupplierCreditNoteLine_assetAccountId_companyId_fkey" FOREIGN KEY ("assetAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNoteLineTax" ADD CONSTRAINT "SupplierCreditNoteLineTax_supplierCreditNoteLineId_company_fkey" FOREIGN KEY ("supplierCreditNoteLineId", "companyId") REFERENCES "SupplierCreditNoteLine"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCreditNoteLineTax" ADD CONSTRAINT "SupplierCreditNoteLineTax_taxInputAccountId_companyId_fkey" FOREIGN KEY ("taxInputAccountId", "companyId") REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A supplier cannot have two active/draft/posted invoices with the same
-- external reference. Nullable references remain repeatable; the unique
-- constraint is the database race-condition backstop.
CREATE UNIQUE INDEX "SupplierInvoice_companyId_businessPartnerId_supplierDocumen_key"
  ON "SupplierInvoice"("companyId", "businessPartnerId", "supplierDocumentReference");

ALTER TABLE "PurchaseOrderLine"
  ADD CONSTRAINT "PurchaseOrderLine_positive_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "PurchaseOrderLine_non_negative_price_check" CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "PurchaseOrderLine_non_negative_totals_check" CHECK ("taxableBase" >= 0 AND "taxAmount" >= 0 AND "lineTotal" >= 0);

ALTER TABLE "SupplierInvoiceLine"
  ADD CONSTRAINT "SupplierInvoiceLine_positive_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "SupplierInvoiceLine_non_negative_price_check" CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "SupplierInvoiceLine_non_negative_totals_check" CHECK ("taxableBase" >= 0 AND "taxAmount" >= 0 AND "lineTotal" >= 0);

ALTER TABLE "SupplierCreditNoteLine"
  ADD CONSTRAINT "SupplierCreditNoteLine_positive_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "SupplierCreditNoteLine_non_negative_totals_check" CHECK ("taxableBase" >= 0 AND "taxAmount" >= 0 AND "lineTotal" >= 0);

ALTER TABLE "SupplierInvoice"
  ADD CONSTRAINT "SupplierInvoice_posted_fields_check"
  CHECK ("status" <> 'POSTED' OR ("invoiceNumber" IS NOT NULL AND "postingDate" IS NOT NULL AND "journalEntryId" IS NOT NULL AND "postedById" IS NOT NULL AND "postedAt" IS NOT NULL));

ALTER TABLE "SupplierCreditNote"
  ADD CONSTRAINT "SupplierCreditNote_posted_fields_check"
  CHECK ("status" <> 'POSTED' OR ("creditNoteNumber" IS NOT NULL AND "postingDate" IS NOT NULL AND "journalEntryId" IS NOT NULL AND "postedById" IS NOT NULL AND "postedAt" IS NOT NULL));

ALTER TABLE "SupplierInvoicePaymentSchedule"
  ADD CONSTRAINT "SupplierInvoicePaymentSchedule_amount_positive_check" CHECK ("amount" > 0);

CREATE OR REPLACE FUNCTION "b05_reject_posted_supplier_invoice_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'POSTED' THEN RAISE EXCEPTION 'posted supplier invoice is immutable'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "b05_reject_posted_supplier_invoice_child_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invoice_id UUID; tenant_id UUID; parent_status "SupplierInvoiceStatus";
BEGIN
  IF TG_TABLE_NAME = 'SupplierInvoiceLine' THEN
    invoice_id := COALESCE(NEW."supplierInvoiceId", OLD."supplierInvoiceId");
    tenant_id := COALESCE(NEW."companyId", OLD."companyId");
  ELSIF TG_TABLE_NAME = 'SupplierInvoiceLineTax' THEN
    SELECT "supplierInvoiceId", "companyId" INTO invoice_id, tenant_id FROM "SupplierInvoiceLine"
      WHERE "id" = COALESCE(NEW."supplierInvoiceLineId", OLD."supplierInvoiceLineId")
        AND "companyId" = COALESCE(NEW."companyId", OLD."companyId");
  ELSE
    invoice_id := COALESCE(NEW."supplierInvoiceId", OLD."supplierInvoiceId");
    tenant_id := COALESCE(NEW."companyId", OLD."companyId");
  END IF;
  SELECT "status" INTO parent_status FROM "SupplierInvoice" WHERE "id" = invoice_id AND "companyId" = tenant_id;
  IF parent_status = 'POSTED' THEN RAISE EXCEPTION 'posted supplier invoice child is immutable'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "b05_reject_posted_supplier_credit_note_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'POSTED' THEN RAISE EXCEPTION 'posted supplier credit note is immutable'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "b05_reject_posted_supplier_credit_note_child_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE note_id UUID; tenant_id UUID; parent_status "SupplierCreditNoteStatus";
BEGIN
  IF TG_TABLE_NAME = 'SupplierCreditNoteLine' THEN
    note_id := COALESCE(NEW."supplierCreditNoteId", OLD."supplierCreditNoteId");
    tenant_id := COALESCE(NEW."companyId", OLD."companyId");
  ELSE
    SELECT "supplierCreditNoteId", "companyId" INTO note_id, tenant_id FROM "SupplierCreditNoteLine"
      WHERE "id" = COALESCE(NEW."supplierCreditNoteLineId", OLD."supplierCreditNoteLineId")
        AND "companyId" = COALESCE(NEW."companyId", OLD."companyId");
  END IF;
  SELECT "status" INTO parent_status FROM "SupplierCreditNote" WHERE "id" = note_id AND "companyId" = tenant_id;
  IF parent_status = 'POSTED' THEN RAISE EXCEPTION 'posted supplier credit note child is immutable'; END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "b05_supplier_credit_note_overage_guard"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_line RECORD; already_credited NUMERIC;
BEGIN
  IF NEW."status" = 'POSTED' AND OLD."status" <> 'POSTED' THEN
    FOR current_line IN SELECT "originalSupplierInvoiceLineId", "quantity" FROM "SupplierCreditNoteLine"
      WHERE "supplierCreditNoteId" = NEW."id" AND "companyId" = NEW."companyId" LOOP
      SELECT COALESCE(SUM(cl."quantity"), 0) INTO already_credited
      FROM "SupplierCreditNoteLine" cl JOIN "SupplierCreditNote" cn
        ON cn."id" = cl."supplierCreditNoteId" AND cn."companyId" = cl."companyId"
      WHERE cl."companyId" = NEW."companyId" AND cl."originalSupplierInvoiceLineId" = current_line."originalSupplierInvoiceLineId"
        AND cn."status" = 'POSTED' AND cn."id" <> NEW."id";
      IF already_credited + current_line."quantity" > (SELECT "quantity" FROM "SupplierInvoiceLine"
        WHERE "id" = current_line."originalSupplierInvoiceLineId" AND "companyId" = NEW."companyId")
      THEN RAISE EXCEPTION 'posted supplier credit notes exceed original invoice quantity'; END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "b05_supplier_invoice_posted_immutability_trigger"
BEFORE UPDATE OR DELETE ON "SupplierInvoice" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_invoice_mutation"();
CREATE TRIGGER "b05_supplier_invoice_line_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SupplierInvoiceLine" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_invoice_child_mutation"();
CREATE TRIGGER "b05_supplier_invoice_line_tax_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SupplierInvoiceLineTax" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_invoice_child_mutation"();
CREATE TRIGGER "b05_supplier_invoice_schedule_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SupplierInvoicePaymentSchedule" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_invoice_child_mutation"();
CREATE TRIGGER "b05_supplier_credit_note_posted_immutability_trigger"
BEFORE UPDATE OR DELETE ON "SupplierCreditNote" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_credit_note_mutation"();
CREATE TRIGGER "b05_supplier_credit_note_line_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SupplierCreditNoteLine" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_credit_note_child_mutation"();
CREATE TRIGGER "b05_supplier_credit_note_line_tax_posted_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "SupplierCreditNoteLineTax" FOR EACH ROW EXECUTE FUNCTION "b05_reject_posted_supplier_credit_note_child_mutation"();
CREATE TRIGGER "b05_supplier_credit_note_overage_guard_trigger"
BEFORE UPDATE OF "status" ON "SupplierCreditNote" FOR EACH ROW EXECUTE FUNCTION "b05_supplier_credit_note_overage_guard"();
