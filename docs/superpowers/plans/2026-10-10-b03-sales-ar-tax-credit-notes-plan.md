# B03 Sales AR Tax and Credit Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the authoritative Sales Invoice, AR, tax, and Credit Note backend flow on top of the verified B02 accounting foundation, without changing frontend/mobile or merging to master.

**Architecture:** Add a focused `sales` backend module with new company-scoped SalesInvoice/CreditNote aggregates, Decimal-only pricing/tax policies, and one transaction boundary around document posting plus B02 GL posting. Retire the legacy Sales financial write paths from authoritative registration while keeping deferred/installment code isolated until its own redesign.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, Jest 30, `Prisma.Decimal`, existing B02 AccountingService, Tax Setup, BusinessPartner, PaymentTerm, audit, idempotency, and feature-policy infrastructure.

**Spec:** `docs/superpowers/specs/2026-10-10-b03-sales-ar-tax-credit-notes-design.md`

## Global Constraints

- `SalesInvoice` and `SalesCreditNote` are the only authoritative new Sales financial documents.
- The new lifecycle is exactly `DRAFT -> POSTED`; posted documents and child rows are immutable.
- New Sales code uses `BusinessPartner` plus active `CustomerProfile`, never legacy `Customer` as customer identity.
- New Sales posting uses `AccountingService.postInternalInTransaction()` and creates zero `LedgerEntry` rows and zero `Balance.balance` mutations.
- Client-supplied totals, tax amounts, GL accounts, journal/source type, and payment schedule amounts are not authoritative.
- All authoritative monetary calculations use Decimal values; no `Number`, `parseFloat`, or floating arithmetic in the Sales path.
- Invoice and Credit Note numbering is tenant/period/document-type scoped, transactional, concurrency-safe, and independent from JournalEntry numbering.
- B03 does not implement frontend, mobile, Purchases/AP, inventory/COGS, Customer Payments, reconciliation, official reports, external FX, or e-invoicing.
- Preserve all existing B01/B02 tests and invariants.

## Review Focus

- A tenant mismatch or supplier-only/ inactive customer must never cross the Sales boundary; partner integration tests pin all combinations.
- A transaction failure after JournalEntry creation must leave no posted document, final number, JournalEntry, or child snapshot; the atomic rollback test pins this.
- A concurrent POST or Credit Note race must produce one posting/number and never exceed remaining creditable quantity/value; concurrency tests pin this.
- Inclusive tax and foreign-currency split maturities must balance after currency rounding without a client-supplied plug; Decimal boundary tests pin this.
- Legacy module registration or hidden code paths must not create a second authoritative Sales system; structural and integration tests pin zero legacy writes and cutover status.

---

### Task 1: Sales schema, numbering, and database invariants

**Files:**
- Modify: `daftar-api-v1/prisma/schema.prisma`
- Create: `daftar-api-v1/prisma/migrations/20261010100000_b03_sales_ar_tax_credit_notes/migration.sql`
- Create: `daftar-api-v1/src/modules/sales/sales-schema.integration.spec.ts`
- Modify: `daftar-api-v1/prisma/schema.prisma` header comments and `daftar-api-v1/src/app.module.ts` only when the new Prisma relations require registration changes

**Interfaces:**
- Consumes: B02 `BusinessPartner`, `CustomerProfile`, `PaymentTerm`, `AccountingAccount`, `AccountingJournal`, `JournalEntry`, `JournalLine`, `User`, and existing idempotency/audit relations.
- Produces: Prisma models/enums for `SalesInvoice`, `SalesInvoiceLine`, `SalesInvoiceLineTax`, `SalesInvoicePaymentSchedule`, `SalesDocumentSequence`, `SalesCreditNote`, `SalesCreditNoteLine`, `SalesCreditNoteLineTax`; composite company-safe keys; posted-state protection primitives consumed by Tasks 3–6.

- [ ] **Step 1: Write the failing PostgreSQL integration test**

