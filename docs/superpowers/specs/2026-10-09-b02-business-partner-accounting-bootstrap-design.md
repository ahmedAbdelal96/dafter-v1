# B02 Business Partner and Accounting Bootstrap Design

Status: approved architecture; implementation starts after this spec.
Baseline: `01cb30bad30dc1b94696116a4677e6568d5e6709`
Scope: backend only. Frontend, mobile, and B03 Sales Invoice GL integration are excluded.

## 1. Outcome and boundaries

B02 makes a new company accounting-ready through one controlled, repeatable setup operation. The authoritative external commercial identity is `BusinessPartner`; customer and supplier are independent one-to-one role profiles. General Ledger AR/AP lines reference BusinessPartner through a real company-safe foreign key. Opening balances are explicit GL events, never mutable party master-data balances.

B02 is delivered as six vertical slices: partner domain, payment terms, accounting templates, company bootstrap/readiness, opening balances, and hardening/legacy boundary. Each slice has schema constraints, application validation, integration tests, audit events, and a migration-safe commit. The phase stops before Sales Invoice posting, Purchase Invoice posting, payment allocation, or official financial reports.

## 2. Existing constraints that drive the design

The current schema contains legacy `Customer`, `Supplier`, `Balance`, and `LedgerEntry` models. `Customer` and `Supplier` currently carry `openingBalance`; `Balance` is a party-keyed mutable current balance; and the authoritative B01 `JournalLine` uses nullable `partyType` plus `partyId` without a database foreign key. These are legacy boundaries, not the B02 target.

The existing accounting engine already provides Decimal-safe posting, company-scoped account/journal/fiscal-period relations, audit helpers, and the platform idempotency service. B02 extends those primitives instead of creating a second posting engine. Existing legacy modules remain buildable but new B02 modules cannot read or write legacy customer/supplier identities.

## 3. Target domain model

### 3.1 BusinessPartner aggregate

`BusinessPartner` is company-scoped and contains identity/contact data only:

- `id`, `companyId`, `partnerCode`, `partnerType` (`ORGANIZATION` or `PERSON`)
- `displayName`, nullable `legalName`
- nullable tax registration and commercial registration numbers
- nullable email, phone, website, notes
- `isActive`, optimistic-lock version, `createdAt`, `updatedAt`

Use unique `(companyId, partnerCode)` and search indexes on company plus normalized code/name/legal-name/phone/tax-registration. Do not add opening, current, receivable, payable, or available balance fields.

### 3.2 Role profiles

`CustomerProfile` and `SupplierProfile` use `businessPartnerId` as their one-to-one identity where Prisma permits it cleanly. Both include `companyId` for composite tenant-safe relationships, `isActive`, optional `paymentTermId`, optional preferred `currencyCode`, and role-specific account override (`receivableAccountId` or `payableAccountId`). CustomerProfile also has nullable Decimal `creditLimit`. Profiles do not duplicate identity, tax, address, or contact fields.

Profile creation is idempotent only through the normal resource uniqueness rule; a second profile for the same role is rejected. A partner with both profiles is the single valid BOTH identity. Removing a role is rejected when future posted/open accounting history makes it unsafe; the policy is implemented through a repository/service extension point even if B02 test fixtures have no history.

### 3.3 Addresses and contacts

`BusinessPartnerAddress` has company-safe partner relation, `addressType` (`BILLING`, `SHIPPING`, `REGISTERED`, `OTHER`), line1/line2, city, region, postal code, country code, default flag, active flag, timestamps. `BusinessPartnerContact` has company-safe partner relation, name, job title, email, phone, primary flag, active flag, timestamps. Multiple records are supported; no single vague address string is used by the new domain.

### 3.4 Payment terms

`PaymentTerm` is company-scoped with code, name, description, active flag, timestamps, and ordered `PaymentTermLine` children. A line has unique sequence, calculation type (`PERCENT` or `BALANCE`), nullable percentage, non-negative due-days offset, and optional end-of-month fields only if implemented with correct calendar semantics. Database checks enforce valid primitive ranges and uniqueness; service validation enforces schedule-level allocation rules.

