# B03 Sales, AR, Tax and Credit Notes Design

**Status:** Approved for implementation

**Baseline:** `7b72037691b757d232f214eb8a80d1505ec0242f`

**Branch:** `codex/b03-sales-ar-tax-credit-notes`

## Goal

B03 introduces the authoritative Sales financial flow:

`BusinessPartner -> SalesInvoice -> backend pricing/tax -> payment schedule -> JournalEntry/AR -> SalesCreditNote`.

The flow is backend/database-only. Frontend and mobile are untouched. Purchases/AP, inventory/COGS, Customer Payments, reconciliation, reporting, government e-invoicing, and external FX services remain outside B03.

## Architectural decisions

1. `SalesInvoice` and `SalesCreditNote` are new authoritative business documents. The legacy `Invoice` aggregate is not extended to carry the new accounting model.
2. `BusinessPartner` plus an active `CustomerProfile` is the only authoritative customer identity for new Sales code. Supplier-only partners are rejected; partners with both profiles are valid.
3. The lifecycle is deliberately `DRAFT -> POSTED`. Drafts have no GL effect. Posted documents are immutable and are corrected only with credit notes.
4. Sales posting composes one Prisma transaction and calls B02 `AccountingService.postInternalInTransaction()`. The transaction creates the document number, freezes snapshots, posts the JournalEntry, links it, writes audit data, and commits the posted document together.
5. All financial calculations use validated decimal strings and `Prisma.Decimal`/the existing accounting money helpers. No authoritative Sales path uses `Number`, `parseFloat`, or floating arithmetic.
6. Invoice numbering uses a tenant-scoped `SalesDocumentSequence`, independent from JournalEntry numbering. The sequence row is locked and incremented inside the posting transaction; rollback does not consume a number.
7. Payment Terms are resolved through the B02 engine and the generated maturities are copied into immutable `SalesInvoicePaymentSchedule` rows. Every AR maturity is a separate JournalLine carrying `businessPartnerId`, `dueDate`, document reference, and source traceability.
8. Tax determination uses the existing Tax Setup records and one reusable Sales tax service. Client totals are never authoritative. Treatment, rate, calculation mode, taxable base, and tax amount are copied into child snapshot rows at posting.
9. Output tax posts to the typed B02 `AccountingConfigurationAccount.TAX_PAYABLE` mapping. Legacy string tax account codes are not used as an independent authority; any compatibility field is migrated/validated against the typed account.
10. Revenue resolves to a validated product accounting override only if an existing legitimate mapping is available; otherwise it uses company `INCOME`. AR resolves to an active valid `CustomerProfile.receivableAccountId`, otherwise company `RECEIVABLE`. The journal resolves to company `SALES` and must be an active SALES journal.
11. Credit Notes reference original posted invoice lines, use the original price/tax/currency/exchange-rate basis, and debit revenue/tax while crediting AR. The original invoice remains posted and immutable. Line-level remaining credit is locked and recomputed in the posting transaction so concurrent notes cannot over-credit.
12. New Sales posting creates no legacy `LedgerEntry` and performs no `Balance.balance` mutation. Legacy Sales endpoints that expose the obsolete financial write path are removed from the authoritative module registration or explicitly isolated from the new Sales module by the final cutover.

## Data model

The migration adds the following company-scoped models and relations with composite tenant-safe foreign keys where supported:

### SalesInvoice

- identity: `id`, `companyId`, `businessPartnerId`, `status`
- document: nullable draft `invoiceNumber`, `documentDate`, nullable `postingDate`, `transactionCurrencyCode`, Decimal `exchangeRate`
- commercial inputs: nullable `paymentTermId`, purchase/reference number, notes
- backend totals: Decimal `subtotal`, `discountTotal`, `taxableBaseTotal`, `taxTotal`, `grandTotal`
- immutable posting data: `postedById`, `postedAt`, `journalEntryId`, idempotency key/request hash
- immutable customer snapshots: partner code, display/legal name, tax registration number, billing-address JSON, and relevant legal/contact snapshot fields
- relations: lines, line-tax snapshots, payment schedule rows, credit notes, JournalEntry

### SalesInvoiceLine

- `salesInvoiceId`, optional `productId`, line sequence, description snapshot
- Decimal quantity, unit price, discount type/value/amount, taxable base, tax amount, gross total
- product/accounting/tax intent snapshots sufficient for posted explainability

### SalesInvoiceLineTax

- one primary VAT-style component per line in B03
- safe references where useful plus immutable `treatmentCodeSnapshot`, treatment category, rate code, percentage, calculation mode, taxable base, and tax amount
- zero tax remains a tax treatment snapshot, not an absent tax record

### SalesInvoicePaymentSchedule

- invoice, sequence, due date, Decimal transaction amount, and immutable source/payment-term snapshot metadata
- database uniqueness on invoice and sequence; service and database checks ensure the sum equals `grandTotal`

### SalesDocumentSequence