Add tests proving the new tables can represent draft/post state, company-safe partner/account relations, unique document sequence keys, unique line/schedule sequences, one journal link per posted document, and that posted parent/child mutation is rejected by database enforcement.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --runInBand src/modules/sales/sales-schema.integration.spec.ts`

Expected: FAIL because the new Prisma models and migration do not exist.

- [ ] **Step 3: Implement the Prisma schema and migration**

Use Decimal columns with explicit precision, nullable final numbers for drafts, immutable snapshot fields, idempotency/request-hash fields, document-type enum values for invoice/credit note, company-scoped unique constraints, and PostgreSQL trigger/check protection for posted rows and children. Update the schema architecture comments to describe Business Documents → Posting Engine → General Ledger → Reconciliation/Subledger → Reports.

- [ ] **Step 4: Run Prisma generation, validation, and the focused integration test**

Run: `npm run prisma -- generate; npm run prisma -- validate; npm test -- --runInBand src/modules/sales/sales-schema.integration.spec.ts`

Expected: Prisma generation/validation succeed and all focused schema tests pass against PostgreSQL.

- [ ] **Step 5: Commit**

```bash
git add daftar-api-v1/prisma/schema.prisma daftar-api-v1/prisma/migrations/20261010100000_b03_sales_ar_tax_credit_notes/migration.sql daftar-api-v1/src/modules/sales/sales-schema.integration.spec.ts
git commit -m "feat: add authoritative sales document schema"
```

### Task 2: Decimal pricing and executable tax engine

**Files:**
- Create: `daftar-api-v1/src/modules/sales/sales-pricing.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-tax-calculator.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-pricing.service.spec.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-tax-calculator.service.spec.ts`
- Modify: `daftar-api-v1/src/modules/tax-setup/services/tax-setup-policy.service.ts` only where a reusable company-safe read is missing

**Interfaces:**
- Consumes: validated intent DTOs, `Prisma.Decimal`, currency precision, `TaxModuleKey.SALES`, TaxTreatment/TaxRate/TaxDefaultPolicy/TaxModuleApplicabilityRule, and permission context for overrides.
- Produces: `calculateLine(input: SalesPricingInput): SalesPricingResult` and `calculateTax(input: SalesTaxInput): SalesTaxResult`, each returning Decimal totals plus immutable snapshot fields used by draft recalculation and posting.

- [ ] **Step 1: Write failing unit tests**

Cover fixed/percentage/no discount, Decimal quantity and price, tax-exclusive 100 at 14% → base 100/tax 14/gross 114, tax-inclusive gross 114 at 14% → net 100/tax 14/gross 114, zero-rated/exempt/out-of-scope zero tax with distinct categories, currency rounding boundaries, expired/not-effective/inactive rates, and unauthorized override rejection.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- --runInBand src/modules/sales/sales-pricing.service.spec.ts src/modules/sales/sales-tax-calculator.service.spec.ts`

Expected: FAIL because the services do not exist.

- [ ] **Step 3: Implement the minimum Decimal-only services**

Resolve tax in the locked precedence order, reject invalid lifecycle/effective windows, preserve zero-tax treatment identity, round only at the configured currency precision, and never convert a financial value to JavaScript Number.

- [ ] **Step 4: Run focused tests and the existing tax-setup tests**

Run: `npm test -- --runInBand src/modules/sales/sales-pricing.service.spec.ts src/modules/sales/sales-tax-calculator.service.spec.ts src/modules/tax-setup`

Expected: all new and existing tax tests pass.

- [ ] **Step 5: Commit**

```bash
git add daftar-api-v1/src/modules/sales daftar-api-v1/src/modules/tax-setup/services/tax-setup-policy.service.ts
git commit -m "feat: add decimal sales pricing and tax calculation"
```

### Task 3: SalesInvoice drafts, BusinessPartner cutover, and query API

**Files:**
- Create: `daftar-api-v1/src/modules/sales/sales.module.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-invoice.controller.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-invoice.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-invoice.repository.ts`
- Create: `daftar-api-v1/src/modules/sales/dto/*.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-invoice.integration.spec.ts`
- Modify: `daftar-api-v1/src/app.module.ts`, feature policy/capability manifests, audit action constants

**Interfaces:**
- Consumes: Task 1 models, Task 2 `calculateLine`/`calculateTax`, BusinessPartner/CustomerProfile policies, and existing tenant/auth/audit conventions.
- Produces: draft use cases and controller endpoints for create/retrieve/list/search/update/delete-or-archive; drafts recalculate all totals server-side and have no JournalEntry.

- [ ] **Step 1: Write failing integration tests**

Test customer partner success, BOTH-role success, supplier-only/inactive/cross-company rejection, draft create/update/delete policy, backend recomputation despite forged totals, line snapshot creation, useful filters, and zero GL rows for every draft.

- [ ] **Step 2: Run focused integration tests to verify RED**

Run: `npm test -- --runInBand src/modules/sales/sales-invoice.integration.spec.ts`

Expected: FAIL because the authoritative Sales module is not registered.

- [ ] **Step 3: Implement draft aggregate and API**

Resolve BusinessPartner with an active CustomerProfile in the same company, select permitted currency/payment-term intent, compute lines/totals through Task 2, store no final number while DRAFT, and audit creation and meaningful changes. Never import or query legacy Customer.

- [ ] **Step 4: Run focused integration tests and TypeScript**

