# B02 Business Partner and Accounting Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend-only B02 foundation that makes BusinessPartner authoritative, supports customer/supplier roles and payment terms, bootstraps a versioned Egyptian SME chart of accounts, and posts controlled opening balances through the General Ledger.

**Architecture:** Add a company-scoped BusinessPartner aggregate with one-to-one CustomerProfile/SupplierProfile extensions and tenant-safe composite foreign keys. Replace authoritative JournalLine party polymorphism with nullable BusinessPartner FK, add Decimal payment-term schedules, versioned global accounting templates, an idempotent company bootstrap/readiness service, and immutable opening-balance batches. Legacy Customer/Supplier/Balance/LedgerEntry remain isolated only where unreplaced modules require them.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, TypeScript, `Prisma.Decimal`, class-validator, Jest, existing PlatformIdempotencyService, existing AuditLog and PermissionsGuard infrastructure.

**Spec:** `docs/superpowers/specs/2026-10-09-b02-business-partner-accounting-bootstrap-design.md`

## Global Constraints

- Backend only; do not modify `daftar-dashboard` or `daftar-dashboard-mobile`.
- Do not implement Sales Invoice GL integration, Purchase Invoice posting, payment allocation, or official financial reports.
- BusinessPartner is the only new authoritative external-party identity; no Customer/Supplier synchronization or compatibility mirror.
- Never add monetary balance fields to BusinessPartner or role profiles; amounts are GL/open-item derived.
- Every new tenant-scoped relation must use company-aware relational integrity where Prisma/PostgreSQL supports it.
- Every money calculation uses `Prisma.Decimal`; no JavaScript floating arithmetic.
- Account purpose is selected by semantic system key, never by account code.
- Every write use case emits company/actor-aware audit metadata and uses existing permission/idempotency conventions.
- Every schema change has a reviewed SQL migration; fresh deploy and `migrate diff` must pass.
- B02 completion requires GitHub Actions conclusion `success`; stop before B03.

## Review Focus

- A duplicate/cross-company role, address, contact, payment term, or account mapping must be rejected by database constraints, not only DTO validation — covered by Tasks 1–3 integration tests.
- A 1/3 + 1/3 + 1/3 term on a currency with two decimals must sum exactly to the source amount after remainder allocation — covered by Task 3 calculator tests.
- Concurrent bootstrap requests for one company must not create duplicate accounts, journals, periods, or mappings — covered by Task 4 PostgreSQL test.
- A full trial-balance opening import must not receive a second artificial equity line, while partner-only onboarding still balances through opening equity — covered by Task 5 tests.
- A legacy Customer/Supplier change must not affect B02 partner/GL behavior, and no B02 module may import those models — covered by Task 6 boundary test and review scan.

---

### Task 1: B02 Prisma domain and tenant-safe migration

**Files:**
- Modify: `daftar-api-v1/prisma/schema.prisma`
- Create: `daftar-api-v1/prisma/migrations/<timestamp>_b02_business_partner_accounting_foundation/migration.sql`
- Modify: `daftar-api-v1/prisma/seed.ts` and seed helpers as required for template/payment-term reference data
- Test: `daftar-api-v1/src/modules/business-partners/business-partners.integration.spec.ts` (schema/constraint smoke cases)
- Test: `daftar-api-v1/src/modules/accounting/b02-schema.integration.spec.ts`

**Interfaces:**
- Consumes: existing `Company`, `Currency`, `AccountingAccount`, `JournalLine`, `AccountingConfiguration`, `IdempotencyRecord`, `AuditLog` models.
- Produces: Prisma models/enums for `BusinessPartner`, `CustomerProfile`, `SupplierProfile`, `BusinessPartnerAddress`, `BusinessPartnerContact`, `PaymentTerm`, `PaymentTermLine`, `AccountingTemplate`, `AccountingTemplateAccount`, `AccountingSetup`, `OpeningBalanceBatch`, `OpeningBalanceLine`; `JournalLine.businessPartnerId`; and generated seed template `EG_STANDARD_V1`.

