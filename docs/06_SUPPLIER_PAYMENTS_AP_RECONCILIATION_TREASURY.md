# B06 — Supplier Payments, AP Reconciliation, and Treasury Foundation

## Scope

B06 adds the authoritative supplier-payment and accounts-payable settlement
workflow on top of the B01 general ledger and B05 purchase/AP documents. It is
backend-only. Frontend, mobile, inventory, COGS, and B07 work are intentionally
out of scope.

## Accounting model

- A posted supplier invoice maturity is a payable control-account credit open
  item, identified by its authoritative `JournalLine`.
- A posted supplier credit note is an independent payable debit open item. It
  is never silently netted into an invoice or payment.
- A posted supplier payment debits the resolved payable control account and
  credits the selected cash or bank source account.
- A payment may be allocated to one or more invoice maturities. An on-account
  payment has no allocations and may be reconciled later through the same AP
  reconciliation service.
- All reconciliation amounts are same-currency transaction amounts. Base
  amounts are carried proportionally from the original journal lines. The
  realized difference is `creditBaseAmountApplied - debitBaseAmountApplied`:
  positive is a gain and negative is a loss.
- When the two AP lines use different payable accounts, the adjustment entry
  reclassifies the matched balances before recording any realized FX gain/loss.

## Invariants and controls

- Every query is company-scoped; supplier identity, currency, control-account
  type, posted status, reversal state, and reconciliation eligibility are
  checked before settlement.
- CASH requires an active cash account. BANK_TRANSFER, CHEQUE, and CARD require
  an active bank account. The configured cash/bank journal must match the
  transaction currency.
- Posting, reconciliation, and reversal are transactional and idempotent.
  Changed payloads under an existing idempotency key fail with a conflict.
- Journal-line locks serialize competing allocations. Database triggers also
  enforce AP line direction, same supplier/currency, cumulative open amounts,
  posted-payment immutability, allocation immutability, and controlled
  reconciliation reversal.
- Reversal creates authoritative reversal entries and reopens the original AP
  exposure through reconciliation status; it does not create fake open items
  for the reversed payment source.

## API surface

The module is mounted at `/supplier-payments`:

- `GET /supplier-payments`
- `GET /supplier-payments/:id`
- `GET /supplier-payments/open-items?businessPartnerId=...`
- `POST /supplier-payments`
- `PATCH /supplier-payments/:id`
- `POST /supplier-payments/:id/post`
- `POST /supplier-payments/:id/reverse`
- `POST /supplier-payments/:id/reconcile`
- `POST /supplier-payments/ap-reconciliations`
- `POST /supplier-payments/ap-reconciliations/:id/reverse`

Staff permissions are `viewSupplierPayments`, `createSupplierPayment`,
`editSupplierPayment`, and `postSupplierPayment`.

## Migration-diff note

The Prisma schema intentionally cannot represent the two existing PostgreSQL
partial unique indexes for one default address and one primary contact. The
B06 migration preserves those indexes. A schema-to-database diff therefore
reports only these two documented representation exceptions:

- `BusinessPartnerAddress_one_default_per_type_idx`
- `BusinessPartnerContact_one_primary_idx`

No other migration diff is accepted.
