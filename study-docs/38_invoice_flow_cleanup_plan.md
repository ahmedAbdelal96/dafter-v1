# 38 - Invoice Flow Cleanup Plan

Date: 2026-04-01
Scope: first narrow structural cleanup pass for invoice creation internals

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/invoices/use-cases/create-invoice.use-case.ts`
- `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.ts`
- `hesba-api-v1/src/modules/invoices/use-cases/invoice-draft-preparation.util.ts` (new)
- `study-docs/39_invoice_flow_cleanup_verification.md` (new)
- `study-docs/40_invoice_flow_cleanup_change_log.md` (new)

## 2) Exact cleanup actions
1. Create shared utility for:
- product ownership validation for draft items
- item Decimal mapping and per-line total computation
- subtotal/tax/total calculation
- issueDate normalization to UTC midnight

2. Replace duplicated inline logic in create/update use-cases with shared utility calls.

3. Keep transaction boundaries and repository calls unchanged.

## 3) Intended behavioral impact
- Intended impact: no business behavior change.
- Expected gains:
  - clearer responsibility separation
  - less duplication
  - lower divergence risk between create and update paths

## 4) Risk assessment
- Low risk: internal refactor in same module with unchanged public method signatures.
- Main risk: subtle numeric/date behavior drift during extraction.
- Mitigation: keep Decimal/date logic byte-equivalent semantically and verify via build + diagnostics script.

## 5) Rollback notes
- Revert modified use-case files and remove new utility file.
- No schema/db migration involved.

## 6) Verification plan
- Build backend (`npm run build`) in `hesba-api-v1`.
- Run at least one diagnostic script for invoice creation path.
- Static check that API/controller/service signatures did not change.
- Record any runtime limitations (e.g., environment/DB dependency).
