# B05 — Purchases, AP and Supplier Credit Notes

## Scope and authority

B05 introduces the authoritative purchase flow on top of the B01 general ledger:

`BusinessPartner + SupplierProfile → PurchaseOrder → SupplierInvoice → AP → SupplierCreditNote`.

BusinessPartner is the only commercial-party authority. SupplierProfile contains supplier-specific defaults such as payment terms, preferred currency and the optional payable-account override. No legacy `Supplier` model, mutable supplier balance, supplier-payment workflow, inventory, or COGS workflow is introduced in B05.

## Lifecycles

- Purchase orders are `DRAFT → APPROVED`, with `CANCELLED` allowed before conversion. They never create journal entries.
- Supplier invoices are editable only in `DRAFT`; posting makes the document and its accounting basis immutable. Both direct and approved-PO conversion paths are supported.
- Supplier credit notes are created against posted supplier invoices and become immutable when posted. Full and partial credits are quantity-limited against the original invoice under a transaction lock.

## Accounting and AP

Supplier-invoice posting uses `AccountingService` inside the owning transaction and requires accounting readiness, an open period, the exact `PURCHASE` journal, and a valid `PAYABLE` reconciliation/control account. The payable account resolves from `SupplierProfile.payableAccountId` when valid, otherwise the configured `PAYABLE` mapping.

The posting basis is:

- debit expense or explicit non-inventory asset accounts for the taxable base;
- debit recoverable/input tax accounts for purchase tax;
- credit the payable account once per payment-term maturity, with deterministic sequence and due date.

Supplier credit notes reverse that original basis: payable is debited, expense/asset is credited, and input tax is credited. AP exposure is derived from posted/reversed GL lines; no mutable supplier balance is stored. The invoice credit lines and supplier credit-note debit lines carry the same supplier and AP reconciliation reference for future AP reconciliation.

## Tax, dates, currency and numbering

Purchase tax uses the existing tax setup with `TaxModuleKey.PURCHASES`, input-tax account binding/mapping, and immutable rate/treatment snapshots. Document, posting and due dates remain separate. Transaction currency and exchange rate are stored from day one and sent through the base-currency conversion engine. Purchase orders use a company-scoped `PO-######` sequence. Supplier invoices and credit notes use separate fiscal-year sequences.

The database protects duplicate supplier references per company and supplier, in addition to application validation. Posting is idempotent through the accounting source/idempotency boundary and all create, edit, approve, cancel, convert, post and credit-note actions are audited.

## Deliberately deferred

B05 does not implement supplier payments, AP settlement/reconciliation screens, inventory/COGS, purchasing UI, mobile UI, or B06. Those require their own reviewed architecture and are not inferred from the B05 document model.