- [ ] **Step 1: Write failing PostgreSQL integration tests** for one partner with both profiles, duplicate profile rejection, cross-company profile/address/contact rejection, absence of BusinessPartner balance fields, and JournalLine relation metadata.
- [ ] **Step 2: Run the focused integration tests** against a fresh migrated PostgreSQL database.
  Expected: FAIL because the B02 models and `businessPartnerId` do not exist.
- [ ] **Step 3: Extend `schema.prisma`** with the exact company-aware models and checks from the spec. Use profile primary key `businessPartnerId` unless Prisma requires a documented surrogate; add composite uniques/foreign keys for every tenant-sensitive relation. Remove authoritative JournalLine `partyType`/`partyId`, retain legacy party fields only on legacy models, and add template provenance fields to company accounts/configuration as needed.
- [ ] **Step 4: Create and inspect the SQL migration**. The migration must add checks for primitive Decimal/percentage/date ranges, unique role/profile/address constraints, composite FKs, and a safe breaking replacement of JournalLine polymorphic fields. It must not copy legacy opening balances into B02.
- [ ] **Step 5: Add deterministic seed data** for `EG_STANDARD_V1`, semantic account mappings, and baseline terms (Immediate, Net 7, Net 15, Net 30, Net 60) without tenant-owned records.
- [ ] **Step 6: Run focused schema tests, `npx prisma validate`, and `npx prisma migrate diff`**.
  Expected: all focused tests pass; Prisma validates; migration diff reports `No difference detected`.
- [ ] **Step 7: Commit**
  ```bash
  git add daftar-api-v1/prisma daftar-api-v1/src/modules/business-partners/business-partners.integration.spec.ts daftar-api-v1/src/modules/accounting/b02-schema.integration.spec.ts
  git commit -m "feat: add B02 business partner accounting schema"
  ```

### Task 2: BusinessPartner aggregate, role APIs, permissions, and audit

**Files:**
- Create: `daftar-api-v1/src/modules/business-partners/business-partners.module.ts`
- Create: `daftar-api-v1/src/modules/business-partners/business-partners.controller.ts`
- Create: `daftar-api-v1/src/modules/business-partners/business-partners.service.ts`
- Create: `daftar-api-v1/src/modules/business-partners/business-partners.repository.ts`
- Create: `daftar-api-v1/src/modules/business-partners/dto/*`
- Create: `daftar-api-v1/src/modules/business-partners/use-cases/*`
- Modify: `daftar-api-v1/src/common/types/auth.types.ts`, `feature-policy.manifest.ts`, `app.module.ts`
- Test: `daftar-api-v1/src/modules/business-partners/business-partners.service.spec.ts`
- Test: `daftar-api-v1/src/modules/business-partners/business-partners.integration.spec.ts`

**Interfaces:**
- Consumes: Task 1 Prisma models; existing CurrentTenant/CurrentUser decorators, PermissionsGuard, AuditLog transaction helper patterns.
- Produces: `BusinessPartnersService` methods for list/search, get, create/update, activate/deactivate, add/remove CustomerProfile/SupplierProfile, address/contact CRUD, preferred currency, payment-term assignment, and credit-limit update. Search accepts partner code/display/legal name/phone/tax registration.

- [ ] **Step 1: Write failing unit/integration tests** for create, search, update, role lifecycle, BOTH role, duplicate role, cross-company address, active preferred currency, audit payload, and permission enforcement.
- [ ] **Step 2: Run focused tests**.
  Expected: FAIL because the module/service/controller do not exist.
- [ ] **Step 3: Implement the aggregate service/repository** with transaction-scoped company checks, Decimal credit limit parsing, optimistic version checks, active currency/term checks, no legacy imports, and safe role-removal policy hook.
- [ ] **Step 4: Add DTOs/controllers and permissions** using `viewPartners`/`managePartners`; register the module and explicit feature-policy entry.
- [ ] **Step 5: Run focused tests**.
  Expected: all BusinessPartner unit/integration tests pass, including one identity with both roles and all cross-tenant rejection cases.
