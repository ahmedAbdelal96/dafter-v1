-- CreateTable
CREATE TABLE "customer_product_prices" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_product_prices_companyId_customerId_idx" ON "customer_product_prices"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "customer_product_prices_companyId_productId_idx" ON "customer_product_prices"("companyId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_product_prices_companyId_customerId_productId_key" ON "customer_product_prices"("companyId", "customerId", "productId");

-- AddForeignKey
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_prices" ADD CONSTRAINT "customer_product_prices_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
