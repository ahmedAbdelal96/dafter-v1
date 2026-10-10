-- B03.2 central conversion-residual policy and tax-selection provenance.

CREATE TYPE "SalesTaxSelectionProvenance" AS ENUM (
  'MODULE_DEFAULT',
  'COMPANY_DEFAULT',
  'EXPLICIT_OVERRIDE',
  'MODULE_DISABLED_OUT_OF_SCOPE'
);

ALTER TABLE "SalesInvoiceLineTax"
  ADD COLUMN "selectionProvenance" "SalesTaxSelectionProvenance"
  NOT NULL DEFAULT 'COMPANY_DEFAULT';

ALTER TABLE "SalesInvoiceLineTax"
  ALTER COLUMN "selectionProvenance" DROP DEFAULT;

CREATE OR REPLACE FUNCTION "sales_reject_posted_credit_overage"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_line RECORD;
  already_credited_quantity NUMERIC;
  already_credited_base NUMERIC;
  already_credited_tax NUMERIC;
  already_credited_total NUMERIC;
  original_line RECORD;
BEGIN
  IF NEW."status" = 'POSTED' AND OLD."status" <> 'POSTED' THEN
    FOR current_line IN
      SELECT "originalSalesInvoiceLineId", "quantity"
      FROM "SalesCreditNoteLine"
      WHERE "salesCreditNoteId" = NEW."id"
        AND "companyId" = NEW."companyId"
      ORDER BY "originalSalesInvoiceLineId", "id"
    LOOP
      SELECT "id", "quantity", "taxableBase", "taxAmount", "lineTotal"
      INTO original_line
      FROM "SalesInvoiceLine"
      WHERE "id" = current_line."originalSalesInvoiceLineId"
        AND "companyId" = NEW."companyId"
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'credit note source line is missing';
      END IF;

      SELECT
        COALESCE(SUM(cl."quantity"), 0),
        COALESCE(SUM(cl."taxableBase"), 0),
        COALESCE(SUM(cl."taxAmount"), 0),
        COALESCE(SUM(cl."lineTotal"), 0)
      INTO
        already_credited_quantity,
        already_credited_base,
        already_credited_tax,
        already_credited_total
      FROM "SalesCreditNoteLine" cl
      JOIN "SalesCreditNote" cn
        ON cn."id" = cl."salesCreditNoteId"
       AND cn."companyId" = cl."companyId"
      WHERE cl."companyId" = NEW."companyId"
        AND cl."originalSalesInvoiceLineId" = current_line."originalSalesInvoiceLineId"
        AND cn."status" = 'POSTED'
        AND cn."id" <> NEW."id";

      IF already_credited_quantity + current_line."quantity" > original_line."quantity"
         OR already_credited_base + (
           SELECT COALESCE(SUM(cl2."taxableBase"), 0)
           FROM "SalesCreditNoteLine" cl2
           WHERE cl2."salesCreditNoteId" = NEW."id"
             AND cl2."companyId" = NEW."companyId"
             AND cl2."originalSalesInvoiceLineId" = current_line."originalSalesInvoiceLineId"
         ) > original_line."taxableBase"
         OR already_credited_tax + (
           SELECT COALESCE(SUM(cl3."taxAmount"), 0)
           FROM "SalesCreditNoteLine" cl3
           WHERE cl3."salesCreditNoteId" = NEW."id"
             AND cl3."companyId" = NEW."companyId"
             AND cl3."originalSalesInvoiceLineId" = current_line."originalSalesInvoiceLineId"
         ) > original_line."taxAmount"
         OR already_credited_total + (
           SELECT COALESCE(SUM(cl4."lineTotal"), 0)
           FROM "SalesCreditNoteLine" cl4
           WHERE cl4."salesCreditNoteId" = NEW."id"
             AND cl4."companyId" = NEW."companyId"
             AND cl4."originalSalesInvoiceLineId" = current_line."originalSalesInvoiceLineId"
         ) > original_line."lineTotal" THEN
        RAISE EXCEPTION 'posted credit notes exceed original invoice values';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