Run: `npm test -- --runInBand src/modules/sales/sales-invoice.integration.spec.ts; npx tsc --noEmit`

Expected: focused tests and TypeScript pass.

- [ ] **Step 5: Commit**

```bash
git add daftar-api-v1/src/modules/sales daftar-api-v1/src/app.module.ts daftar-api-v1/src/common
git commit -m "feat: add authoritative sales invoice drafts"
```

### Task 4: Invoice posting, payment schedules, AR/GL, currency, and credit limit

**Files:**
- Create: `daftar-api-v1/src/modules/sales/sales-payment-schedule.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-posting.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-account-resolution.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-posting.integration.spec.ts`
- Modify: `daftar-api-v1/src/modules/accounting/accounting.service.ts` only for a narrow source-policy extension if required; otherwise consume the existing boundary unchanged

**Interfaces:**
- Consumes: Task 2 calculation results, Task 3 draft repository, B02 `AccountingReadinessService`, `AccountingService.postInternalInTransaction(tx, companyId, actorUserId, command)`, PaymentTerm calculator, typed default account/journal mappings, and JournalLine Decimal/base-currency behavior.
- Produces: `postInvoice(companyId: string, actorUserId: string, invoiceId: string, request: PostSalesInvoiceRequest): Promise<SalesInvoicePostedResult>` with source type `SALES_INVOICE`, source ID equal to invoice ID, immutable number/snapshots/schedule, and one authoritative JournalEntry.

- [ ] **Step 1: Write failing integration tests**

Cover immediate and split payment terms with exact schedule sums and due dates; default/CustomerProfile AR account; INCOME, TAX_PAYABLE, and SALES journal resolution; AR lines with BusinessPartner/dueDate; base currency and 100 USD × 50 = 5,000 EGP; multiple lines/tax/split maturities balanced in base currency; credit-limit exposure and permission/reason override; posted snapshots; duplicate idempotency and concurrent POST.

- [ ] **Step 2: Write and run the atomic-failure test before implementation**

Add a failure injection after the accounting service call but before invoice completion. Run it and expect failure with no JournalEntry, no final number, and no POSTED invoice.

- [ ] **Step 3: Implement the atomic posting orchestration**

Lock the draft, validate readiness and all company/partner/currency/period rules, calculate values, build exact payment schedules, resolve accounts/journal, calculate company-base exposure, allocate the sequence row under lock, persist snapshots, call B02 posting in the same transaction, link the entry, mark POSTED, and write audit. Use idempotency/request hashes and PostgreSQL uniqueness for retries/concurrency.

- [ ] **Step 4: Run the focused posting suite and B02 accounting integration suite**

Run: `npm test -- --runInBand src/modules/sales/sales-posting.integration.spec.ts src/modules/accounting/accounting.integration.spec.ts src/modules/payment-terms`

Expected: all posting, currency, credit-limit, idempotency, concurrency, and B02 regressions pass.

- [ ] **Step 5: Commit**

```bash
git add daftar-api-v1/src/modules/sales daftar-api-v1/src/modules/accounting
git commit -m "feat: post sales invoices through the B02 accounting engine"
```

### Task 5: Sales Credit Notes and over-credit protection

**Files:**
- Create: `daftar-api-v1/src/modules/sales/sales-credit-note.controller.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-credit-note.service.ts`
- Create: `daftar-api-v1/src/modules/sales/sales-credit-note.integration.spec.ts`
- Modify: `daftar-api-v1/src/modules/sales/dto/*.ts` and sales module registration

**Interfaces:**
- Consumes: Task 1 credit-note models/sequence, Task 2 tax snapshot shape, Task 4 posted invoice/JournalEntry traceability, B02 AccountingService, and audit/idempotency infrastructure.
- Produces: draft/retrieve/list/update/post Credit Note endpoints and `postCreditNote(...)` using `JournalSourceType.SALES_CREDIT_NOTE`, original-line financial basis, and immutable posted rows.

- [ ] **Step 1: Write failing integration tests**

Cover full credit, partial quantity credit, supplier-only rejection, over-credit rejection, two concurrent partial credits, original tax/price/exchange-rate snapshots, Revenue debit/Tax Payable debit/AR credit with BusinessPartner, original invoice remains POSTED, derived partial/full credit status, idempotency, atomic rollback, numbering concurrency, and posted immutability.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `npm test -- --runInBand src/modules/sales/sales-credit-note.integration.spec.ts`

Expected: FAIL because Credit Note endpoints and posting path do not exist.

- [ ] **Step 3: Implement Credit Note drafts and atomic posting**

Lock the source invoice lines and existing posted credits, compute remaining quantity/value from Decimal original basis, reject unrelated lines and over-credit, allocate a separate credit-note sequence, copy tax snapshots, post the reversing business entry through AccountingService, and leave the original immutable.

