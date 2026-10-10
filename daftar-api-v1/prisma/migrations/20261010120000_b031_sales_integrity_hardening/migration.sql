-- B03.1 authoritative accounting-basis snapshots and database over-credit guard.

ALTER TABLE "SalesInvoice" ADD COLUMN "receivableAccountId" UUID;
ALTER TABLE "SalesInvoiceLineTax" ADD COLUMN "taxLiabilityAccountId" UUID;
ALTER TABLE "SalesCreditNote" ADD COLUMN "receivableAccountId" UUID;
ALTER TABLE "SalesCreditNoteLine" ADD COLUMN "revenueAccountId" UUID;
ALTER TABLE "SalesCreditNoteLine" ADD COLUMN "taxLiabilityAccountId" UUID;

CREATE INDEX "SalesInvoice_companyId_receivableAccountId_idx"
  ON "SalesInvoice"("companyId", "receivableAccountId");
CREATE INDEX "SalesCreditNote_companyId_receivableAccountId_idx"
  ON "SalesCreditNote"("companyId", "receivableAccountId");

ALTER TABLE "SalesInvoice"
  ADD CONSTRAINT "SalesInvoice_receivableAccountId_companyId_fkey"
  FOREIGN KEY ("receivableAccountId", "companyId")
  REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine"
  ADD CONSTRAINT "SalesInvoiceLine_revenueAccountId_companyId_fkey"
  FOREIGN KEY ("revenueAccountId", "companyId")
  REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLineTax"
  ADD CONSTRAINT "SalesInvoiceLineTax_taxLiabilityAccountId_companyId_fkey"
  FOREIGN KEY ("taxLiabilityAccountId", "companyId")
  REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesCreditNote"
  ADD CONSTRAINT "SalesCreditNote_receivableAccountId_companyId_fkey"
  FOREIGN KEY ("receivableAccountId", "companyId")
  REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesCreditNoteLine"
  ADD CONSTRAINT "SalesCreditNoteLine_revenueAccountId_companyId_fkey"
  FOREIGN KEY ("revenueAccountId", "companyId")
  REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesCreditNoteLine"
  ADD CONSTRAINT "SalesCreditNoteLine_taxLiabilityAccountId_companyId_fkey"
  FOREIGN KEY ("taxLiabilityAccountId", "companyId")
  REFERENCES "AccountingAccount"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "sales_reject_posted_credit_overage"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_line RECORD;
  already_credited NUMERIC;
BEGIN
  IF NEW."status" = 'POSTED' AND OLD."status" <> 'POSTED' THEN
    FOR current_line IN
      SELECT "originalSalesInvoiceLineId", "quantity"
      FROM "SalesCreditNoteLine"
      WHERE "salesCreditNoteId" = NEW."id" AND "companyId" = NEW."companyId"
    LOOP
      SELECT COALESCE(SUM(cl."quantity"), 0)
      INTO already_credited
      FROM "SalesCreditNoteLine" cl
      JOIN "SalesCreditNote" cn ON cn."id" = cl."salesCreditNoteId"
        AND cn."companyId" = cl."companyId"
      WHERE cl."companyId" = NEW."companyId"
        AND cl."originalSalesInvoiceLineId" = current_line."originalSalesInvoiceLineId"
        AND cn."status" = 'POSTED'
        AND cn."id" <> NEW."id";

      IF already_credited + current_line."quantity" > (
        SELECT "quantity" FROM "SalesInvoiceLine"
        WHERE "id" = current_line."originalSalesInvoiceLineId"
          AND "companyId" = NEW."companyId"
      ) THEN
        RAISE EXCEPTION 'posted credit notes exceed original invoice quantity';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "sales_credit_note_overage_guard_trigger"
BEFORE UPDATE OF "status" ON "SalesCreditNote"
FOR EACH ROW EXECUTE FUNCTION "sales_reject_posted_credit_overage"();
