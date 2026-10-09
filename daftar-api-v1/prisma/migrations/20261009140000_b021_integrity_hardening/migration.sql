-- B02.1: integrity hardening that cannot be represented by Prisma schema syntax.

CREATE UNIQUE INDEX "BusinessPartnerAddress_one_default_per_type_idx"
  ON "BusinessPartnerAddress" ("companyId", "businessPartnerId", "addressType")
  WHERE "isDefault" = true;

CREATE UNIQUE INDEX "BusinessPartnerContact_one_primary_idx"
  ON "BusinessPartnerContact" ("companyId", "businessPartnerId")
  WHERE "isPrimary" = true;

ALTER TABLE "OpeningBalanceBatch"
  ADD COLUMN "postingIdempotencyKey" VARCHAR(128),
  ADD COLUMN "postingRequestHash" CHAR(64),
  ADD COLUMN "reversalIdempotencyKey" VARCHAR(128),
  ADD COLUMN "reversalJournalEntryId" UUID,
  ADD COLUMN "reversalRequestHash" CHAR(64);

CREATE UNIQUE INDEX "OpeningBalanceBatch_companyId_postingIdempotencyKey_key"
  ON "OpeningBalanceBatch" ("companyId", "postingIdempotencyKey");

CREATE UNIQUE INDEX "OpeningBalanceBatch_companyId_reversalIdempotencyKey_key"
  ON "OpeningBalanceBatch" ("companyId", "reversalIdempotencyKey");

CREATE UNIQUE INDEX "OpeningBalanceBatch_companyId_reversalJournalEntryId_key"
  ON "OpeningBalanceBatch" ("companyId", "reversalJournalEntryId");

CREATE UNIQUE INDEX "OpeningBalanceBatch_reversalJournalEntryId_companyId_key"
  ON "OpeningBalanceBatch" ("reversalJournalEntryId", "companyId");

ALTER TABLE "OpeningBalanceBatch"
  ADD CONSTRAINT "OpeningBalanceBatch_reversalJournalEntryId_companyId_fkey"
  FOREIGN KEY ("reversalJournalEntryId", "companyId")
  REFERENCES "JournalEntry" ("id", "companyId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION dafter_validate_posted_counterparties()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  line_record record;
BEGIN
  IF NEW."status" = 'POSTED'
     AND (TG_OP = 'INSERT' OR OLD."status" IS DISTINCT FROM 'POSTED') THEN
    FOR line_record IN
      SELECT
        jl."businessPartnerId" AS partner_id,
        aa."accountType"::text AS account_type
      FROM "JournalLine" jl
      JOIN "AccountingAccount" aa
        ON aa."id" = jl."accountId"
       AND aa."companyId" = jl."companyId"
      WHERE jl."journalEntryId" = NEW."id"
        AND jl."companyId" = NEW."companyId"
    LOOP
      IF line_record.partner_id IS NOT NULL THEN
        PERFORM 1
        FROM "BusinessPartner"
        WHERE "id" = line_record.partner_id
          AND "companyId" = NEW."companyId"
          AND "isActive" = true
        FOR KEY SHARE;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Posted journal line requires an active same-company BusinessPartner';
        END IF;
      END IF;

      IF line_record.account_type = 'ASSET_RECEIVABLE' THEN
        IF line_record.partner_id IS NULL THEN
          RAISE EXCEPTION 'Posted receivable journal lines require a BusinessPartner';
        END IF;
        PERFORM 1
        FROM "CustomerProfile"
        WHERE "businessPartnerId" = line_record.partner_id
          AND "companyId" = NEW."companyId"
          AND "isActive" = true
        FOR KEY SHARE;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Posted receivable journal lines require an active CustomerProfile';
        END IF;
      ELSIF line_record.account_type = 'LIABILITY_PAYABLE' THEN
        IF line_record.partner_id IS NULL THEN
          RAISE EXCEPTION 'Posted payable journal lines require a BusinessPartner';
        END IF;
        PERFORM 1
        FROM "SupplierProfile"
        WHERE "businessPartnerId" = line_record.partner_id
          AND "companyId" = NEW."companyId"
          AND "isActive" = true
        FOR KEY SHARE;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Posted payable journal lines require an active SupplierProfile';
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_validate_posted_counterparties
  BEFORE INSERT OR UPDATE OF "status" ON "JournalEntry"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_validate_posted_counterparties();

CREATE OR REPLACE FUNCTION dafter_protect_business_partner_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND OLD."isActive" = true AND NEW."isActive" = false) THEN
    IF EXISTS (
      SELECT 1
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
      WHERE jl."businessPartnerId" = OLD."id"
        AND jl."companyId" = OLD."companyId"
        AND je."status" IN ('POSTED', 'REVERSED')
    ) THEN
      RAISE EXCEPTION 'BusinessPartner with posted accounting history cannot be deactivated or deleted';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_business_partner_roles
  BEFORE DELETE OR UPDATE OF "isActive" ON "BusinessPartner"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_business_partner_roles();

