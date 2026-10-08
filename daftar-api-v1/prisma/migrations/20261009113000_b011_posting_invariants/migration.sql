-- B01.1: database-level protection for both monetary representations.

ALTER TABLE "AccountingConfiguration"
  ADD CONSTRAINT "AccountingConfiguration_reporting_not_base_chk"
  CHECK ("reportingCurrencyCode" IS NULL OR "reportingCurrencyCode" <> "baseCurrencyCode");

CREATE OR REPLACE FUNCTION "accounting_validate_posted_entry"()
RETURNS TRIGGER AS $$
DECLARE
  line_count BIGINT;
  debit_total NUMERIC;
  credit_total NUMERIC;
  transaction_debit_total NUMERIC;
  transaction_credit_total NUMERIC;
BEGIN
  IF NEW."status" = 'POSTED' THEN
    SELECT
      COUNT(*),
      COALESCE(SUM("debit"), 0),
      COALESCE(SUM("credit"), 0),
      COALESCE(SUM("transactionDebit"), 0),
      COALESCE(SUM("transactionCredit"), 0)
      INTO line_count, debit_total, credit_total,
           transaction_debit_total, transaction_credit_total
      FROM "JournalLine"
     WHERE "journalEntryId" = NEW."id" AND "companyId" = NEW."companyId";

    IF line_count < 2
       OR debit_total <> credit_total
       OR transaction_debit_total <> transaction_credit_total THEN
      RAISE EXCEPTION
        'POSTED journal entry must have balanced company and transaction currency lines';
    END IF;
    IF NEW."postedAt" IS NULL OR NEW."postedById" IS NULL THEN
      RAISE EXCEPTION 'POSTED journal entry requires postedAt and postedById';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
