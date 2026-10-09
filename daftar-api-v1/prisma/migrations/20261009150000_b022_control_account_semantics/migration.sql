-- B02.2: control accounts are postable through trusted source contracts;
-- group/inactive accounts are rejected at the database POSTED boundary.

CREATE OR REPLACE FUNCTION "accounting_validate_posted_entry"()
RETURNS TRIGGER AS $$
DECLARE
  line_count BIGINT;
  debit_total NUMERIC;
  credit_total NUMERIC;
  transaction_debit_total NUMERIC;
  transaction_credit_total NUMERIC;
  invalid_account RECORD;
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

    SELECT aa."code", aa."isActive", aa."allowDirectPosting"
      INTO invalid_account
      FROM "JournalLine" jl
      JOIN "AccountingAccount" aa
        ON aa."id" = jl."accountId"
       AND aa."companyId" = jl."companyId"
     WHERE jl."journalEntryId" = NEW."id"
       AND jl."companyId" = NEW."companyId"
       AND (aa."isActive" = false OR aa."allowDirectPosting" = false)
     LIMIT 1;

    IF FOUND THEN
      IF invalid_account."isActive" = false THEN
        RAISE EXCEPTION 'POSTED journal entry cannot contain inactive account %', invalid_account."code";
      END IF;
      RAISE EXCEPTION 'POSTED journal entry cannot contain non-postable account %', invalid_account."code";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
