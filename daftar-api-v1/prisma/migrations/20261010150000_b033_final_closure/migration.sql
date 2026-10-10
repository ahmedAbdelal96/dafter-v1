ALTER TABLE "SalesInvoiceLineTax"
  ADD COLUMN "overrideReasonSnapshot" VARCHAR(1000);

ALTER TABLE "SalesInvoiceLineTax"
  ADD CONSTRAINT "SalesInvoiceLineTax_override_reason_chk"
  CHECK (
    "selectionProvenance" <> 'EXPLICIT_OVERRIDE'
    OR NULLIF(BTRIM("overrideReasonSnapshot"), '') IS NOT NULL
  );

CREATE OR REPLACE FUNCTION "accounting_reject_manual_receivable_payable"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'POSTED'
     AND NEW."sourceType" = 'MANUAL_JOURNAL'
     AND EXISTS (
       SELECT 1
       FROM "JournalLine" jl
       JOIN "AccountingAccount" aa
         ON aa."id" = jl."accountId"
        AND aa."companyId" = jl."companyId"
       WHERE jl."journalEntryId" = NEW."id"
         AND jl."companyId" = NEW."companyId"
         AND aa."accountType" IN ('ASSET_RECEIVABLE', 'LIABILITY_PAYABLE')
     )
  THEN
    RAISE EXCEPTION 'Manual journals cannot post to receivable or payable accounts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_reject_posted_manual_receivable_payable_line"()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "JournalEntry" je
    JOIN "AccountingAccount" aa
      ON aa."id" = NEW."accountId"
     AND aa."companyId" = NEW."companyId"
    WHERE je."id" = NEW."journalEntryId"
      AND je."companyId" = NEW."companyId"
      AND je."status" = 'POSTED'
      AND je."sourceType" = 'MANUAL_JOURNAL'
      AND aa."accountType" IN ('ASSET_RECEIVABLE', 'LIABILITY_PAYABLE')
  )
  THEN
    RAISE EXCEPTION 'Manual journals cannot post to receivable or payable accounts';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "accounting_reject_manual_receivable_payable_trigger" ON "JournalEntry";
CREATE TRIGGER "accounting_reject_manual_receivable_payable_trigger"
BEFORE INSERT OR UPDATE OF "status" ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_reject_manual_receivable_payable"();

DROP TRIGGER IF EXISTS "accounting_reject_posted_manual_receivable_payable_line_trigger" ON "JournalLine";
CREATE TRIGGER "accounting_reject_posted_manual_receivable_payable_line_trigger"
BEFORE INSERT OR UPDATE OF "accountId", "journalEntryId" ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION "accounting_reject_posted_manual_receivable_payable_line"();
