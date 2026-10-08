# Dafter Accounting Constitution

This document is the binding engineering contract for the B01 Accounting Core and every later module that posts accounting entries.

## 1. Double entry is mandatory

Every `POSTED` journal must contain at least two lines and:

`SUM(debit) = SUM(credit)`

Each line has exactly one positive side. A line with both sides zero, both sides positive, or a negative side is invalid. The application validates this with `Prisma.Decimal`; PostgreSQL repeats the critical line and posted-entry checks.

## 2. Money is Decimal-only in the accounting domain

Authoritative accounting code must not use JavaScript floating-point money arithmetic. `Number(money)`, `parseFloat(money)`, implicit Decimal-to-number conversion, and monetary arithmetic on `number` are forbidden in this domain.

The B01 policy accepts validated decimal strings, stores new GL amounts as `Decimal(19,4)`, stores exchange-rate snapshots as `Decimal(19,8)`, rejects invalid/non-finite values and excess scale, performs exact operations with `Prisma.Decimal`, and serializes money as fixed-scale strings. Legacy `Decimal(14,2)` tables are not migrated in B01.

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

`AccountingConfiguration.baseCurrencyCode` is the company/accounting currency. A journal entry also stores `transactionCurrencyCode` and an immutable `exchangeRate` snapshot. Each line stores both transaction-currency debit/credit and company-currency debit/credit; the company-currency totals are the balancing/reporting authority. Accounts and journals may optionally constrain a currency. B01 does not implement FX revaluation; future exchange-difference postings use the configured gain/loss accounts.

### Party and AR/AP decision

The target master-data decision is a common Business Partner/Party entity with role assignments (`CUSTOMER`, `SUPPLIER`, or `BOTH`). It is the correct long-term model because a counterparty can buy and sell, share tax identity/contact data, and have separately reconcilable AR/AP documents. Existing Customer/Supplier tables are temporary business-module structures; B02 must decide the migration boundary before document posting is integrated.

Journal lines already carry party, document reference, due date, transaction amounts, and a reconciliation reference. B02/B03 should add an allocation/reconciliation bridge between open AR/AP lines and settlement lines without changing journal debit/credit semantics.

### Accounts and hierarchy

B01 deliberately chooses a parent/child account tree. Group accounts are represented by `allowDirectPosting=false`; posting eligibility is behavior driven by account type and flags, never by code prefixes. Account code remains a tenant-local identifier. Deactivation replaces hard deletion after posted history exists.

### Company accounting configuration

`AccountingConfiguration` is the explicit company-owned boundary for base/reporting currency, country/locale, and future default account/journal mappings. Mapping rows are keyed by typed configuration keys so tax, retained earnings, FX, inventory, AR/AP, and default journals can be extended without scattering settings across unrelated modules.

### Dates and source documents

Document date, posting/accounting date, and due/maturity date are distinct. Period validation uses posting date; AR/AP ageing uses due date; document/legal display uses document date. Journal numbering is an internal accounting identity and is never reused for invoice, payment, supplier, or statutory document numbering.

### Tax, inventory, and dimensions

Tax is expected to be line-aware in later phases. B01 lines support tax/source references and generic tax account mappings without performing tax calculation. Inventory is also later: the generic journal can express inventory/GRNI, COGS/inventory, returns, and valuation adjustments without a stock ledger in B01. Cost center, branch, department, and project dimensions will be added through a future line-dimension bridge; no fixed organization dimension is baked into the journal key or balance logic.

## 13. Senior architecture review gate

Before B02, the answer to all of these must be yes: the GL would still be chosen greenfield; Sales, Purchasing, Expenses, Cash/Bank, Tax, AR/AP, and Inventory can post without changing JournalEntry/JournalLine; multiple currencies are representable; document-level reconciliation is representable; periods can be locked; posted history is immutable; corrections are reversals; financial statements can derive from the GL; future dimensions can be added without rebuilding the ledger; and no second financial truth is intended to survive backend freeze.
