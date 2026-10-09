# B02.1 Pre-Merge Accounting Integrity Hardening

> Execute this plan in `C:\Users\IT\.codex\worktrees\b02-accounting-foundation\daftar-v1` on `codex/b02-accounting-foundation`. Do not merge to `master` or begin B03.

## Goal

Harden the approved B02 foundation without adding source-document flows. Preserve real multi-currency posting, enforce AR/AP counterparties in both NestJS and PostgreSQL, compose opening-balance state and GL events in one transaction, make bootstrap/readiness/reference data production-safe, and add concurrency/immutability regression coverage.

## Work units

1. **Shared accounting policies and schema migration**
   - Add one reusable counterparty-role policy used by normal posting and opening balances.
   - Add template/account/journal currency semantics, company/base-currency consistency, profile override semantics, and readiness provenance fields as needed.
   - Add partial unique indexes for default addresses and primary contacts.
   - Add PostgreSQL posting-validation, role-removal, and opening-balance immutability triggers.
   - Keep migrations additive and validate migration diff.

2. **Accounting bootstrap and reference data**
   - Instantiate normal accounts with `NULL` currency constraints.
   - Leave GENERAL/SALES/PURCHASE unconstrained; document CASH as base-currency constrained.
   - Align company currency with the selected accounting base currency during first bootstrap.
   - Extract shared mapping compatibility validation and use it for bootstrap and configuration updates.
   - Add a non-destructive production reference-data command and migration-safe immutability for used template versions.

3. **Posting and BusinessPartner integrity**
   - Require active customer/supplier partners on receivable/payable lines.
   - Lock partner/profile rows during role removal and use database validation to close posting races.
   - Validate customer receivable and supplier payable overrides by same-company account type.
   - Add USD-after-bootstrap and concurrent role-removal/posting integration tests.

4. **Transaction-aware opening balances**
   - Expose a trusted transaction-aware posting/reversal boundary from `AccountingService`.
   - Make opening-balance post and reverse compose batch status, journal entry/lines, sequence, journal link, reversal state, and audit in one transaction.
   - Add durable post/reversal idempotency metadata and replay/concurrency tests.
   - Require OPEN periods and canonical money precision at draft/validation time.

5. **Readiness, rollback, and boundary documentation**
   - Make readiness check actual mappings, active/compatible accounts and journals, base currency policy, provenance, fiscal year, and OPEN period with precise reasons.
   - Fix fresh-company bootstrap rollback coverage, including post-creation failure injection.
   - Update the constitution/B02 contract only where B02.1 changes the permanent policy.

6. **Verification and delivery**
   - Run focused PostgreSQL integration tests after each work unit, then the full backend gate on a fresh database.
   - Run lint, type-check, Prisma validate, migrations, production reference-data initialization, migration diff, tests, and build.
   - Push only `codex/b02-accounting-foundation`, verify GitHub Backend CI success, and stop.

## Required evidence

- Every new invariant has a failing test before its implementation and a passing PostgreSQL-backed test after it.
- Full suite counts, migration names, production reference-data result, build result, and GitHub Actions run ID are recorded in the final report.
