-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SALARIES', 'UTILITIES', 'SUPPLIES', 'TRANSPORTATION', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER');

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "supplierId" UUID,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "description" VARCHAR(500),
    "referenceNumber" VARCHAR(100),
    "paymentMethod" VARCHAR(100),
    "notes" VARCHAR(1000),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_companyId_isDeleted_expenseDate_idx" ON "Expense"("companyId", "isDeleted", "expenseDate" DESC);

-- CreateIndex
CREATE INDEX "Expense_companyId_isDeleted_category_idx" ON "Expense"("companyId", "isDeleted", "category");

-- CreateIndex
CREATE INDEX "Expense_companyId_isDeleted_supplierId_idx" ON "Expense"("companyId", "isDeleted", "supplierId");

-- CreateIndex
CREATE INDEX "Expense_companyId_createdAt_idx" ON "Expense"("companyId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
