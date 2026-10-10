-- B04.1: one authoritative JournalLine-to-JournalLine AR reconciliation model.
ALTER TYPE "JournalSourceType" ADD VALUE IF NOT EXISTS 'AR_RECONCILIATION';
CREATE TYPE "ARReconciliationStatus" AS ENUM ('ACTIVE', 'REVERSED');

ALTER TABLE "JournalLine" ADD COLUMN "sequence" INTEGER;
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "companyId", "journalEntryId"
    ORDER BY "createdAt", "id"
  )::INTEGER AS sequence
  FROM "JournalLine"
)
UPDATE "JournalLine" jl
SET "sequence" = numbered.sequence
FROM numbered
WHERE numbered."id" = jl."id";
ALTER TABLE "JournalLine" ALTER COLUMN "sequence" SET NOT NULL;
CREATE UNIQUE INDEX "JournalLine_companyId_journalEntryId_sequence_key"
  ON "JournalLine" ("companyId", "journalEntryId", "sequence");

ALTER TABLE "CustomerPayment"
  ADD COLUMN "receivableAccountId" UUID,
  ADD COLUMN "arJournalLineId" UUID,
  ADD COLUMN "reversalIdempotencyKey" VARCHAR(128),
  ADD COLUMN "reversalRequestHash" CHAR(64);

