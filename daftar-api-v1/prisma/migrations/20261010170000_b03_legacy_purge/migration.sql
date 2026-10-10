-- B03 legacy purge: remove the pre-B02/B03 financial and sales truth.
-- Historical migrations remain immutable; this migration is intentionally
-- destructive because the product is pre-launch and the new authority is
-- BusinessPartner + SalesInvoice + JournalEntry/JournalLine.

ALTER TABLE "Expense"
  DROP CONSTRAINT IF EXISTS "Expense_supplierId_fkey";

ALTER TABLE "Expense"
  DROP COLUMN IF EXISTS "supplierId";

ALTER TABLE "Employee"
  DROP COLUMN IF EXISTS "openingBalance";

DROP TABLE IF EXISTS "customer_product_prices" CASCADE;
DROP TABLE IF EXISTS "InvoiceItem" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "InstallmentPayment" CASCADE;
DROP TABLE IF EXISTS "InstallmentSchedule" CASCADE;
DROP TABLE IF EXISTS "InstallmentContract" CASCADE;
DROP TABLE IF EXISTS "DeferredPayment" CASCADE;
DROP TABLE IF EXISTS "DeferredSale" CASCADE;
DROP TABLE IF EXISTS "Balance" CASCADE;
DROP TABLE IF EXISTS "LedgerEntry" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "Supplier" CASCADE;

DROP TYPE IF EXISTS "InvoicePaymentStatus";
DROP TYPE IF EXISTS "InvoiceStatus";
DROP TYPE IF EXISTS "ScheduleStatus";
DROP TYPE IF EXISTS "ScheduleType";
DROP TYPE IF EXISTS "InstallmentStatus";
DROP TYPE IF EXISTS "DeferredSaleStatus";
DROP TYPE IF EXISTS "SaleType";
DROP TYPE IF EXISTS "LedgerEntryType";
DROP TYPE IF EXISTS "PartyType";
