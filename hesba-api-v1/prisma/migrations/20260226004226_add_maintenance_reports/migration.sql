-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MaintenanceReport" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "reportNumber" VARCHAR(30) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" VARCHAR(2000),
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "assetName" VARCHAR(300) NOT NULL,
    "assetLocation" VARCHAR(300),
    "assignedToId" UUID,
    "estimatedCost" DECIMAL(14,2),
    "actualCost" DECIMAL(14,2),
    "scheduledAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" VARCHAR(2000),
    "createdById" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_isDeleted_status_createdAt_idx" ON "MaintenanceReport"("companyId", "isDeleted", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_isDeleted_priority_idx" ON "MaintenanceReport"("companyId", "isDeleted", "priority");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_isDeleted_assignedToId_idx" ON "MaintenanceReport"("companyId", "isDeleted", "assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReport_companyId_reportNumber_key" ON "MaintenanceReport"("companyId", "reportNumber");

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