CREATE OR REPLACE FUNCTION dafter_protect_customer_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND OLD."isActive" = true AND NEW."isActive" = false) THEN
    IF EXISTS (
      SELECT 1
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
      JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
      WHERE jl."businessPartnerId" = OLD."businessPartnerId"
        AND jl."companyId" = OLD."companyId"
        AND aa."accountType" = 'ASSET_RECEIVABLE'
        AND je."status" IN ('POSTED', 'REVERSED')
    ) THEN
      RAISE EXCEPTION 'CustomerProfile with posted receivable history cannot be deactivated or deleted';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_customer_profile_role
  BEFORE DELETE OR UPDATE OF "isActive" ON "CustomerProfile"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_customer_profile_role();

CREATE OR REPLACE FUNCTION dafter_protect_supplier_profile_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND OLD."isActive" = true AND NEW."isActive" = false) THEN
    IF EXISTS (
      SELECT 1
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je."id" = jl."journalEntryId" AND je."companyId" = jl."companyId"
      JOIN "AccountingAccount" aa ON aa."id" = jl."accountId" AND aa."companyId" = jl."companyId"
      WHERE jl."businessPartnerId" = OLD."businessPartnerId"
        AND jl."companyId" = OLD."companyId"
        AND aa."accountType" = 'LIABILITY_PAYABLE'
        AND je."status" IN ('POSTED', 'REVERSED')
    ) THEN
      RAISE EXCEPTION 'SupplierProfile with posted payable history cannot be deactivated or deleted';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_supplier_profile_role
  BEFORE DELETE OR UPDATE OF "isActive" ON "SupplierProfile"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_supplier_profile_role();

CREATE OR REPLACE FUNCTION dafter_protect_opening_balance_batch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('POSTED', 'REVERSED') THEN
      RAISE EXCEPTION 'Posted or reversed opening balance batches cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'REVERSED' THEN
    RAISE EXCEPTION 'Reversed opening balance batches are immutable';
  END IF;

  IF OLD."status" = 'DRAFT' AND NEW."status" NOT IN ('DRAFT', 'VALIDATED') THEN
    RAISE EXCEPTION 'Opening balance batches must be validated before posting';
  ELSIF OLD."status" = 'VALIDATED' AND NEW."status" NOT IN ('VALIDATED', 'POSTED') THEN
    RAISE EXCEPTION 'Validated opening balance batches can only be posted';
  ELSIF OLD."status" = 'POSTED' AND NEW."status" <> 'REVERSED' THEN
    RAISE EXCEPTION 'Posted opening balance batches can only be reversed';
  END IF;

  IF OLD."status" IN ('POSTED', 'REVERSED') AND (
    NEW."companyId" IS DISTINCT FROM OLD."companyId" OR
    NEW."effectiveDate" IS DISTINCT FROM OLD."effectiveDate" OR
    NEW."accountingPeriodId" IS DISTINCT FROM OLD."accountingPeriodId" OR
    NEW."description" IS DISTINCT FROM OLD."description" OR
    NEW."createdById" IS DISTINCT FROM OLD."createdById" OR
    NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
    NEW."requestHash" IS DISTINCT FROM OLD."requestHash" OR
    NEW."journalEntryId" IS DISTINCT FROM OLD."journalEntryId" OR
    NEW."postedById" IS DISTINCT FROM OLD."postedById" OR
    NEW."postedAt" IS DISTINCT FROM OLD."postedAt" OR
    NEW."postingIdempotencyKey" IS DISTINCT FROM OLD."postingIdempotencyKey" OR
    NEW."postingRequestHash" IS DISTINCT FROM OLD."postingRequestHash"
  ) THEN
    RAISE EXCEPTION 'Opening balance financial identity is immutable after posting';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_opening_balance_batch
  BEFORE INSERT OR UPDATE OR DELETE ON "OpeningBalanceBatch"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_opening_balance_batch();

CREATE OR REPLACE FUNCTION dafter_protect_opening_balance_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  batch_status text;
  batch_id uuid;
  company_id uuid;
BEGIN
  batch_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."batchId" ELSE NEW."batchId" END;
  company_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."companyId" ELSE NEW."companyId" END;
  SELECT "status"::text INTO batch_status
  FROM "OpeningBalanceBatch"
  WHERE "id" = batch_id AND "companyId" = company_id;
  IF batch_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Opening balance lines are immutable after draft status';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_opening_balance_lines
  BEFORE INSERT OR UPDATE OR DELETE ON "OpeningBalanceLine"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_opening_balance_lines();

CREATE OR REPLACE FUNCTION dafter_protect_used_accounting_template()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AccountingSetup"
    WHERE "templateCode" = OLD."code"
      AND "templateVersion" = OLD."version"
  ) THEN
    RAISE EXCEPTION 'Accounting template versions used by a company are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_used_accounting_template
  BEFORE UPDATE OR DELETE ON "AccountingTemplate"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_used_accounting_template();

CREATE OR REPLACE FUNCTION dafter_protect_used_accounting_template_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "AccountingSetup" s
    JOIN "AccountingTemplate" t
      ON t."code" = s."templateCode"
     AND t."version" = s."templateVersion"
    WHERE t."id" = OLD."templateId"
  ) THEN
    RAISE EXCEPTION 'Accounting template accounts used by a company are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dafter_protect_used_accounting_template_account
  BEFORE UPDATE OR DELETE ON "AccountingTemplateAccount"
  FOR EACH ROW
  EXECUTE FUNCTION dafter_protect_used_accounting_template_account();
