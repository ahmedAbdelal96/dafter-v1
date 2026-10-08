# 40 - Invoice Flow Cleanup Change Log

Date: 2026-04-01
Scope: first focused structural cleanup pass for invoice creation internals

## Code files changed
1. `hesba-api-v1/src/modules/invoices/use-cases/invoice-draft-preparation.util.ts` (new)
- Added shared utilities for:
  - draft item product validation
  - item Decimal computation and per-line totals
  - subtotal aggregation
  - issueDate normalization to UTC day start

2. `hesba-api-v1/src/modules/invoices/use-cases/create-invoice.use-case.ts`
- Replaced duplicated inline preparation logic with shared utility calls.
- Kept transaction flow, persistence, and audit behavior unchanged.

3. `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.ts`
- Replaced duplicated inline product validation / item computation / date normalization with shared utility calls.
- Added explicit use of shared `ComputedInvoiceItem` type for clarity.

## Documentation files created
- `study-docs/37_invoice_flow_structural_audit.md`
- `study-docs/38_invoice_flow_cleanup_plan.md`
- `study-docs/39_invoice_flow_cleanup_verification.md`
- `study-docs/40_invoice_flow_cleanup_change_log.md`

## What was improved
- Reduced create/update duplication in invoice draft preparation logic.
- Clarified responsibility boundary: use-cases orchestrate, utility prepares reusable draft payload pieces.
- Reduced risk of future behavioral drift between create and update calculations.

## What was intentionally deferred
- Deep refactor of invoice module orchestration.
- Diff payload type cleanup in `update-invoice.use-case.ts`.
- Wider module cleanup beyond invoice creation-related internals.
- Runtime DB credential/environment repair (documented as verification blocker, not changed here).

## Follow-up candidates
1. Add focused unit tests for shared invoice draft-preparation utility.
2. Normalize remaining mixed typing in update diff payload generation.
3. Optional second pass to split create use-case orchestration into smaller private methods.
