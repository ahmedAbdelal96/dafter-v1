-- B01.1: canonical currency reference data and currency FK foundation.
-- The application still owns conversion policy; this migration owns valid
-- currency identity and precision metadata.

CREATE TABLE "Currency" (
  "code" CHAR(3) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "nativeName" VARCHAR(100),
  "symbol" VARCHAR(12),
  "minorUnitPrecision" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Currency_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "Currency_code_chk" CHECK (btrim("code") ~ '^[A-Z]{3}$'),
  CONSTRAINT "Currency_minor_unit_precision_chk" CHECK ("minorUnitPrecision" BETWEEN 0 AND 4)
);

INSERT INTO "Currency" ("code", "name", "nativeName", "symbol", "minorUnitPrecision", "updatedAt")
VALUES
  ('AED', 'United Arab Emirates Dirham', 'درهم إماراتي', 'د.إ', 2, CURRENT_TIMESTAMP),
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 'ج.م', 2, CURRENT_TIMESTAMP),
  ('EUR', 'Euro', 'يورو', '€', 2, CURRENT_TIMESTAMP),
  ('GBP', 'Pound Sterling', 'جنيه إسترليني', '£', 2, CURRENT_TIMESTAMP),
  ('JPY', 'Japanese Yen', 'ين ياباني', '¥', 0, CURRENT_TIMESTAMP),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', 2, CURRENT_TIMESTAMP),
  ('USD', 'United States Dollar', 'دولار أمريكي', '$', 2, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "Company"
  ADD CONSTRAINT "Company_currencyCode_fkey"
  FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingAccount"
  ADD CONSTRAINT "AccountingAccount_currencyCode_fkey"
  FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingJournal"
  ADD CONSTRAINT "AccountingJournal_currencyCode_fkey"
  FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_transactionCurrencyCode_fkey"
  FOREIGN KEY ("transactionCurrencyCode") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingConfiguration"
  ADD CONSTRAINT "AccountingConfiguration_baseCurrencyCode_fkey"
  FOREIGN KEY ("baseCurrencyCode") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingConfiguration_reportingCurrencyCode_fkey"
  FOREIGN KEY ("reportingCurrencyCode") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
