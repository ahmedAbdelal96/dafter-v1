-- B01.1: currency-sensitive master fields are immutable after posted history.

CREATE OR REPLACE FUNCTION "accounting_protect_currency_history_change"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'Company'
     AND NEW."currencyCode" IS DISTINCT FROM OLD."currencyCode"
     AND EXISTS (
       SELECT 1 FROM "JournalEntry"
        WHERE "companyId" = OLD."id"
          AND "status" IN ('POSTED', 'REVERSED')
     ) THEN
    RAISE EXCEPTION 'Company base currency cannot change after posted accounting history';
  END IF;

  IF TG_TABLE_NAME = 'AccountingConfiguration'
     AND NEW."baseCurrencyCode" IS DISTINCT FROM OLD."baseCurrencyCode"
     AND EXISTS (
       SELECT 1 FROM "JournalEntry"
        WHERE "companyId" = OLD."companyId"
          AND "status" IN ('POSTED', 'REVERSED')
     ) THEN
    RAISE EXCEPTION 'Accounting base currency cannot change after posted accounting history';
  END IF;

  IF TG_TABLE_NAME = 'AccountingAccount'
     AND NEW."currencyCode" IS DISTINCT FROM OLD."currencyCode"
     AND EXISTS (
       SELECT 1
         FROM "JournalLine" l
         JOIN "JournalEntry" e ON e."id" = l."journalEntryId"
                              AND e."companyId" = l."companyId"
        WHERE l."companyId" = OLD."companyId"
          AND l."accountId" = OLD."id"
          AND e."status" IN ('POSTED', 'REVERSED')
     ) THEN
    RAISE EXCEPTION 'Account currency cannot change after posted accounting history';
  END IF;

  IF TG_TABLE_NAME = 'AccountingJournal'
     AND NEW."currencyCode" IS DISTINCT FROM OLD."currencyCode"
     AND EXISTS (
       SELECT 1 FROM "JournalEntry"
        WHERE "companyId" = OLD."companyId"
          AND "journalId" = OLD."id"
          AND "status" IN ('POSTED', 'REVERSED')
     ) THEN
    RAISE EXCEPTION 'Journal currency cannot change after posted accounting history';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "accounting_company_currency_history_lock"
BEFORE UPDATE OF "currencyCode" ON "Company"
FOR EACH ROW EXECUTE FUNCTION "accounting_protect_currency_history_change"();

CREATE TRIGGER "accounting_configuration_currency_history_lock"
BEFORE UPDATE OF "baseCurrencyCode" ON "AccountingConfiguration"
FOR EACH ROW EXECUTE FUNCTION "accounting_protect_currency_history_change"();

CREATE TRIGGER "accounting_account_currency_history_lock"
BEFORE UPDATE OF "currencyCode" ON "AccountingAccount"
FOR EACH ROW EXECUTE FUNCTION "accounting_protect_currency_history_change"();

CREATE TRIGGER "accounting_journal_currency_history_lock"
BEFORE UPDATE OF "currencyCode" ON "AccountingJournal"
FOR EACH ROW EXECUTE FUNCTION "accounting_protect_currency_history_change"();
