-- CreateIndex
CREATE INDEX "Product_companyId_isDeleted_sku_idx" ON "Product"("companyId", "isDeleted", "sku");