- [ ] **Step 6: Commit**
  ```bash
  git add daftar-api-v1/src/modules/business-partners daftar-api-v1/src/common/types/auth.types.ts daftar-api-v1/src/common/entitlements/feature-policy.manifest.ts daftar-api-v1/src/app.module.ts
  git commit -m "feat: add BusinessPartner aggregate and role APIs"
  ```

### Task 3: Payment Terms model, calculator, and API

**Files:**
- Create: `daftar-api-v1/src/modules/payment-terms/payment-terms.module.ts`
- Create: `daftar-api-v1/src/modules/payment-terms/payment-terms.controller.ts`
- Create: `daftar-api-v1/src/modules/payment-terms/payment-terms.service.ts`
- Create: `daftar-api-v1/src/modules/payment-terms/payment-terms.calculator.ts`
- Create: `daftar-api-v1/src/modules/payment-terms/dto/*`
- Test: `daftar-api-v1/src/modules/payment-terms/payment-terms.calculator.spec.ts`
- Test: `daftar-api-v1/src/modules/payment-terms/payment-terms.integration.spec.ts`

**Interfaces:**
- Consumes: Task 1 `PaymentTerm`/`PaymentTermLine`, Currency precision, existing tenant/auth/audit/idempotency patterns.
- Produces: `PaymentTermsCalculator.calculate(amount: Prisma.Decimal|string, documentDate: Date, term: PaymentTermWithLines, minorUnitPrecision: number): PaymentScheduleLine[]` and CRUD/activation/assignment operations.

- [ ] **Step 1: Write failing calculator tests** for immediate, Net 30, 50/50 split, percentage plus BALANCE, thirds with remainder, invalid over-allocation, invalid ordering, zero/negative amounts, and month-end due dates.
- [ ] **Step 2: Run calculator tests**.
  Expected: FAIL because the calculator does not exist.
- [ ] **Step 3: Implement the Decimal calculator** using `Prisma.Decimal`, currency-scale half-up rounding, and final-line remainder allocation. Return immutable value objects with dueDate and amount.
- [ ] **Step 4: Write failing service/API integration tests** for tenant isolation, inactive term assignment rejection, primitive DB constraints, and payment-term audit events.
- [ ] **Step 5: Implement service/controller/DTOs** with schedule validation, role assignment integration, and permissions.
- [ ] **Step 6: Run all Task 3 tests**.
  Expected: calculator and PostgreSQL tests pass with exact schedule totals.
- [ ] **Step 7: Commit**
  ```bash
  git add daftar-api-v1/src/modules/payment-terms
  git commit -m "feat: add Decimal payment term schedules"
  ```

### Task 4: Accounting templates, bootstrap, periods, and readiness

**Files:**
- Create: `daftar-api-v1/src/modules/accounting-bootstrap/accounting-bootstrap.module.ts`
- Create: `daftar-api-v1/src/modules/accounting-bootstrap/accounting-bootstrap.controller.ts`
- Create: `daftar-api-v1/src/modules/accounting-bootstrap/accounting-bootstrap.service.ts`
- Create: `daftar-api-v1/src/modules/accounting-bootstrap/accounting-readiness.service.ts`
- Create: `daftar-api-v1/src/modules/accounting-bootstrap/template.service.ts`
- Create: `daftar-api-v1/src/modules/accounting-bootstrap/dto/*`
- Modify: `daftar-api-v1/src/modules/accounting/accounting.service.ts` only for shared validated helpers if necessary
- Test: `daftar-api-v1/src/modules/accounting-bootstrap/accounting-bootstrap.service.spec.ts`
- Test: `daftar-api-v1/src/modules/accounting-bootstrap/accounting-bootstrap.integration.spec.ts`
- Modify: `daftar-api-v1/src/app.module.ts`, feature policy, permission types