- [ ] **Step 4: Run focused tests and the complete Sales integration set**

Run: `npm test -- --runInBand src/modules/sales`

Expected: all invoice and credit-note tests pass.

- [ ] **Step 5: Commit**

```bash
git add daftar-api-v1/src/modules/sales
git commit -m "feat: add immutable sales credit notes"
```

### Task 6: Legacy Sales cutover, authorization, audit, and documentation

**Files:**
- Modify: `daftar-api-v1/src/app.module.ts`, `daftar-api-v1/src/modules/invoices/invoices.module.ts`, legacy invoice/payment controllers as needed for authoritative cutover
- Modify: `daftar-api-v1/src/common/types/auth.types.ts`, feature-policy/capability manifests, audit definitions
- Create: `docs/03_SALES_AR_TAX_AND_CREDIT_NOTES.md`
- Modify: `docs/01_ACCOUNTING_CONSTITUTION.md` only for permanent cross-module rules
- Create: `daftar-api-v1/src/modules/sales/sales-legacy-boundary.spec.ts`

**Interfaces:**
- Consumes: Tasks 3–5 authoritative API and models.
- Produces: exactly one active Sales Invoice system, explicit Sales permissions, required audit events, documented deferred/installment isolation, and structural proof that new Sales code has no Customer/LedgerEntry/Balance dependency.

- [ ] **Step 1: Write failing structural/cutover tests**

Assert the new module does not import/query legacy Customer, no new Sales POST path calls LedgerEntry or Balance, obsolete invoice approval/payment write controllers are not registered as authoritative Sales routes, required capabilities exist, and the docs include the locked boundaries.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- --runInBand src/modules/sales/sales-legacy-boundary.spec.ts`

Expected: FAIL until legacy registration, capability, audit, and documentation changes are complete.

- [ ] **Step 3: Implement cutover and documentation**

Remove or isolate obsolete Sales financial write registration without deleting unrelated deferred/installment code, add view/manage/post/override capabilities, wire audit events with company/actor/document/reason metadata, and document APIs, constraints, posting examples, future reconciliation boundary, and test strategy.

- [ ] **Step 4: Run structural tests, lint, and TypeScript**

Run: `npm test -- --runInBand src/modules/sales/sales-legacy-boundary.spec.ts; npm run lint; npx tsc --noEmit`

Expected: all commands pass with frontend/mobile untouched.

- [ ] **Step 5: Commit**

```bash
git add daftar-api-v1/src/app.module.ts daftar-api-v1/src/modules/invoices daftar-api-v1/src/common docs/03_SALES_AR_TAX_AND_CREDIT_NOTES.md docs/01_ACCOUNTING_CONSTITUTION.md
git commit -m "feat: cut over sales accounting to authoritative documents"
```

### Task 7: Full B03 verification and branch handoff

**Files:**
- Modify: `.github/workflows/backend-ci.yml` only if the existing gate lacks the required B03 checks; preserve the two documented partial-index exceptions.
- Modify: `docs/superpowers/plans/2026-10-10-b03-sales-ar-tax-credit-notes-plan.md` only for verified rulings/ledger references, never to hide gaps.

**Interfaces:**
- Consumes: all prior tasks and the approved spec.
- Produces: green local and GitHub validation evidence, clean branch, final architecture-gate answers, and no merge to master.

- [ ] **Step 1: Run fresh database migration/reference-data verification**

Run the same fresh PostgreSQL sequence as CI: `npm ci`, Prisma generate, Prisma validate, deploy migrations from zero, production-safe reference-data install, deterministic seed, replay verification, and Prisma migration diff. Expected: only the two documented B02 partial-index representation exceptions remain.

- [ ] **Step 2: Run complete tests and build**

Run: `npm test -- --runInBand; npm run lint; npx tsc --noEmit; npm run build`

Expected: zero failures, all B01/B02 and B03 unit/integration tests green, and production build succeeds.

- [ ] **Step 3: Run the GitHub Actions gate on the B03 branch**

Push only `codex/b03-sales-ar-tax-credit-notes`, wait for Backend CI, and verify every required step and the complete test count. Do not push or merge master.

- [ ] **Step 4: Verify scope and clean handoff**

Confirm `git status` clean, local branch equals `origin/codex/b03-sales-ar-tax-credit-notes`, no changed frontend/mobile files, no Purchases/AP or Customer Payments implementation, and all 20 architecture-gate answers are explicitly supported by tests/code.

- [ ] **Step 5: Commit any final documentation-only verification record if needed**

Only commit a real, reviewed change. Do not create a no-op commit. Leave the branch pushed and stop for senior review before merge.

