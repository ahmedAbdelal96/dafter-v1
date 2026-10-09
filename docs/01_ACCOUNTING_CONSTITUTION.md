# Dafter Accounting Constitution

This document is the binding engineering contract for the B01 Accounting Core and every later module that posts accounting entries.

## 1. Double entry is mandatory

Every `POSTED` journal must contain at least two lines and:

`SUM(debit) = SUM(credit)`

Each line has exactly one positive side. A line with both sides zero, both sides positive, or a negative side is invalid. The application validates this with `Prisma.Decimal`; PostgreSQL repeats the critical line and posted-entry checks.

## 2. Money is Decimal-only in the accounting domain

Authoritative accounting code must not use JavaScript floating-point money arithmetic. `Number(money)`, `parseFloat(money)`, implicit Decimal-to-number conversion, and monetary arithmetic on `number` are forbidden in this domain.

The B01 policy accepts validated decimal strings, stores new GL amounts as `Decimal(19,4)`, stores exchange-rate snapshots as `Decimal(19,8)`, rejects invalid/non-finite values and excess scale, performs exact operations with `Prisma.Decimal`, and serializes money as fixed-scale strings. Legacy `Decimal(14,2)` tables are not migrated in B01.

Transaction amounts use the minor-unit precision from the active `Currency` master row. Company-ledger amounts use four decimal places. The engine, not the caller, calculates every company amount with `transactionAmount × exchangeRate`, rounded half-up to four places per line. Both transaction totals and derived company totals must balance before posting. No caller-supplied company debit/credit representation is accepted.

## 3. Posted history is immutable

Draft journal headers may be prepared before posting. After posting, journal financial content cannot be edited, inserted into, or deleted. PostgreSQL triggers protect posted headers and lines in addition to application checks.

Corrections use a new reversal/correcting journal. The original entry remains queryable and is linked to the reversal.

## 4. Traceability is required

Every posting carries company, journal, accounting period, entry number, source type, optional source ID, idempotency key, actor, posting date, and posting timestamp. Posting and reversal actions also create the existing company-scoped `AuditLog` event in the same transaction.

## 5. Tenant isolation is an accounting invariant

Every accounting query and write is company-scoped. Composite company-aware foreign keys prevent an entry from using another company's account, journal, period, or source-owned accounting row. Controllers must obtain the company from authenticated tenant context, never from the request body.

## 6. Period control is explicit

Posting dates must fall inside the selected company period and fiscal year. Normal posting is allowed only in an `OPEN` period and `OPEN` fiscal year. `SOFT_CLOSED` and `CLOSED` periods reject normal posting; an explicit authorized accounting override is required for soft-closed posting. Closed periods are never silently bypassed.

Fiscal years and periods have database date-order and non-overlap protections. Period ownership by fiscal year and company is enforced by composite relations.

## 7. Idempotency is part of posting

The company + source type + idempotency key identity is unique in the journal header. The request hash must match on replay. A repeated operation returns the existing posted journal; the same key with a different payload is rejected. Unique constraints, not only a check-then-insert sequence, protect concurrent attempts.

The existing idempotency infrastructure remains the shared platform mechanism for later business mutations. The journal header also keeps the durable posting identity because it must be transactionally coupled to the journal itself.

The public manual-journal endpoint always writes `MANUAL_JOURNAL`. It does not accept `sourceType` or `sourceId`. Future business modules use the trusted internal posting contract, where the application service selects the allowed business source type and source ID.

## 8. Posting is atomic

Journal header, lines, posted transition, sequence allocation, and audit event are created in one PostgreSQL transaction. Any validation or line failure rolls back the whole posting.

## 9. Numbering is collision-safe, not gapless

Journal numbers are generated server-side from a company/fiscal-year counter using an atomic PostgreSQL upsert/update strategy. Numbers are unique per company. Gaps are allowed and are not represented as legally gapless numbering.

## 10. Reporting authority

Future Trial Balance, General Ledger, P&L, and Balance Sheet reports must derive from the authoritative B01 journal lines after business flows migrate. Existing managerial reports and the legacy `LedgerEntry`/`Balance` path are not treated as authoritative GL statements during coexistence.

## 11. B01 coexistence boundary

B01 does not migrate invoice approval, customer payments, deferred sales, installments, expenses, taxes, or cash reconciliation. Those legacy flows remain operational and are integrated through a versioned posting contract in B02 and later.

