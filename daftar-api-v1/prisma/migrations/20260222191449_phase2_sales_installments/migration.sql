-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CASH', 'DEFERRED', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "DeferredSaleStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('FIXED', 'CUSTOM');

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "saleType" "SaleType";

-- CreateTable
CREATE TABLE "DeferredSale" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "ledgerEntryId" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "description" VARCHAR(500),
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "dueDate" DATE NOT NULL,
    "status" "DeferredSaleStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DeferredSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeferredPayment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "deferredSaleId" UUID NOT NULL,
    "ledgerEntryId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" VARCHAR(100),
    "notes" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeferredPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentContract" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "ledgerEntryId" UUID NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "description" VARCHAR(500),
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "downPayment" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "numberOfInstallments" INTEGER NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InstallmentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentSchedule" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPayment" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "ledgerEntryId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" VARCHAR(100),
    "notes" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeferredSale_ledgerEntryId_key" ON "DeferredSale"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "DeferredSale_companyId_partyType_partyId_status_idx" ON "DeferredSale"("companyId", "partyType", "partyId", "status");

-- CreateIndex
CREATE INDEX "DeferredSale_companyId_dueDate_status_idx" ON "DeferredSale"("companyId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "DeferredSale_companyId_referenceNumber_idx" ON "DeferredSale"("companyId", "referenceNumber");

-- CreateIndex
CREATE INDEX "DeferredSale_companyId_createdAt_idx" ON "DeferredSale"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DeferredPayment_ledgerEntryId_key" ON "DeferredPayment"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "DeferredPayment_companyId_deferredSaleId_idx" ON "DeferredPayment"("companyId", "deferredSaleId");

-- CreateIndex
CREATE INDEX "DeferredPayment_companyId_paymentDate_idx" ON "DeferredPayment"("companyId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentContract_ledgerEntryId_key" ON "InstallmentContract"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "InstallmentContract_companyId_partyType_partyId_status_idx" ON "InstallmentContract"("companyId", "partyType", "partyId", "status");

-- CreateIndex
CREATE INDEX "InstallmentContract_companyId_status_idx" ON "InstallmentContract"("companyId", "status");

-- CreateIndex
CREATE INDEX "InstallmentContract_companyId_contractNumber_idx" ON "InstallmentContract"("companyId", "contractNumber");

-- CreateIndex
CREATE INDEX "InstallmentContract_companyId_createdAt_idx" ON "InstallmentContract"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "InstallmentSchedule_companyId_contractId_installmentNumber_idx" ON "InstallmentSchedule"("companyId", "contractId", "installmentNumber");

-- CreateIndex
CREATE INDEX "InstallmentSchedule_companyId_dueDate_status_idx" ON "InstallmentSchedule"("companyId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPayment_ledgerEntryId_key" ON "InstallmentPayment"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "InstallmentPayment_companyId_contractId_idx" ON "InstallmentPayment"("companyId", "contractId");

-- CreateIndex
CREATE INDEX "InstallmentPayment_companyId_scheduleId_idx" ON "InstallmentPayment"("companyId", "scheduleId");

-- CreateIndex
CREATE INDEX "InstallmentPayment_companyId_paymentDate_idx" ON "InstallmentPayment"("companyId", "paymentDate");

-- AddForeignKey
ALTER TABLE "DeferredSale" ADD CONSTRAINT "DeferredSale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeferredSale" ADD CONSTRAINT "DeferredSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeferredPayment" ADD CONSTRAINT "DeferredPayment_deferredSaleId_fkey" FOREIGN KEY ("deferredSaleId") REFERENCES "DeferredSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeferredPayment" ADD CONSTRAINT "DeferredPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentContract" ADD CONSTRAINT "InstallmentContract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentContract" ADD CONSTRAINT "InstallmentContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentSchedule" ADD CONSTRAINT "InstallmentSchedule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "InstallmentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InstallmentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
