# B04.1 — Customer Payments and Authoritative AR Reconciliation

## Authority and scope

B04.1 records customer receipts against the B01 general ledger and the B02
`BusinessPartner` domain. A payment follows `DRAFT -> POSTED -> REVERSED`.
Posted payments, allocations, and reconciliations are immutable financial
records; correction is performed through a controlled reversal.

An AR open item is a posted, non-reversal `JournalLine` on an active,
direct-posting `ASSET_RECEIVABLE` control account with a business partner.
`ARReconciliation` is the authoritative settlement record and always links
one debit AR line to one credit AR line. Invoice ids and payment maturities
are provenance only; `creditOffsets()` and invoice-id inference are not used.

## Posting and reconciliation rules

- Customer payments post one cash/bank debit and one customer-specific AR
  credit. Each allocation is then recorded through the generic AR
  reconciliation service.
- Credit-note AR credits remain open credit items until an explicit
  JournalLine-to-JournalLine reconciliation is requested.
- Active reconciliations are bounded by both lines' exact remaining transaction
  amounts. The final allocation carries the exact remaining base amount;
  partial base allocations are rounded to four decimal places.
- Reconciliation requires the same company, customer, transaction currency,
  posted status, and AR control/reconciliation-eligible semantics on both
  lines. Line locks are acquired in deterministic id order before allocation.
- A different customer receivable account is allowed through the customer
  profile override. Reconciliation posts a base-currency reclassification in
  the configured `EXCHANGE_DIFFERENCE` journal; any realized difference uses
  the configured `EXCHANGE_GAIN` or `EXCHANGE_LOSS` account.
- Payment reversal reverses the payment journal and every active child
  reconciliation in the same transaction. The invoice or credit open item is
  therefore reopened without creating a fake compensating settlement.
- JournalLines have a persisted per-entry `sequence`; all line selection and
  serialization uses that deterministic order.
- Posting, reconciliation, and reversal requests use company-scoped
  idempotency keys and request hashes. Replaying the same payload returns the
  original result; a changed payload is rejected.
- Accounting readiness and an `OPEN` accounting period are required for every
  financial transition. Cash methods require `ASSET_CASH`; bank-like methods
  require `ASSET_BANK`.

## API surface

- `POST /customer-payments` — create a draft with optional maturity allocations.
- `PATCH /customer-payments/:id` — edit a draft only.
- `POST /customer-payments/:id/post` — post and reconcile atomically.
- `POST /customer-payments/:id/reverse` — reverse a posted payment and its
  active reconciliations.
- `POST /customer-payments/:id/reconcile` — apply a posted payment's unapplied
  credit to a later debit AR line.
- `POST /customer-payments/ar-reconciliations` — create a generic AR
  reconciliation from debit and credit JournalLine ids.
- `POST /customer-payments/ar-reconciliations/:id/reverse` — reverse one
  generic reconciliation.
- `GET /customer-payments/open-items?businessPartnerId=...` — list exact
  remaining debit and credit AR open items.

## Verification

The B04.1 integration coverage verifies exact partial/full allocation,
on-account application, wrong-customer protection, concurrent no-overallocation,
destination-account policy, payment reversal reopening, reversal idempotency,
and realized FX/base-carrying amounts. The schema integration coverage verifies
the AR reconciliation table, status enum, deterministic JournalLine sequence,
foreign keys, and immutability triggers. B03 sales integration coverage owns
credit-note creation and GL-derived exposure behavior.

Purchases/AP, supplier payments, inventory/COGS, frontend, mobile, reports,
bank reconciliation, gateway/POS, deferred sales, and installment behavior are
outside B04.1.