The first release supports immediate (0-day), Net N, percentage splits, and percentage plus one BALANCE remainder. A valid term has exactly one BALANCE line or percentages summing to 100%; percentages cannot over-allocate, and line order/configuration is validated. The calculator accepts document amount, document date, term, and currency precision and returns due date/Decimal amount rows. It rounds each non-final allocation to currency precision and assigns the exact Decimal remainder to the final allocation so the sum equals the document total exactly. It never uses JavaScript floating arithmetic. Future invoices snapshot the generated schedule; changing a PaymentTerm does not mutate historical schedules.

## 4. General Ledger counterparty contract

Replace authoritative `JournalLine.partyType`/`partyId` with nullable `businessPartnerId` and a relation using `(businessPartnerId, companyId)` to `(BusinessPartner.id, BusinessPartner.companyId)`. Keep employee accounting separate; do not recreate generic polymorphic party references. Legacy `LedgerEntry` may retain its old party fields until later cleanup because it is outside the new GL contract.

Posting validation runs in the posting engine, not only DTOs:

- an `ASSET_RECEIVABLE` line requires an active BusinessPartner with active CustomerProfile;
- a `LIABILITY_PAYABLE` line requires an active BusinessPartner with active SupplierProfile;
- inactive partners and inactive role profiles are rejected for new posting;
- a partner from another company is rejected by both the composite FK and service checks;
- other account types may omit a partner and do not require one.

The B02 manual journal API accepts only the new `businessPartnerId` field. Opening-balance posting uses a dedicated use case and fixed source semantics; callers cannot submit `OPENING_BALANCE` through generic arbitrary JSON.

## 5. Versioned accounting templates

Add global `AccountingTemplate` and `AccountingTemplateAccount` models. Templates are identified by `(code, version)`, country code, name, description, active flag, and optional default currency. Template accounts use a stable semantic key, account code, Arabic and English names, account type, parent template account, direct-posting flag, control/reconciliation flags, and optional system mapping key. Template hierarchy is validated before use.

Seed `EG_STANDARD_V1` as a sensible Egyptian SME product template, explicitly not statutory law. It includes assets, cash/banks, AR, inventory, prepaids, fixed assets, liabilities, AP, tax payable/recoverable, equity, opening equity, revenue, COGS, operating expenses, exchange gain/loss, and rounding. Semantic keys include `AR_CONTROL`, `AP_CONTROL`, `SALES_REVENUE`, `DEFAULT_EXPENSE`, `RETAINED_EARNINGS`, `OPENING_BALANCE_EQUITY`, `TAX_PAYABLE`, `TAX_RECOVERABLE`, `INVENTORY`, `COGS`, `EXCHANGE_GAIN`, `EXCHANGE_LOSS`, and `ROUNDING`.

Instantiation copies template data into company-owned `AccountingAccount` rows and stores the source template code/version/key for traceability. Existing company accounts never bind dynamically to a mutable template. Mapping is by semantic key, never by account code.

## 6. Company accounting bootstrap and readiness

Implement `InitializeCompanyAccounting` as the sole orchestration use case. Input includes company, actor, idempotency key, country/localization, active base currency, template code/version, fiscal-year start/end, and period strategy. The atomic operation validates eligibility and currency, instantiates the template, creates GENERAL/SALES/PURCHASE/CASH journals, creates the fiscal year and periods, writes required account and journal mappings, records the setup/template choice, emits audit, and returns readiness.

Add an `AccountingSetup`/readiness boundary that records workflow state (`NOT_CONFIGURED`, `IN_PROGRESS`, `READY`, `BLOCKED`) only as useful workflow/cache state; readiness is always verified from underlying configuration. READY requires active base currency, usable active COA, required default account mappings, required journals/mappings, an open fiscal year, and an open period covering the posting date.

Bootstrap uses the existing idempotency service with a dedicated operation scope and a unique company/setup identity. A repeated request with the same payload replays the result; a different payload with the same key conflicts. Company-level uniqueness and transactional creation prevent concurrent duplication. Any failure rolls back the setup transaction or leaves a resumable, explicitly non-ready state.