- `companyId`, fiscal-year/numbering-period identity, document type (`SALES_INVOICE` or `SALES_CREDIT_NOTE`), `nextValue`
- unique tenant/period/type key and transactional allocation

### SalesCreditNote, SalesCreditNoteLine, SalesCreditNoteLineTax

- credit note header references the company, original posted SalesInvoice, BusinessPartner, original currency/exchange-rate basis, reason, dates, immutable snapshots, JournalEntry, final number, actor/time, and idempotency metadata
- each line references one original SalesInvoiceLine and stores credited quantity/amount plus original financial/tax snapshots
- child tax rows preserve the original line tax basis
- posted credit notes and all child rows are immutable

## Services and transaction flow

The new `sales` module is split into focused boundaries:

- `SalesInvoiceService`: draft CRUD, tenant/partner validation, query filters, and public DTO mapping
- `SalesPricingService`: Decimal line discount and taxable-base calculations
- `SalesTaxCalculator`: Tax Setup precedence, lifecycle/effective-date validation, exclusive/inclusive formulas, and tax snapshots
- `SalesPaymentScheduleService`: B02 Payment Terms resolution, exact rounded allocation, and schedule snapshots
- `SalesPostingService`: atomic invoice POST orchestration, account/journal resolution, credit-limit check, sequence allocation, and AccountingService composition
- `SalesCreditNoteService`: draft lifecycle, remaining-credit calculation, atomic credit posting, and immutable mappings
- repositories/policies: company-safe reads, sequence locking, idempotency, and posted-immutability guards

Invoice POST executes, in order, inside one transaction: lock invoice; validate DRAFT, company, customer profile, currency/rate, dates/period/readiness and tax applicability; calculate prices/tax/totals; build and validate the payment schedule; resolve AR/revenue/tax/journal accounts; calculate prospective company-base credit exposure; allocate the invoice number; persist snapshots and schedule; call `postInternalInTransaction()` with `JournalSourceType.SALES_INVOICE` and `sourceId`; link the JournalEntry; mark POSTED; write audit; commit.

Credit Note POST follows the same atomic boundary: lock the note and source invoice lines, recompute remaining creditable quantity/value, validate the original basis and customer, allocate a `SALES_CREDIT_NOTE` number, post `JournalSourceType.SALES_CREDIT_NOTE`, link the entry, mark POSTED, audit, and commit.

## Tax policy

Sales tax determination is deterministic:

1. Check the SALES applicability rule and whether taxation is enabled.
2. Require only the tax readiness needed by the applicable policy.
3. Validate an explicit permitted line selection and override permission/reason when supplied.
4. Otherwise use the SALES module default, then company TaxDefaultPolicy.
5. Resolve active/effective TaxTreatment and TaxRate.
6. Calculate with Decimal and currency precision.

`TAX_EXCLUSIVE` calculates tax from the discounted net base. `TAX_INCLUSIVE` backs tax out of the entered gross amount with Decimal division and currency rounding, preserving `net + tax = gross`. STANDARD, ZERO_RATED, EXEMPT, and OUT_OF_SCOPE remain distinct snapshots; the latter three may calculate zero tax.

## API surface

The authoritative API exposes create/retrieve/list/search/update/delete-or-archive draft invoice, post invoice, list/create/update/post/retrieve/list credit notes, with explicit capabilities for view/manage/post/override-tax/override-credit-limit. Public DTOs accept business intent only; calculated totals, tax, GL lines, source type, and JournalEntry internals are not client-controlled.

Search supports invoice number, partner, status, document/posting date ranges, currency, and due/overdue preparation. Responses expose snapshots and document traceability without exposing generic accounting mutation APIs.

## Database and legacy safeguards

- All document-to-company and document-to-partner/account/journal relations are tenant-safe.
- Unique constraints protect numbering, idempotency, one JournalEntry per posted document, line sequences, and schedule sequences.
- PostgreSQL checks/triggers protect posted immutability and prevent child mutation/deletion after posting where Prisma checks cannot fully defend the invariant.
- Accounting source uniqueness prevents duplicate financial posting.
- The schema header is updated to remove false claims that legacy `LedgerEntry`/`Balance.balance` are the canonical accounting truth.
- Legacy Invoice/InvoiceItem and old approval/payment controllers are not a second authoritative Sales system after cutover. Deferred/installment modules remain explicitly isolated and are not routed through B03.

## Test and validation strategy

Use real PostgreSQL integration tests for partner guards, drafts, Decimal pricing, all required tax modes/lifecycle boundaries, payment-term rounding, multi-currency conversion, account/journal resolution, atomic rollback, idempotency/concurrency, immutability, credit limits, credit-note over-credit protection, snapshots after source configuration changes, and zero legacy writes. Preserve every existing B01/B02 test.

The branch CI gate must run dependency install, Prisma generate/validate, lint, TypeScript, fresh migrations, production-safe reference data, deterministic seed and replay, the exact two documented partial-index diff exceptions only, all tests, and build. Frontend and mobile paths must remain untouched.