## 12. Greenfield target architecture decisions

The absence of production financial history means the target GL is not constrained by the legacy signed-party ledger. Legacy tables may remain temporarily for compilation and sequencing, but the future system has exactly one accounting truth: posted B01 journal lines.

### Currency model

`Currency` is the active master for code, display name, symbol, minor-unit precision, and activation state. The seeded foundation contains common ISO-style codes; B01 has no FX provider, market-rate fetch, or automatic revaluation.

`AccountingConfiguration.baseCurrencyCode` is the authoritative company/accounting currency; bootstrap aligns `Company.currencyCode` to it and opening balances read the configuration rather than treating the company row as a second source of truth. The canonical rate orientation is **company currency units per one transaction-currency unit**. For example, a USD transaction with `exchangeRate = 50` in an EGP company means `100 USD × 50 = 5,000 EGP`. A base-currency transaction must use rate `1`. A journal entry stores the transaction currency and immutable rate snapshot. Each line stores the original transaction debit/credit and the centrally derived company debit/credit. Normal template accounts and GENERAL/SALES/PURCHASE journals are currency-unconstrained (`NULL`); only explicitly currency-specific accounts/journals, such as the bootstrap CASH journal, carry a currency constraint.

The company-currency values are the posting/reporting authority; transaction values preserve the source-document representation. A future source adapter that needs a residual rounding line must use the typed `ROUNDING` account mapping and post that residual explicitly. B01 does not silently absorb a mismatch and does not implement FX revaluation; future exchange-difference postings use the configured gain/loss accounts.

The base currency cannot change after posted or reversed history. Account and journal currency constraints cannot change after posted or reversed use. The database also rejects a reporting currency equal to the base currency.

### Party and AR/AP decision

The target master-data decision is a common Business Partner/Party entity with role assignments (`CUSTOMER`, `SUPPLIER`, or `BOTH`). It is the correct long-term model because a counterparty can buy and sell, share tax identity/contact data, and have separately reconcilable AR/AP documents. Existing Customer/Supplier tables are temporary business-module structures; B02 must decide the migration boundary before document posting is integrated.

Journal lines already carry party, document reference, due date, transaction amounts, and a reconciliation reference. B02/B03 should add an allocation/reconciliation bridge between open AR/AP lines and settlement lines without changing journal debit/credit semantics.

### Accounts and hierarchy

B01 deliberately chooses a parent/child account tree. Group accounts are represented by `allowDirectPosting=false`; posting eligibility is behavior driven by account type and flags, never by code prefixes. `isControlAccount` is separate: AR/AP control accounts are real postable accounts (`allowDirectPosting=true`) owned by trusted source-document/subledger contracts, while generic `MANUAL_JOURNAL` posting rejects them. Account code remains a tenant-local identifier. Deactivation replaces hard deletion after posted history exists.

### Company accounting configuration

`AccountingConfiguration` is the explicit company-owned boundary for base/reporting currency, country/locale, and future default account/journal mappings. Mapping rows are keyed by typed configuration keys so tax, retained earnings, FX, inventory, AR/AP, and default journals can be extended without scattering settings across unrelated modules.

Default mappings are written through application services, are same-company only, and are semantically validated (for example, a receivable key cannot point to an expense account and a general-journal key cannot point to a sales journal). Mapping changes, currency-sensitive changes, accounts, journals, fiscal years, periods, and configuration changes create actor/reason snapshots in the company audit log. Opening-balance posting requires an OPEN original period; its later reversal is atomic and idempotent but validates only the target period/fiscal-year posting policy.

The immutable EG_STANDARD_V1 reference template is installed by `npm run db:reference-data` in production-safe environments. That command is additive, verifies existing versions instead of mutating them, and is safe to replay; disposable development `db:seed` may reset its own database before invoking the same installer.

The CI Prisma migration diff deliberately whitelists only the two expected differences caused by PostgreSQL partial unique indexes (one default address per type and one primary contact). Prisma schema syntax cannot express their `WHERE` predicates; any additional migration/schema difference fails CI.

Soft-close overrides are not a casual DTO boolean. They require an explicit non-empty reason, an active actor in the company, the required owner/super-admin or ledger permission, and a same-transaction audit event. `CLOSED` periods and closed fiscal years never accept an override.

The PostgreSQL layer repeats the critical invariants: posted entries need at least two lines, balanced company totals, balanced transaction totals, `postedAt`, and `postedById`; posted headers and lines are immutable. Cross-company composite foreign keys protect accounting ownership at the database boundary.

