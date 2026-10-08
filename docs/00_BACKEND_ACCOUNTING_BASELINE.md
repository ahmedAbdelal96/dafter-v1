# Backend & Accounting Baseline — Phase B00

**Repository:** `ahmedAbdelal96/dafter-v1`  
**Inspected checkout:** `master` at `2fa1847` (`Import Daftar project`)  
**Inspection date:** 2026-10-09  
**Scope:** backend, Prisma schema/migrations, financial flows, tenancy, auditability, tests, and backend infrastructure only.

## 1. Phase boundary and governance

This document is the single authoritative Phase B00 baseline. The work was inspection-only:

- No frontend or mobile files were changed.
- The existing sign-in changes in `daftar-dashboard` were pre-existing and were preserved.
- No database reset, drop, destructive migration, seed rerun, or migration creation was performed.
- Phase B01 was not started.

No `AGENTS.md` file was found. The repository contains historical naming drift: the actual workspaces are `daftar-api-v1`, `daftar-dashboard`, and `daftar-dashboard-mobile`, while the root README, Docker Compose, and CI still contain `hesba-*` paths and names. Current source code and the live Prisma migration state were treated as the source of truth.

## 2. Current backend shape

The backend is a NestJS monolith with a PostgreSQL/Prisma data layer, Redis/Bull infrastructure, JWT authentication, feature/role/permission decorators, i18n, Swagger, Helmet, throttling, and a global exception/response layer.

Relevant module areas are:

| Area | Current modules | Baseline observation |
|---|---|---|
| Identity and tenancy | `auth`, `users`, `companies`, `platform`, `entitlements` | JWT carries `companyId`; access is mostly controller/decorator opt-in. |
| Parties | `customers`, `suppliers`, `employees` | Separate tables; balances are represented by a polymorphic party key. |
| Financial operations | `ledger`, `invoices`, `deferred-sales`, `installments`, `expenses` | Several flows atomically update operational records, a party ledger row, and a balance snapshot. |
| Reporting | `statements`, `reports`, `dashboard` | Mix of Decimal calculations and presentation-time number conversion. |
| Tax and cash | `tax-setup`, `cash-reconciliation` | Configuration and operational reconciliation exist; neither is fully posted into an accounting journal. |
| Audit | `audit`, `platform-audit`, per-flow `AuditLog` writes | Audit events exist, but the financial record model is reversible/soft-deletable rather than immutable. |

Bootstrap references: `daftar-api-v1/src/main.ts`, `daftar-api-v1/src/app.module.ts`.

## 3. Data model baseline

The schema is PostgreSQL with money columns generally represented as `Decimal(14,2)`. The core financial records are:

- `LedgerEntry`: one signed amount per company/party (`partyType` + `partyId`), with no debit/credit lines, account IDs, journal header, currency snapshot, or posting period.
- `Balance`: a denormalized current snapshot keyed by company/party/type.
- `Invoice`/`InvoiceItem`: workflow and document totals; `Invoice.ledgerEntryId` is only a UUID field and is not a declared foreign key or unique relation.
- `DeferredSale`/`DeferredPayment` and `InstallmentContract`/`InstallmentPayment`: operational subledgers linked to ledger IDs by application convention; the ledger ID fields are not relational foreign keys.
- `Expense`: a company-scoped operational expense with Decimal amount, but it is not posted to `LedgerEntry`.
- `AuditLog`: company, actor, action, entity type/id, metadata, and optional diff; `entityId` is polymorphic and therefore not FK-enforced.
- `IdempotencyRecord`: company + operation type + key infrastructure exists, but the inspected customer-facing financial mutation flows do not use it.
- Tax setup models store rates, treatments, defaults, applicability, and account-code bindings. There is no chart-of-accounts or journal account table in the schema.

Important schema references:

