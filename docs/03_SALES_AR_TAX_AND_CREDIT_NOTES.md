# B03 — Sales, AR, Tax and Credit Notes

## Scope and authority

B03 is the authoritative sales-document boundary. `SalesInvoice` and `SalesCreditNote` are tenant-safe, immutable-after-posting financial documents and post only through the B01/B02 accounting engine. The legacy `InvoicesModule`, its payment controller, and the legacy customer/ledger/balance workflow are isolated from the runtime application. Deferred sales and installments remain deferred legacy modules; they are not a second B03 posting path.

## Lifecycle and snapshots

Invoices and credit notes are created and edited only while `DRAFT`. Posting is an explicit command containing `postingDate` and `idempotencyKey`. `documentDate`, `postingDate`, and AR `dueDate` remain separate. Partner identity, legal name, tax registration, address, tax treatment/rate values, payment-term schedule, and the actual AR/revenue/tax accounts used by the posting are stored as snapshots or company-safe relational references. A posted document and all children are database-protected against mutation.

## Partner ownership and pricing

Sales accepts only an active `BusinessPartner` with an active `CustomerProfile` in the same company. Legacy `Customer` and `CustomerProductPrice` are not consulted by the authoritative flow. The legacy Pricing API is not runtime-registered pending its BusinessPartner pricing migration. Product references are optional and company-safe; descriptions and prices are frozen on the document.

## Pricing, tax and payment terms

All money arithmetic uses `Prisma.Decimal`. Quantity, discount, currency precision, tax-inclusion mode, and line totals are calculated server-side. Tax treatment and rate must belong to the same company, have a valid lifecycle/effective interval, and be a consistent pair. ZERO_RATED, EXEMPT and OUT_OF_SCOPE treatments may have no rate, but their lifecycle is still validated. Manual tax selection is a sales business action requiring `overrideSalesTax` and a reason; the audit log records the normal selection, override, actor and reason.

Payment terms are resolved during draft calculation and copied into immutable schedule rows. Posting validates the persisted schedule and exact sum. Each schedule row produces a separate AR `JournalLine` with partner, due date, document reference and reconciliation/source reference. This preserves aging and future reconciliation without redesigning the sales document.

## Accounting and multi-currency

Posting first evaluates `AccountingReadiness` for the requested posting date: READY setup, valid base currency, compatible mappings, SALES journal semantics, and an open fiscal period are mandatory. Receivable, revenue and output-tax accounts are revalidated for company, active state, postability, account type, and the locked control/reconciliation policy. Typed B02 account configuration is authoritative; legacy string `TaxAccountBinding` codes are not used for financial posting.

The accounting engine is the only posting path. Transaction amounts are converted with the same base-currency exchange-rate and four-decimal rounding semantics used by JournalLine. Credit exposure is the sum of posted GL receivable lines (`debit - credit`) for the partner, including opening balances, manual authoritative AR entries and credit notes. The prospective invoice is added in company currency; transaction-currency document totals are never mixed across currencies.

## Credit notes

Credit notes reference a posted invoice and original lines. Their AR credit uses the original invoice AR account; revenue and tax reversals use the original line/tax account basis. Current configuration is never consulted for historical correction. Partial credits lock the credit note, original invoice and original lines in deterministic order, recompute posted cumulative quantity and monetary amounts, cap proportional values at the remaining residual, and allocate the exact residual on the final quantity. A database transition guard also rejects posted cumulative quantity overage.

Credit notes have draft update/delete APIs, immutable posted state, and an explicit invoice-filtered list endpoint. Their AR credit is an independent open-item candidate dated by the credit-note posting/document policy; automatic allocation to invoice maturities is intentionally deferred to the reconciliation phase.

## Numbering, locking, idempotency and atomicity

Invoice and credit-note sequences are scoped by company, fiscal year and document type. Display years come from the fiscal year start date, never the server clock. Posting locks the document before status checks and sequence allocation. Credit-note posting additionally locks the original invoice and all affected lines. A matching idempotency key and payload replays the same result; a different payload conflicts; a different key cannot create a second posting for an already-posted document. Accounting, document state, snapshots, audit and sequence allocation share one transaction, so injected failures roll back all effects.

## API boundary and security

The active API is `/sales/invoices` and `/sales/credit-notes`. Posting DTOs require `postingDate` and `idempotencyKey`. Create/edit/post permissions are separate. Credit-limit override is not implemented in B03; a limit breach is always rejected. No client boolean bypass is accepted.

## Verification and future boundary

The B03 integration suite covers PostgreSQL migrations, split maturities, multi-currency exposure, account semantic corruption, tax lifecycle and company isolation, stale drafts, posting dates and fiscal-year numbering, invoice and credit-note concurrency, idempotency, atomic rollback, exact partial-credit residuals, legacy ledger/balance non-use, and runtime legacy-module isolation. CI runs strict lint including `src/modules/sales/**/*.ts`, type-check, fresh migrations, production-safe reference data/replay, Prisma diff gate, all tests and build.

Customer payments, AR allocation/reconciliation, purchasing, AP, inventory, COGS, financial statements, e-invoicing and external FX providers are outside B03 and remain future work.
