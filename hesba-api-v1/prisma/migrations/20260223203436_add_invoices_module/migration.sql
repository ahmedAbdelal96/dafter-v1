-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "invoiceNumber" VARCHAR(20) NOT NULL,
    "deferredSaleId" UUID,
    "partyType" "PartyType" NOT NULL,
    "partyId" UUID NOT NULL,
    "partyName" VARCHAR(200) NOT NULL,
    "partyPhone" VARCHAR(20),
    "partyAddress" VARCHAR(500),
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "notes" VARCHAR(1000),
    "issueDate" DATE NOT NULL,
    "createdById" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "productId" UUID,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_deferredSaleId_key" ON "Invoice"("deferredSaleId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_issueDate_idx" ON "Invoice"("companyId", "isDeleted", "issueDate" DESC);

-- CreateIndex
CREATE INDEX "Invoice_companyId_isDeleted_partyType_partyId_idx" ON "Invoice"("companyId", "isDeleted", "partyType", "partyId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_createdAt_idx" ON "Invoice"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_deferredSaleId_fkey" FOREIGN KEY ("deferredSaleId") REFERENCES "DeferredSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
