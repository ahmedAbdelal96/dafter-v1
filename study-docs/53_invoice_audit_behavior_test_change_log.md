# 53 - Invoice Audit Behavior Test Change Log

Date: 2026-04-01
Scope: narrow test stabilization for UpdateInvoiceUseCase audit metadata/diff behavior

## Test files updated
1. `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.spec.ts`

### Added protections
- In items-present update path:
  - assert `createAuditLog` action/entity metadata
  - assert `metadata.fieldsChanged` exact deterministic order:
    - `['items', 'issueDate', 'taxAmount', 'notes']`
  - assert `diff.before` from existing items and `diff.after` from computed items

- In tax-only update path:
  - assert `metadata.fieldsChanged` equals `['taxAmount']`
  - assert `diff.before` and `diff.after` both fallback to existing items

## Production files changed
- None.

## What is now protected
- Deterministic fieldsChanged ordering/content for representative update branches.
- Deterministic diff payload mapping and stringified value shape for before/after in those branches.

## What remains ambiguous or untested
- More complex diff scenarios with multiple items and structural mutations.
- Explicit `notes: null` branch expectations in fieldsChanged.

## Recommended follow-up
1. Add one extra unit test for explicit `notes: null` to pin intent for null vs undefined.
2. Add one multi-item diff test covering add/remove/reorder behavior expectations.