**Interfaces:**
- Consumes: Task 1 template/setup models, EG_STANDARD_V1 seed, Task 2 tenant/auth/audit conventions, Task 3 Currency and idempotency primitives.
- Produces: `InitializeCompanyAccounting.execute(input: InitializeCompanyAccountingInput): Promise<AccountingBootstrapResult>` and `AccountingReadinessService.evaluate(companyId, postingDate?): Promise<AccountingReadiness>`.

- [ ] **Step 1: Write failing tests** for template hierarchy/provenance, semantic mappings, required journals, July 1 2026–June 30 2027 period coverage, READY/BLOCKED predicates, repeated idempotent requests, concurrent requests, and rollback on injected failure.
- [ ] **Step 2: Run focused bootstrap tests**.
  Expected: FAIL because services and template instantiation do not exist.
- [ ] **Step 3: Implement template loader/validator** that resolves only active `(code, version)`, validates parent hierarchy and semantic keys, and copies immutable template metadata into company accounts.
- [ ] **Step 4: Implement period generator** that walks local calendar months from fiscal-year start to end, creates contiguous inclusive date ranges, rejects overlap, and supports non-January years.
- [ ] **Step 5: Implement atomic/idempotent bootstrap** with existing PlatformIdempotencyService, a company setup uniqueness guard, required account/journal mappings, audit, and readiness evaluation.
- [ ] **Step 6: Add controller/DTOs/permissions** using `viewAccountingSetup`/`manageAccountingSetup`, register the module, and keep bootstrap separate from Sales/Invoices.
- [ ] **Step 7: Run all Task 4 tests**.
  Expected: setup is READY only when all requirements are present; duplicate/concurrent setup creates one foundation and July–June has twelve periods.
- [ ] **Step 8: Commit**
  ```bash
  git add daftar-api-v1/src/modules/accounting-bootstrap daftar-api-v1/src/app.module.ts daftar-api-v1/src/common
  git commit -m "feat: bootstrap company accounting foundations"
  ```

### Task 5: GL BusinessPartner validation and controlled opening balances

**Files:**
- Modify: `daftar-api-v1/src/modules/accounting/dto/accounting.dto.ts`
- Modify: `daftar-api-v1/src/modules/accounting/accounting.service.ts`, `accounting.controller.ts`
- Create: `daftar-api-v1/src/modules/opening-balances/opening-balances.module.ts`
- Create: `daftar-api-v1/src/modules/opening-balances/opening-balances.controller.ts`
- Create: `daftar-api-v1/src/modules/opening-balances/opening-balances.service.ts`
- Create: `daftar-api-v1/src/modules/opening-balances/dto/*`
- Test: `daftar-api-v1/src/modules/accounting/accounting.business-partner.integration.spec.ts`
- Test: `daftar-api-v1/src/modules/opening-balances/opening-balances.integration.spec.ts`

**Interfaces:**
- Consumes: Task 1 JournalLine FK, Task 2 role profiles, Task 4 readiness/fiscal periods/default mappings, existing `AccountingService` posting/reversal/idempotency engine.
- Produces: posting input with nullable `businessPartnerId`, AR/AP role validation, and `OpeningBalanceService` operations `createDraft`, `validate`, `post`, `reverse`.

- [ ] **Step 1: Write failing integration tests** for AR customer-only success, AP supplier-only success, BOTH success for both account types, wrong-role rejection, inactive partner rejection, cross-company FK rejection, customer opening AR, supplier opening AP, balanced full trial-balance import without duplicate equity, closed-period rejection, duplicate idempotency, immutable posted batch, and reversal.
- [ ] **Step 2: Run focused tests**.
  Expected: FAIL because JournalLine still accepts party polymorphism and opening-balance services do not exist.
- [ ] **Step 3: Replace DTO/service line mapping** with `businessPartnerId` and add account-type-aware role validation inside the posting transaction. Validate partner company, active status, profile status, and account direct-posting constraints.
- [ ] **Step 4: Implement controlled OpeningBalanceService** with explicit source behavior, Decimal balancing, period/readiness checks, immutable state transitions, reversal, idempotency, and audit. Reject generic manual journal attempts to choose `OPENING_BALANCE`.
- [ ] **Step 5: Register module/routes and run focused tests**.
  Expected: every required AR/AP/opening-balance scenario passes and posted batches cannot be edited.