UPDATE "CustomerPayment" cp
SET "receivableAccountId" = COALESCE(
  (
    SELECT cpa."accountId"
    FROM "CustomerProfile" profile
    JOIN "AccountingConfigurationAccount" cpa
      ON cpa."companyId" = cp."companyId"
     AND cpa."settingKey" = 'RECEIVABLE'
    WHERE profile."businessPartnerId" = cp."businessPartnerId"
      AND profile."companyId" = cp."companyId"
      AND profile."receivableAccountId" = cpa."accountId"
    LIMIT 1
  ),
  (
    SELECT cpa."accountId"
    FROM "AccountingConfigurationAccount" cpa
    WHERE cpa."companyId" = cp."companyId"
      AND cpa."settingKey" = 'RECEIVABLE'
    LIMIT 1
  )
)
WHERE "receivableAccountId" IS NULL;
ALTER TABLE "CustomerPayment" ALTER COLUMN "receivableAccountId" SET NOT NULL;
ALTER TABLE "CustomerPayment"
  ADD CONSTRAINT "CustomerPayment_receivableAccountId_companyId_fkey"
  FOREIGN KEY ("receivableAccountId", "companyId")
  REFERENCES "AccountingAccount" ("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CustomerPayment_companyId_receivableAccountId_idx"
  ON "CustomerPayment" ("companyId", "receivableAccountId");
CREATE UNIQUE INDEX "CustomerPayment_arJournalLineId_companyId_key"
  ON "CustomerPayment" ("arJournalLineId", "companyId");
CREATE UNIQUE INDEX "CustomerPayment_companyId_reversalIdempotencyKey_key"
  ON "CustomerPayment" ("companyId", "reversalIdempotencyKey");
ALTER TABLE "CustomerPayment"
  ADD CONSTRAINT "CustomerPayment_arJournalLineId_companyId_fkey"
  FOREIGN KEY ("arJournalLineId", "companyId") REFERENCES "JournalLine" ("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO "AccountingConfigurationJournal"
  ("id", "companyId", "configurationId", "settingKey", "journalId")
SELECT gen_random_uuid(), cfg."companyId", cfg."id", 'EXCHANGE_DIFFERENCE', general."journalId"
FROM "AccountingConfiguration" cfg
JOIN "AccountingConfigurationJournal" general
  ON general."companyId" = cfg."companyId"
 AND general."configurationId" = cfg."id"
 AND general."settingKey" = 'GENERAL'
WHERE NOT EXISTS (
  SELECT 1 FROM "AccountingConfigurationJournal" existing
  WHERE existing."companyId" = cfg."companyId"
    AND existing."configurationId" = cfg."id"
    AND existing."settingKey" = 'EXCHANGE_DIFFERENCE'
);

ALTER TABLE "CustomerPaymentAllocation"
  ADD COLUMN "arReconciliationId" UUID;
CREATE UNIQUE INDEX "CustomerPaymentAllocation_arReconciliationId_companyId_key"
  ON "CustomerPaymentAllocation" ("arReconciliationId", "companyId");

ALTER TABLE "ARReconciliation" RENAME TO "ARReconciliationLegacyB04";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_pkey" TO "ARReconciliationLegacyB04_pkey";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_id_companyId_key" TO "ARReconciliationLegacyB04_id_companyId_key";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_companyId_fkey" TO "ARReconciliationLegacyB04_companyId_fkey";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_customerPaymentId_companyId_fkey" TO "ARReconciliationLegacyB04_customerPaymentId_companyId_fkey";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_journalLineId_companyId_fkey" TO "ARReconciliationLegacyB04_journalLineId_companyId_fkey";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_createdById_fkey" TO "ARReconciliationLegacyB04_createdById_fkey";
ALTER TABLE "ARReconciliationLegacyB04"
  RENAME CONSTRAINT "ARReconciliation_amount_positive" TO "ARReconciliationLegacyB04_amount_positive";
ALTER INDEX "ARReconciliation_companyId_idempotencyKey_key"
  RENAME TO "ARReconciliationLegacyB04_companyId_idempotencyKey_key";
ALTER INDEX "ARReconciliation_companyId_journalLineId_idx"
  RENAME TO "ARReconciliationLegacyB04_companyId_journalLineId_idx";

CREATE TABLE "ARReconciliation" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "debitJournalLineId" UUID NOT NULL,
  "creditJournalLineId" UUID NOT NULL,
  "customerPaymentId" UUID,
  "transactionAmount" DECIMAL(19,4) NOT NULL,
  "debitBaseAmountApplied" DECIMAL(19,4) NOT NULL,
  "creditBaseAmountApplied" DECIMAL(19,4) NOT NULL,
  "realizedFxAmount" DECIMAL(19,4) NOT NULL,
  "status" "ARReconciliationStatus" NOT NULL DEFAULT 'ACTIVE',
  "adjustmentJournalEntryId" UUID,
  "reversalJournalEntryId" UUID,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "createdById" UUID NOT NULL,
  "reversedById" UUID,
  "reversedAt" TIMESTAMP(3),
  "reversalReason" VARCHAR(500),
  "reversalIdempotencyKey" VARCHAR(128),
  "reversalRequestHash" CHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ARReconciliation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ARReconciliation_id_companyId_key" UNIQUE ("id", "companyId"),
  CONSTRAINT "ARReconciliation_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_debitJournalLineId_companyId_fkey"
    FOREIGN KEY ("debitJournalLineId", "companyId") REFERENCES "JournalLine" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_creditJournalLineId_companyId_fkey"
    FOREIGN KEY ("creditJournalLineId", "companyId") REFERENCES "JournalLine" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_customerPaymentId_companyId_fkey"
    FOREIGN KEY ("customerPaymentId", "companyId") REFERENCES "CustomerPayment" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_adjustmentJournalEntryId_companyId_fkey"
    FOREIGN KEY ("adjustmentJournalEntryId", "companyId") REFERENCES "JournalEntry" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_reversalJournalEntryId_companyId_fkey"
    FOREIGN KEY ("reversalJournalEntryId", "companyId") REFERENCES "JournalEntry" ("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_reversedById_fkey"
    FOREIGN KEY ("reversedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ARReconciliation_transactionAmount_positive" CHECK ("transactionAmount" > 0),
  CONSTRAINT "ARReconciliation_debitBaseAmount_positive" CHECK ("debitBaseAmountApplied" > 0),
  CONSTRAINT "ARReconciliation_creditBaseAmount_positive" CHECK ("creditBaseAmountApplied" > 0)
);
CREATE UNIQUE INDEX "ARReconciliation_companyId_idempotencyKey_key"
  ON "ARReconciliation" ("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "ARReconciliation_companyId_reversalIdempotencyKey_key"
  ON "ARReconciliation" ("companyId", "reversalIdempotencyKey");
CREATE INDEX "ARReconciliation_companyId_debitJournalLineId_status_idx"
  ON "ARReconciliation" ("companyId", "debitJournalLineId", "status");
CREATE INDEX "ARReconciliation_companyId_creditJournalLineId_status_idx"
  ON "ARReconciliation" ("companyId", "creditJournalLineId", "status");

ALTER TABLE "CustomerPaymentAllocation"
  ADD CONSTRAINT "CustomerPaymentAllocation_arReconciliationId_companyId_fkey"
  FOREIGN KEY ("arReconciliationId", "companyId")
  REFERENCES "ARReconciliation" ("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ARReconciliation" DISABLE TRIGGER ALL;
WITH legacy_ranked AS (
  SELECT r.*, ROW_NUMBER() OVER (
    PARTITION BY r."customerPaymentId"
    ORDER BY r."createdAt", r."id"
  )::INTEGER AS source_offset
  FROM "ARReconciliationLegacyB04" r
), legacy_context AS (
  SELECT
    r.*,
    cp."status" AS payment_status,
    cp."reversedById" AS payment_reversed_by_id,
    cp."reversedAt" AS payment_reversed_at,
    debit."debit" - debit."credit" AS debit_base_open,
    debit."transactionDebit" - debit."transactionCredit" AS debit_transaction_open,
    credit."credit" - credit."debit" AS credit_base_open,
    credit."transactionCredit" - credit."transactionDebit" AS credit_transaction_open,
    credit."id" AS credit_journal_line_id,
    credit."credit" - credit."debit" AS credit_base_line
  FROM legacy_ranked r
  JOIN "CustomerPayment" cp
    ON cp."id" = r."customerPaymentId" AND cp."companyId" = r."companyId"
  JOIN "JournalLine" debit
    ON debit."id" = r."journalLineId" AND debit."companyId" = r."companyId"
  JOIN "JournalLine" credit
    ON credit."journalEntryId" = cp."journalEntryId"
   AND credit."companyId" = cp."companyId"
   AND credit."sequence" = r.source_offset + 1
   AND credit."transactionCredit" > credit."transactionDebit"
)
INSERT INTO "ARReconciliation" (
  "id", "companyId", "debitJournalLineId", "creditJournalLineId",
  "customerPaymentId", "transactionAmount", "debitBaseAmountApplied",
  "creditBaseAmountApplied", "realizedFxAmount", "status",
  "idempotencyKey", "requestHash", "createdById", "reversedById",
  "reversedAt", "reversalReason", "createdAt", "updatedAt"
)
SELECT
  "id", "companyId", "journalLineId", "credit_journal_line_id",
  "customerPaymentId", "amount",
  CASE WHEN "amount" = debit_transaction_open THEN debit_base_open
       ELSE ROUND(debit_base_open * "amount" / debit_transaction_open, 4) END,
  CASE WHEN "amount" = credit_transaction_open THEN credit_base_line
       ELSE ROUND(credit_base_line * "amount" / credit_transaction_open, 4) END,
  CASE WHEN "amount" = credit_transaction_open THEN credit_base_line
       ELSE ROUND(credit_base_line * "amount" / credit_transaction_open, 4) END
    - CASE WHEN "amount" = debit_transaction_open THEN debit_base_open
           ELSE ROUND(debit_base_open * "amount" / debit_transaction_open, 4) END,
  CASE WHEN payment_status = 'REVERSED' THEN 'REVERSED'::"ARReconciliationStatus"
       ELSE 'ACTIVE'::"ARReconciliationStatus" END,
  'legacy-b04-' || "id"::text,
  md5("id"::text || ':legacy-b04:1') || md5("id"::text || ':legacy-b04:2'),
  "createdById",
  payment_reversed_by_id,
  payment_reversed_at,
  CASE WHEN payment_status = 'REVERSED' THEN 'Legacy B04 payment reversal' ELSE NULL END,
  "createdAt", "createdAt"
FROM legacy_context;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "ARReconciliationLegacyB04") <> (SELECT COUNT(*) FROM "ARReconciliation") THEN
    RAISE EXCEPTION 'B04.1 could not preserve every legacy AR reconciliation row';
  END IF;
END;
$$;

UPDATE "CustomerPaymentAllocation" allocation
SET "arReconciliationId" = legacy."id"
FROM "ARReconciliationLegacyB04" legacy
WHERE legacy."customerPaymentId" = allocation."customerPaymentId"
  AND legacy."companyId" = allocation."companyId"
  AND legacy."journalLineId" = allocation."journalLineId";
DROP TABLE "ARReconciliationLegacyB04";
ALTER TABLE "ARReconciliation" ENABLE TRIGGER ALL;

CREATE OR REPLACE FUNCTION b041_validate_ar_reconciliation() RETURNS trigger AS $$
DECLARE
  debit_line RECORD;
  credit_line RECORD;
  existing_debit NUMERIC;
  existing_credit NUMERIC;
BEGIN
  SELECT jl.*, je."status" AS entry_status, je."transactionCurrencyCode" AS currency_code,
         je."sourceType" AS source_type, je."reversalOfEntryId" AS reversal_of_entry_id,
         aa."accountType" AS account_type, aa."isControlAccount" AS is_control,
         aa."reconciliationEligible" AS reconciliation_eligible
  INTO debit_line
  FROM "JournalLine" jl
  JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
  JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
  WHERE jl."id" = NEW."debitJournalLineId" AND jl."companyId" = NEW."companyId";
  SELECT jl.*, je."status" AS entry_status, je."transactionCurrencyCode" AS currency_code,
         je."sourceType" AS source_type, je."reversalOfEntryId" AS reversal_of_entry_id,
         aa."accountType" AS account_type, aa."isControlAccount" AS is_control,
         aa."reconciliationEligible" AS reconciliation_eligible
  INTO credit_line
  FROM "JournalLine" jl
  JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
  JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
  WHERE jl."id" = NEW."creditJournalLineId" AND jl."companyId" = NEW."companyId";
  IF debit_line IS NULL OR credit_line IS NULL
     OR debit_line.entry_status <> 'POSTED'
     OR credit_line.entry_status <> 'POSTED'
     OR debit_line.source_type IN ('AR_RECONCILIATION', 'REVERSAL')
     OR credit_line.source_type IN ('AR_RECONCILIATION', 'REVERSAL')
     OR debit_line.reversal_of_entry_id IS NOT NULL
     OR credit_line.reversal_of_entry_id IS NOT NULL
     OR debit_line."businessPartnerId" IS NULL
     OR debit_line."businessPartnerId" <> credit_line."businessPartnerId"
     OR debit_line.currency_code <> credit_line.currency_code
     OR debit_line.account_type <> 'ASSET_RECEIVABLE'
     OR credit_line.account_type <> 'ASSET_RECEIVABLE'
     OR NOT debit_line.is_control OR NOT debit_line.reconciliation_eligible
     OR NOT credit_line.is_control OR NOT credit_line.reconciliation_eligible
     OR debit_line."transactionDebit" <= debit_line."transactionCredit"
     OR credit_line."transactionCredit" <= credit_line."transactionDebit"
  THEN RAISE EXCEPTION 'AR reconciliation lines are not valid authoritative AR control lines';
  END IF;
  IF NEW."status" = 'ACTIVE' THEN
    SELECT COALESCE(SUM("transactionAmount"), 0)
      INTO existing_debit FROM "ARReconciliation"
      WHERE "companyId" = NEW."companyId" AND "debitJournalLineId" = NEW."debitJournalLineId"
        AND "status" = 'ACTIVE' AND "id" <> NEW."id";
    SELECT COALESCE(SUM("transactionAmount"), 0)
      INTO existing_credit FROM "ARReconciliation"
      WHERE "companyId" = NEW."companyId" AND "creditJournalLineId" = NEW."creditJournalLineId"
        AND "status" = 'ACTIVE' AND "id" <> NEW."id";
    IF NEW."transactionAmount" > debit_line."transactionDebit" - debit_line."transactionCredit" - existing_debit
       OR NEW."transactionAmount" > credit_line."transactionCredit" - credit_line."transactionDebit" - existing_credit
    THEN RAISE EXCEPTION 'AR reconciliation exceeds an open debit or credit line';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION b041_ar_reconciliation_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'ACTIVE'
     AND NEW."id" = OLD."id"
     AND NEW."companyId" = OLD."companyId"
     AND NEW."debitJournalLineId" = OLD."debitJournalLineId"
     AND NEW."creditJournalLineId" = OLD."creditJournalLineId"
     AND NEW."customerPaymentId" IS NOT DISTINCT FROM OLD."customerPaymentId"
     AND NEW."transactionAmount" = OLD."transactionAmount"
     AND NEW."debitBaseAmountApplied" = OLD."debitBaseAmountApplied"
     AND NEW."creditBaseAmountApplied" = OLD."creditBaseAmountApplied"
     AND NEW."realizedFxAmount" = OLD."realizedFxAmount"
     AND NEW."idempotencyKey" = OLD."idempotencyKey"
     AND NEW."requestHash" = OLD."requestHash"
     AND OLD."adjustmentJournalEntryId" IS NULL
     AND NEW."adjustmentJournalEntryId" IS NOT NULL
  THEN RETURN NEW;
  END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'REVERSED'
     AND NEW."id" = OLD."id"
     AND NEW."companyId" = OLD."companyId"
     AND NEW."debitJournalLineId" = OLD."debitJournalLineId"
     AND NEW."creditJournalLineId" = OLD."creditJournalLineId"
     AND NEW."customerPaymentId" IS NOT DISTINCT FROM OLD."customerPaymentId"
     AND NEW."transactionAmount" = OLD."transactionAmount"
     AND NEW."debitBaseAmountApplied" = OLD."debitBaseAmountApplied"
     AND NEW."creditBaseAmountApplied" = OLD."creditBaseAmountApplied"
     AND NEW."realizedFxAmount" = OLD."realizedFxAmount"
     AND NEW."adjustmentJournalEntryId" IS NOT DISTINCT FROM OLD."adjustmentJournalEntryId"
     AND NEW."idempotencyKey" = OLD."idempotencyKey"
     AND NEW."requestHash" = OLD."requestHash"
     AND NEW."reversedById" IS NOT NULL
     AND NEW."reversalReason" IS NOT NULL
  THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AR reconciliation financial content is immutable; use controlled reversal';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER b041_ar_reconciliation_validate
  BEFORE INSERT ON "ARReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b041_validate_ar_reconciliation();
CREATE TRIGGER b041_ar_reconciliation_immutable_update
  BEFORE UPDATE ON "ARReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b041_ar_reconciliation_immutable();
CREATE TRIGGER b041_ar_reconciliation_immutable_delete
  BEFORE DELETE ON "ARReconciliation"
  FOR EACH ROW EXECUTE FUNCTION b041_ar_reconciliation_immutable();
