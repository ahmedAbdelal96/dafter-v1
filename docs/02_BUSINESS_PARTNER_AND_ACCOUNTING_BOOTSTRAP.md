# B02 Business Partner and Accounting Bootstrap Boundary

This document defines the backend contract delivered by B02. It is subordinate to the [Accounting Constitution](./01_ACCOUNTING_CONSTITUTION.md) and is the handoff contract for B03 source-document posting.

## Scope

B02 establishes the minimum accounting master-data and company bootstrap foundation:

1. one company-scoped `BusinessPartner` identity with independent customer and supplier roles;
2. decimal-safe reusable payment terms and calculated schedules;
3. immutable, versioned accounting templates and company account/journal bootstrap;
4. readiness checks that prove the company can post;
5. explicit opening-balance batches that become normal, auditable journal events;
6. role-aware GL counterparty validation and an executable legacy boundary.

B02 does not implement Sales Invoice, Purchase Invoice, payment allocation, inventory, tax calculation, reconciliation, or frontend/mobile changes. Those remain B03/B04 work and must integrate through the contracts below.

## Authoritative identity and role model

`BusinessPartner` is the only new counterparty identity. It is tenant-scoped by `companyId`, has an independent active flag, and may have one active `CustomerProfile`, one active `SupplierProfile`, or both. Customer and supplier profiles contain role-specific commercial settings; shared legal identity, addresses, and contacts remain on the business partner.

The `BOTH` case is represented by one `BusinessPartner` row plus both role profiles. It must not create a second customer or supplier identity. Every API operation is company-scoped and must reject cross-company identifiers, inactive partners, and invalid role references.

For accounting:

- `JournalLine.businessPartnerId` is the authoritative GL counterparty link.
- A receivable account requires an active customer profile.
- A payable account requires an active supplier profile.
- A non-control account may carry a business partner only when the source flow has a documented reason; the accounting service still enforces same-company and active status.
- A role cannot be removed while posted journal or opening-balance history depends on it.

## Payment-term contract

Payment terms are reusable definitions with ordered schedule lines. All percentages, amounts, and calculations use `Prisma.Decimal`; JavaScript floating-point arithmetic is not part of the accounting contract. Schedule lines support immediate, relative-day, and percentage-based splits, with a single `BALANCE` line receiving the exact residual after rounding.

B03 document creation must call the payment-term calculator and snapshot the resulting due dates, percentages, and amounts on the source document. Updating a reusable payment term affects future documents only. Historical document schedules are immutable.

## Accounting template and bootstrap contract

Templates are versioned reference data. A template contains account codes, hierarchy, account types, direct-posting flags, and typed system mappings. A company bootstrap operation:

- resolves one active template version;
- creates company-owned accounts while preserving template code/version/key provenance;
- creates the default journals, fiscal year, monthly periods, numbering sequence, and typed configuration mappings;
- records an `AccountingSetup` readiness state and audit event;
- is idempotent for a supplied request key and must not duplicate company accounting foundations.

The bootstrap operation must fail closed when the template is missing, inactive, structurally invalid, or missing a required system key. Company readiness must verify active base currency, required mappings, default journals, and an open fiscal year/period before B03 may post documents.

## Opening balances

Opening balances use a draft → validate → post → reverse lifecycle. A draft contains explicit debit/credit lines, Decimal amounts, the posting date, a source reference, and optional company-scoped business partners. Validation checks account ownership, posting eligibility, open period, role correctness for receivable/payable accounts, and balanced totals. Posting creates a normal immutable journal entry through the accounting service with source type `OPENING_BALANCE`; reversal creates a separate reversing entry and does not mutate posted history.

Opening-balance commands are idempotent by request key, auditable with actor and reason, and never write mutable customer/supplier balances. A posted or reversed batch cannot be edited or deleted.

## B03/B04 integration and removal matrix

| Phase | Required integration | Legacy boundary exit condition |
| --- | --- | --- |
| B03 | Sales and purchase source documents resolve `BusinessPartner`, snapshot payment schedules, and call the typed posting contract with `businessPartnerId` | No new document flow writes legacy party references or mutable balance summaries; migration exceptions are audited |
| B03 | Customer/supplier data migration reconciles duplicate identities and preserves role-specific settings | Every active legacy counterparty is mapped or explicitly quarantined; no silent many-to-one merge |
| B04 | Payments, allocations, taxes, inventory, expenses, and reporting consume the B01 journal authority and reconciliation bridges | All authoritative financial reads use posted journal lines and documented allocation/reconciliation data |
| B04 | Legacy compatibility readers are removed after downstream consumers migrate | `Customer`/`Supplier` compatibility paths, legacy party columns, `LedgerEntry`/`Balance` financial reporting, and mutable party totals are deleted only after a verified migration gate |

## Boundary rules for future work

The B02 backend modules must remain free of imports and queries against legacy customer/supplier modules. New source flows must not add another party identity, another ledger, or an alternate balance authority. Any change that would cross this boundary requires updating the constitution, this document, and the boundary integration test in the same change.

The B03 starting point is therefore explicit: use `BusinessPartner` + role profile, calculate and snapshot the payment schedule, resolve typed account mappings from company accounting configuration, and post through the existing atomic accounting service. Do not begin by extending the legacy invoice or signed-party ledger path.