Period generation is calendar-correct for arbitrary fiscal years. A July 1, 2026 through June 30, 2027 year produces twelve contiguous monthly periods with no gap, overlap, or January assumption. The generated journals/mappings remain editable by authorized accounting users after bootstrap.

## 7. Opening balances

Add `OpeningBalanceBatch` and `OpeningBalanceLine` (or an equivalent explicit aggregate) with company, effective/posting date, fiscal period, description, creator/poster, status (`DRAFT`, `VALIDATED`, `POSTED`, `REVERSED`), journal-entry relation, idempotency identity, timestamps, and immutable-posting metadata. Lines identify an account, Decimal debit/credit, optional BusinessPartner, description, and reference.

Validation requires a balanced complete batch, valid open period, active accounts, and role-correct partner references. A customer AR opening line debits AR with CustomerProfile; supplier AP credits AP with SupplierProfile. A balancing line can use opening-balance equity for partner-only onboarding. A full trial-balance import can supply its own balancing equity and must not receive a second artificial equity posting. The batch posts through the existing GL engine with controlled `OPENING_BALANCE` source behavior, preserves `businessPartnerId`, becomes immutable, and can only be corrected by a reversal/new batch. Reversal preserves the original and creates the opposite journal entry. All operations are idempotent and audited.

## 8. APIs, permissions, and audit

Create a backend BusinessPartner capability set for list/search, retrieve, create, update identity/contact data, activate/deactivate, add/remove customer/supplier profiles, manage addresses/contacts, assign payment terms, set credit limit, and set preferred currency. Add dedicated payment-term, template/bootstrap/readiness, and opening-balance endpoints/use cases under existing tenant/auth conventions.

Use named permission capabilities (`viewPartners`, `managePartners`, `viewAccountingSetup`, `manageAccountingSetup`, `viewOpeningBalances`, `manageOpeningBalances`) through the current PermissionsGuard/feature-policy framework. OWNER/SUPER_ADMIN behavior remains consistent with existing guards; STAFF requires the specific capability.

Audit at minimum partner create/update/role/payment-term/address/activation changes, template selection, bootstrap execution, opening-balance validation/post/post-reversal. Every event contains company, actor, entity, and useful before/after or request metadata.

## 9. Legacy isolation and removal milestones

No new B02 code imports or queries legacy Customer/Supplier. Existing customers, suppliers, balances, ledger entries, old statements, and old party workflows remain only where needed to keep unreplaced modules compiling. Their comments are marked legacy and their opening-balance fields are explicitly non-authoritative. No compatibility mirror or bidirectional synchronization is introduced.

The exact removal plan is documented: B03 removes/rebuilds Sales/customer/pricing dependencies and deletes the legacy Customer path when no old endpoint remains; B04 removes/rebuilds supplier/purchase/expense dependencies and deletes the legacy Supplier path; the legacy Balance/LedgerEntry layer is removed after all remaining old party workflows have moved to the authoritative GL. B02 does not connect legacy invoices, deferred sales, installments, or expenses to the new GL.

## 10. Test and validation contract

Unit tests cover payment-term validation/calculation, Decimal rounding/remainder behavior, fiscal-period boundaries, readiness predicates, and template hierarchy validation. PostgreSQL integration tests cover tenant-safe profile/address/contact FKs, customer-only/supplier-only/BOTH roles, duplicate/cross-company rejection, preferred active currency, AR/AP role enforcement, inactive partner rejection, template instantiation/mapping, non-January periods, repeated/concurrent bootstrap, rollback/resume behavior, opening-balance balance/immutability/reversal/idempotency, and GL-derived balances.

The final gate runs `npm ci`, Prisma generate, strict accounting/B02 lint, TypeScript, Prisma validate, fresh PostgreSQL migrations, migration diff with `No difference detected`, full tests, PostgreSQL integration tests, build, and GitHub Actions. B02 is not complete until the GitHub run conclusion is `success` and all required steps are green. No frontend/mobile files may appear in the B02 diff, and implementation stops before B03.
