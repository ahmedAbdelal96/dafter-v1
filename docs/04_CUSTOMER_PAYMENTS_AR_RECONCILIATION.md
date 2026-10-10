# B04 — Customer Payments and AR Reconciliation

## Authority and scope

B04 records customer receipts against the B01 general ledger and the B02
`BusinessPartner` domain. A payment is a company-scoped document with the
lifecycle `DRAFT -> POSTED -> REVERSED`. `POSTED` payments and their
allocations are immutable; corrections are made only by posting a reversal
journal entry.

The reconciliation key is an authoritative posted `JournalLine` plus its
optional `SalesInvoicePaymentSchedule` maturity. An invoice id is descriptive
provenance only and is never sufficient to identify an open item. B03 invoice
posting stores the exact AR journal-line id on every maturity.

## Posting rules

- Payment numbers use `CustomerPaymentSequence` and are independent of the GL
  `AccountingEntrySequence`: `CP-YYYY-NNNNNN` per company and fiscal year.
- Posting is one database transaction: payment lock, AR target locks, open-item
  validation, journal posting, allocation persistence, and payment status update
  either all commit or all roll back.
- Cash methods require an active `ASSET_CASH` destination. Bank-like methods
  require an active `ASSET_BANK` destination. No other account type is valid.
- Amounts and exchange rates are PostgreSQL `Decimal` values. No JavaScript
  floating-point arithmetic is used. Allocation across currencies is rejected
  until an explicit FX settlement policy exists.
- Allocations are bounded by the exact remaining debit amount of each posted AR
  journal line. Multiple maturities can be allocated independently, partial
  allocations are supported, and excess receipts remain unapplied/on-account.
- Credit-note AR credits remain authoritative GL lines and therefore reduce
  customer exposure through the GL query; they are not simulated by mutating
  invoice totals.
- Idempotent posting uses the payment id plus a request hash and the accounting
  source idempotency key. Replays return the original result; a changed payload
  is rejected.

## API surface

- `POST /customer-payments` — create a draft with optional maturity allocations.
- `PATCH /customer-payments/:id` — edit a draft only.
- `POST /customer-payments/:id/post` — atomically post and reconcile.
- `POST /customer-payments/:id/reverse` — reverse a posted payment.
- `POST /customer-payments/:id/reconcile` — apply a previously unapplied
  on-account amount to a later AR maturity without mutating the posted payment.
- `GET /customer-payments` and `GET /customer-payments/:id` — scoped reads.
- `GET /customer-payments/open-items?businessPartnerId=...` — exact remaining
  AR maturities from posted GL lines.

## Required verification matrix

The B04 integration suite covers:

1. full, partial, and multiple-maturity allocations;
2. unapplied receipts and overpayment preservation;
3. credit-note AR credits and reduced GL-derived exposure;
4. company scope, wrong customer, inactive customer, and closed period;
5. inactive/wrong-type cash and bank destination accounts;
6. concurrent posting against the same maturity with no over-allocation;
7. idempotent replay and changed-payload rejection;
8. atomic rollback when journal posting or the payment finalization fails;
9. posted-payment and posted-allocation immutability;
10. explicit multi-currency behavior and exchange-rate validation;
11. exact remaining open amounts and later allocation of on-account money;
12. absence of legacy customer/supplier/invoice financial paths.

Purchases/AP, supplier payments, inventory/COGS, frontend, mobile, reports,
bank reconciliation, gateway/POS, deferred sales, and installment behavior are
explicitly outside B04.