### Dates and source documents

Document date, posting/accounting date, and due/maturity date are distinct. Period validation uses posting date; AR/AP ageing uses due date; document/legal display uses document date. Journal numbering is an internal accounting identity and is never reused for invoice, payment, supplier, or statutory document numbering.

### Tax, inventory, and dimensions

Tax is expected to be line-aware in later phases. B01 lines support tax/source references and generic tax account mappings without performing tax calculation. Inventory is also later: the generic journal can express inventory/GRNI, COGS/inventory, returns, and valuation adjustments without a stock ledger in B01. Cost center, branch, department, and project dimensions will be added through a future line-dimension bridge; no fixed organization dimension is baked into the journal key or balance logic.

## 13. B02 permanent rules

B02 makes the greenfield boundary executable. The following rules are permanent accounting architecture, not implementation preferences:

- `BusinessPartner` is the authoritative counterparty identity. `CustomerProfile` and `SupplierProfile` are independent role capabilities on that identity; a `BOTH` counterparty has one identity with both profiles, never two parallel parties.
- New accounting references carry `JournalLine.businessPartnerId` only. The legacy signed `partyType`/`partyId` path is not a new posting contract and must not be used by B02 modules.
- A receivable control account requires an active customer role; a payable control account requires an active supplier role. The role check is company-scoped, transactionally enforced, and applies equally to normal source postings and opening balances.
- Opening balances are explicit, auditable GL events. Mutable balances on party records, summary tables, or legacy ledger rows are never an accounting source of truth.
- Payment terms are decimal-safe schedule definitions. A document integration must snapshot the calculated schedule at source-document creation; later payment-term changes must not rewrite historical due dates or installment amounts.
- Accounting templates are versioned reference data. Company account/journal configuration stores immutable provenance, is created through an idempotent bootstrap operation, and is considered usable only when the readiness checks pass.
- Posted entries, posted opening-balance batches, and their lines remain immutable. Corrections are reversals or new explicit entries, never edits or deletes.
- A reversal is posted into its target accounting period. An original opening-balance period may later be `SOFT_CLOSED` or `CLOSED`; only the target period/fiscal-year posting policy governs the correction.

### Legacy isolation and removal matrix

Legacy structures may remain only for the coexistence period. They are isolated from the authoritative B02 boundary as follows:

| Legacy area | B02 status | Removal/integration gate |
| --- | --- | --- |
| `Customer` / `Supplier` models and repositories | Legacy-only compatibility data; no B02 imports or queries | B03 migration adapter maps records to `BusinessPartner` and records unresolved duplicates before document posting moves |
| Legacy `partyType` / `partyId` journal references | Legacy-only historical representation | B03 source-flow adapter emits `businessPartnerId`; B04 removes the compatibility columns after all historical readers are migrated |
| `LedgerEntry` / `Balance` managerial path | Not an accounting statement authority | B04 reporting cutover proves all financial reports derive from B01 journal lines, then removes the path |
| Legacy invoice/payment/installment/expense posting flows | Operational coexistence only; no B02 GL ownership | Each B03/B04 source adapter must post through the typed accounting contract with idempotency and audit evidence before its legacy writer is retired |
| Mutable party balances and denormalized totals | Never authoritative | No migration phase may copy them into GL truth; derive balances from posted journal lines and reconciliation allocations |

B02 modules (`business-partners`, `payment-terms`, `accounting-bootstrap`, and `opening-balances`) must not import legacy customer/supplier modules or query legacy customer/supplier repositories. Any exception requires a new architecture review decision and an explicit boundary-test update.

## 14. Senior architecture review gate

The B01.1 answers are yes: the GL would still be chosen greenfield; Sales, Purchasing, Expenses, Cash/Bank, Tax, AR/AP, and Inventory can post through the internal source-typed contract without changing `JournalEntry`/`JournalLine`; multiple currencies are representable with one documented rate orientation and deterministic rounding; document-level reconciliation is representable; periods can be locked with controlled soft-close overrides; posted history is immutable; corrections are reversals; financial statements can derive from the GL; future dimensions can be added without rebuilding the ledger; and no second financial truth is intended to survive backend freeze.

B01.1 intentionally stops at the accounting foundation. It does not integrate business flows, add a second ledger, implement an FX provider/revaluation engine, or begin B02.