- `daftar-api-v1/prisma/schema.prisma:776-851` — `LedgerEntry`, `Balance`, `AuditLog`.
- `daftar-api-v1/prisma/schema.prisma:891-1077` — deferred sales and installment models.
- `daftar-api-v1/prisma/schema.prisma:1169-1190` — expenses.
- `daftar-api-v1/prisma/schema.prisma:1379-1459` — invoices and invoice items.

There are no database constraints enforcing the business rules documented in comments, including:

- non-negative amounts;
- `paidAmount <= totalAmount`;
- invoice total equals item totals plus tax;
- installment schedule totals equal contract debt;
- journal balancing or debit/credit equality;
- closed accounting periods;
- valid polymorphic `partyId` ownership/type.

## 4. Confirmed financial flows

### 4.1 Manual invoice

1. `CreateInvoiceUseCase` recomputes invoice item totals with `Prisma.Decimal`, adds tax, and creates a DRAFT atomically with an audit event.
2. Submit/reject change workflow state without financial posting.
3. `ApproveInvoiceUseCase` creates an `INVOICE` ledger row and increments the party `Balance` for non-deferred manual invoices.
4. `CancelInvoiceUseCase` soft-deletes the linked ledger row and decrements the party balance.
5. Invoice payment updates invoice paid state, creates a negative `PAYMENT` ledger row, and decrements the party balance.

Confirmed weaknesses:

- approval credit-limit arithmetic uses `Number(invoice.totalAmount)` and `currentBalance + ...`;
- ledger/balance write helper signatures accept `number`, even though the database is Decimal;
- cancellation reverses by hiding/soft-deleting the original ledger row instead of creating an immutable reversal journal;
- invoice payment has no payment-allocation table, and direct payment mutations have no idempotency key;
- distributed payment reads open invoices before its write transaction, leaving a concurrency/race window.

Files: `daftar-api-v1/src/modules/invoices/use-cases/approve-invoice.use-case.ts`, `cancel-invoice.use-case.ts`, `record-invoice-payment.use-case.ts`, `distribute-payment.use-case.ts`, and `invoices.repository.ts`.

### 4.2 Deferred sale

Creation atomically creates an `INVOICE` ledger entry, the `DeferredSale`, increments `Balance`, and writes an audit event. Payment atomically creates a negative `PAYMENT` ledger entry, a `DeferredPayment`, increments `paidAmount`, updates status, decrements `Balance`, and writes an audit event.

Confirmed weaknesses:

- payment validation happens before the transaction and the update does not use `version` in its predicate; the `version` field is incremented but does not provide a complete optimistic-locking guarantee;
- payment amounts enter the ledger helper as JavaScript numbers (`-dto.amount`);
- there is no idempotency enforcement for payment retries;
- cancellation soft-deletes the sale and original ledger entry and reverses the balance, rather than preserving a posted correction chain.

Files: `daftar-api-v1/src/modules/deferred-sales/use-cases/create-deferred-sale.use-case.ts`, `record-deferred-payment.use-case.ts`, `cancel-deferred-sale.use-case.ts`, and `deferred-sales.repository.ts`.

### 4.3 Installments

Contract creation uses `Prisma.Decimal` for debt/down-payment/schedule arithmetic, creates the invoice and optional down-payment ledger rows, creates schedules, updates the party balance, and writes an audit event in one transaction. Payment records a negative ledger entry, payment row, schedule/contract updates, balance decrement, and audit event.

Confirmed weaknesses:

- payment validation is performed before the transaction; the schedule/contract rows are not locked or conditionally updated using the previously read paid amount/version;
- payment has no idempotency enforcement;
- cancellation reverses balance and soft-deletes related ledger rows;
- the model still uses polymorphic parties and application-level linkage for ledger IDs.

Files: `daftar-api-v1/src/modules/installments/use-cases/create-contract.use-case.ts`, `record-payment.use-case.ts`, and `installments.repository.ts`.

### 4.4 Expenses