- [ ] **Step 6: Commit**
  ```bash
  git add daftar-api-v1/src/modules/accounting daftar-api-v1/src/modules/opening-balances daftar-api-v1/src/app.module.ts
  git commit -m "feat: enforce BusinessPartner GL counterparties and opening balances"
  ```

### Task 6: Legacy boundary, documentation, and architecture gate

**Files:**
- Modify: `daftar-api-v1/prisma/schema.prisma` obsolete legacy comments only
- Modify: `docs/01_ACCOUNTING_CONSTITUTION.md` permanent B02 accounting rules only
- Create: `docs/02_BUSINESS_PARTNER_AND_ACCOUNTING_BOOTSTRAP.md`
- Create/modify: legacy boundary tests and review scan under `daftar-api-v1/src/modules/accounting`

**Interfaces:**
- Consumes: completed Tasks 1–5 public contracts and the approved design/spec.
- Produces: authoritative implementation documentation, explicit B03/B04 legacy removal matrix, and a test proving B02 modules do not depend on Customer/Supplier.

- [ ] **Step 1: Write a boundary test/scan** that fails if B02 source imports legacy Customer/Supplier repositories/models or reads legacy opening balances.
- [ ] **Step 2: Run it**.
  Expected: FAIL while boundary comments/imports are unresolved.
- [ ] **Step 3: Isolate or remove only offending new-domain dependencies**, mark remaining legacy models/comments as temporary, and document each exact deletion phase.
- [ ] **Step 4: Write the authoritative docs** covering identity, profiles, GL FK/role rules, payment-term snapshots, template versioning, bootstrap/readiness, opening balances, audit/permissions, and legacy matrix.
- [ ] **Step 5: Run boundary test plus `git diff --check`**.
  Expected: no B02 module imports Customer/Supplier; docs contain no unresolved placeholders.
- [ ] **Step 6: Commit**
  ```bash
  git add daftar-api-v1/prisma/schema.prisma docs/01_ACCOUNTING_CONSTITUTION.md docs/02_BUSINESS_PARTNER_AND_ACCOUNTING_BOOTSTRAP.md daftar-api-v1/src
  git commit -m "docs: codify B02 accounting and legacy boundaries"
  ```

### Task 7: Full validation, review, and GitHub gate

**Files:**
- Modify: `.github/workflows/backend-ci.yml` only if B02 requires a missing deterministic validation step
- Test: all existing and B02 unit/integration suites

**Interfaces:**
- Consumes: all committed B02 implementation and docs.
- Produces: clean final branch, exact validation evidence, and successful GitHub Actions run.

- [ ] **Step 1: Create a fresh PostgreSQL database and shadow database** without modifying user databases.
- [ ] **Step 2: Run the complete local gate sequentially:** `npm ci`, `npx prisma generate`, strict accounting/B02 lint, `npx tsc --noEmit -p tsconfig.build.json --pretty false`, `npx prisma validate`, `npx prisma migrate deploy`, `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`, full Jest suite, B02 PostgreSQL integration suites, and `npm run build`.
  Expected: all commands exit 0; migration diff prints `No difference detected`; exact suite and test counts are recorded.
- [ ] **Step 3: Run a final diff review** confirming only backend/docs/schema files changed; frontend/mobile are untouched; B03 files/flows are absent.
- [ ] **Step 4: Run the plan review package/self-review** against the merge base, record any minor deferred findings and rulings, and fix any Critical/Important issue with a failing test first.
- [ ] **Step 5: Push the implementation branch/approved integration target** according to repository workflow and inspect the resulting GitHub Actions run and every job step.
  Expected: run conclusion `success`, lint/typecheck/Prisma/migrations/diff/tests/build all green.
- [ ] **Step 6: Commit any final CI-only repair if required, rerun the full gate, and stop after B02 without beginning B03.**
