-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "dueDate" DATE;

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_partyId_status_idx" ON "Invoice"("companyId", "isDeleted", "partyId", "status");

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_dueDate_idx" ON "Invoice"("companyId", "isDeleted", "dueDate");
