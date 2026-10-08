-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoicePaymentStatus" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00;

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_invoicePaymentStatus_idx" ON "Invoice"("companyId", "isDeleted", "invoicePaymentStatus");

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_partyType_partyId_issueDate_idx" ON "Invoice"("companyId", "isDeleted", "partyType", "partyId", "issueDate" DESC);