Expense create/update/delete are company-scoped and audited in transactions. Amounts are stored as `Prisma.Decimal`.

Confirmed accounting gap: `Expense` is an operational table only. The inspected create/update/delete paths do not create or reverse a ledger posting, cash movement, payable, tax input, or journal entry. Updating an existing expense mutates the amount in place and only records a metadata audit event.

Files: `daftar-api-v1/src/modules/expenses/use-cases/*.ts` and `expenses.repository.ts`.

### 4.5 Tax setup

Tax setup is a company-scoped configuration subsystem with audited transactional updates. It supports registration profiles, treatments, rates, default policy, account-code bindings, and module applicability rules.

Confirmed accounting gap: invoice tax is currently an input/stored amount; the inspected invoice flow does not resolve the tax setup policy into journal lines or tax payable/recoverable postings. Account bindings are strings, not relations to an account/chart model.

### 4.6 Cash reconciliation

The migration explicitly describes Phase 1 as “operational only.” The service calculates expected cash and variance in JavaScript `number` arithmetic, stores Decimal fields, and prevents edits after closing.

Confirmed accounting gap: `CashReconciliationDaily` is not linked to sales, payments, expenses, cash accounts, or journal entries. It is a separate operational close/review record.

Files: `daftar-api-v1/src/modules/cash-reconciliation/cash-reconciliation.service.ts`, `cash-reconciliation.repository.ts`, and migration `20260325103000_add_cash_reconciliation_phase1/migration.sql`.

## 5. Money arithmetic audit

The implementation is mixed rather than consistently Decimal-safe.

### Safer patterns observed

- invoice creation and update totals use `Prisma.Decimal`;
- installment schedule and deferred-sale comparisons use `Prisma.Decimal`;
- balance snapshots normally use PostgreSQL/Prisma `increment` and `decrement` inside transactions;
- statement running balances use `Prisma.Decimal`.

### High-priority unsafe or boundary patterns

- DTOs expose financial amounts as JavaScript `number` with `@IsNumber`.
- `InvoicesRepository.createLedgerEntry`, `incrementBalance`, and `decrementBalance` accept `number`.
- invoice approval uses `Number`/`parseFloat` for credit checks, ledger amount, and balance increment.
- invoice/deferred/standalone payment flows pass negated DTO numbers into ledger helpers.
- cash reconciliation computes `opening + sales - expenses` and variance using JavaScript numbers.
- dashboard/customer summaries convert Decimal values to numbers for totals/sorts; these should be explicitly treated as presentation-only and kept out of authoritative decisions.

Recommended policy for B01: accept monetary input as a decimal string or a validated fixed-scale value at the boundary, convert immediately to `Prisma.Decimal`, keep all authoritative comparisons and postings Decimal/DB-side, and serialize money as fixed-scale strings in API contracts unless a deliberate minor-unit integer policy is adopted.

## 6. Tenant isolation

### Confirmed strengths

- party lookups, invoices, ledger entries, balances, deferred sales, installments, expenses, cash reconciliation, and tax setup generally include `companyId` in their queries;
- controllers obtain tenant context from the authenticated JWT through `CurrentTenant`;
- the core financial repositories consistently scope read/write operations by company;
- cross-tenant party IDs are rejected by company-scoped existence checks.

### Risks and governance findings

- `CurrentTenant` uses `request.user?.companyId`; the permitted `X-Company-Id` header is not used by that decorator. `TenantMiddleware` exists but was not found applied as the authoritative tenant resolver.
- authentication uses globally unique user email, which is a product/data-model decision that should be documented for multi-company users.
- controller guards are opt-in decorators rather than one global authentication guard; this makes the feature-policy manifest important and leaves drift detectable by tests.
- tax update methods should continue to enforce company in the final mutation predicate, not only in a preceding lookup.
- polymorphic `partyId` has no database FK; isolation and party type correctness remain service-level invariants.

## 7. Auditability and immutability

