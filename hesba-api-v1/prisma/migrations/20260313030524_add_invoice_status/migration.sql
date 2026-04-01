/*
  Warnings:

  - You are about to drop the `MaintenanceReport` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_companyId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_createdById_fkey";

-- DropIndex
DROP INDEX "CompanySubscription_one_live_per_company_idx";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "MaintenanceReport";

-- DropEnum
DROP TYPE "MaintenancePriority";

-- DropEnum
DROP TYPE "MaintenanceStatus";

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_status_idx" ON "Invoice"("companyId", "isDeleted", "status");
