# B03 Sales cutover

## Authoritative workflow

`BusinessPartner` with an active `CustomerProfile` is the only customer identity accepted by the B03 Sales module. `SalesInvoice` and `SalesCreditNote` are the authoritative business documents. Drafts calculate totals on the backend, capture partner/currency/tax/payment snapshots, and do not create ledger effects.

Posting is a single transaction through the B01 `AccountingService` boundary. Sales invoices debit the configured receivable control account and credit revenue plus output tax where applicable. Credit notes reverse those directions against the original posted invoice. Both documents use fiscal-year-scoped sequences and deterministic idempotency keys.

## Immutability and correction

Posted headers and child rows are protected by PostgreSQL triggers. A posted document cannot be edited or deleted; corrections are represented by a posted credit note linked to the original posted invoice. The migration intentionally leaves legacy `Invoice`, `LedgerEntry`, and `Balance` models available only for unreplaced legacy modules; B03 never reads or writes them.

## API capability keys

The Sales controllers use these STAFF permission flags:

- `viewSalesInvoices`, `createSalesInvoice`, `editSalesInvoice`, `postSalesInvoice`
- `viewSalesCreditNotes`, `createSalesCreditNote`, `editSalesCreditNote`, `postSalesCreditNote`

OWNER and SUPER_ADMIN follow the existing permission bypass. Frontend and mobile clients are not part of B03 and are intentionally untouched.