Positive controls:

- most write flows use a DB transaction and create an `AuditLog` in the same transaction;
- invoice drafts are editable only before approval;
- invoice snapshots preserve party/item presentation data;
- expenses, deferred sales, invoices, and ledger rows use soft-delete flags;
- `AuditLog.diff` exists for invoice draft changes.

Accounting-grade gaps:

- the model calls `LedgerEntry` immutable, but a public delete endpoint soft-deletes it and reverses `Balance`;
- invoice/deferred/installment cancellation hides/reverses the original row instead of recording a new immutable reversal entry with source linkage;
- there is no posted journal header/line model, posting state, source-document link, correction reason, or period lock;
- audit metadata is not a tamper-evident chain and does not universally capture before/after values;
- several operational aggregates (`paidAmount`, `Balance`) are maintained as snapshots without a system-level reconciliation invariant or repair/audit report.

## 8. Migrations and infrastructure

The local database reports **23 migrations found and schema up to date**. The subscription hardening migration adds a database-enforced one-live-subscription partial unique index and `endDate > startDate` check. The idempotency migrations create a useful company/operation/key table, but current financial mutation paths do not consume it.

Confirmed repository/infrastructure drift:

- `docker-compose.yml` builds `./hesba-api-v1` and `./hesba-dashboard`, but the actual directories are `daftar-api-v1` and `daftar-dashboard`;
- `.github/workflows/backend-ci.yml`, `web-ci.yml`, and `mobile-ci.yml` use the same stale `hesba-*` paths and cache paths;
- root/backend README and Swagger title still use Hesba naming in places;
- encoding/mojibake is present in several backend comments/messages.

These are release/CI/governance blockers and should be corrected before relying on CI as the baseline gate. They were not changed in B00.

## 9. Validation performed

Commands were run from `daftar-api-v1` unless noted:

| Command | Result |
|---|---|
| `npx prisma validate` | PASS — schema valid. |
| `npx prisma format --check` | FAIL — schema has unformatted files. No formatting was applied. |
| `npx prisma migrate status` | PASS — 23 migrations, database up to date. |
| `npm test -- --runInBand --passWithNoTests` | FAIL — 27 suites passed, 1 failed; 118 tests passed, 1 failed. Failure: feature-policy manifest missing 3 controller entries. |
| `npx tsc --noEmit` | FAIL — existing test/mock typing errors, including `never`, incomplete Prisma-shaped mocks, and possibly undefined assertions. |
| `npx eslint "{src,apps,libs,test}/**/*.ts"` | BLOCKED — installed ESLint dependency tree cannot resolve `ajv/lib/refs/json-schema-draft-04.json`. |
| `npm run build` | NOT VERIFIED — the command produced no output for several minutes after starting and was interrupted; no source change was made. |
| `npm run test:e2e` | NOT run — the only e2e test is a scaffold that imports the full app and would require external runtime services; no additional coverage would be established by this baseline run. |

No destructive database command was run. The current working tree after validation contains only the four pre-existing sign-in files plus this new baseline document.

## 10. Exact B01 recommendation

Start **B01: Accounting Core Foundation**, before adding more tax, cash, reporting, or payment features.

The first B01 slice should define and test:

1. a company-scoped chart of accounts and account types;
2. immutable journal headers and balanced debit/credit lines;
3. a posting service with Decimal-only money policy and source-document/idempotency linkage;
4. fiscal periods and a close/lock rule;
5. explicit reversal/correction postings instead of deleting posted financial rows;
6. reconciliation invariants between source documents, journal postings, party balances, and snapshots;
7. invoice approval as the first migrated posting flow, followed by payments, deferred sales, installments, expenses, tax, and cash reconciliation.

Use a compatibility/shadow-posting strategy where needed so existing screens remain usable while the new journal becomes authoritative. Do not begin B01 by changing frontend/mobile screens or by adding more operational tables without a posting contract.
