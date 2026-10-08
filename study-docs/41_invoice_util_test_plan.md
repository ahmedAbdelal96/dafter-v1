# 41 - Invoice Utility Test Plan

Date: 2026-04-01
Scope: unit tests for `invoice-draft-preparation.util.ts`
Product: Hesba

## 1) Current utility behaviors
The utility currently provides:
- `validateDraftItemProducts(...)`
  - skips when items undefined/empty
  - skips items without `productId`
  - validates `productId` ownership through repository
  - throws `NotFoundException` with translated message when invalid
- `computeDraftItems(...)`
  - maps DTO item fields to Decimal-based computed item structure
  - computes line total = quantity * unitPrice
  - normalizes missing `productId` to `null`
- `sumItemTotals(...)`
  - aggregates all item totals with Decimal-safe addition
- `normalizeIssueDateToUtcStart(...)`
  - sets UTC time to 00:00:00.000 for provided date string

## 2) Highest-priority behaviors to test
1. Validation behavior with/without `productId` and with invalid product.
2. Decimal line-total computation correctness.
3. Subtotal aggregation correctness.
4. UTC date normalization correctness.

## 3) Proposed test cases
1. `validateDraftItemProducts` returns without repo call when items undefined.
2. `validateDraftItemProducts` skips item without `productId` (no repo check).
3. `validateDraftItemProducts` calls repo for each productId and succeeds when all valid.
4. `validateDraftItemProducts` throws `NotFoundException` when product validation fails.
5. `computeDraftItems` computes totals and preserves description/productId mapping.
6. `computeDraftItems` maps missing `productId` to `null`.
7. `sumItemTotals` returns Decimal subtotal for multiple computed items.
8. `normalizeIssueDateToUtcStart` sets UTC hour/min/sec/ms to zero.
9. Consistency check: `sumItemTotals(computeDraftItems(items))` matches expected numeric subtotal.

## 4) Mocking/stubbing approach
- No Nest testing module and no DB.
- Plain Jest mocks:
  - repository stub with `productBelongsToCompany: jest.fn()`
  - translation stub with `translate: jest.fn()`

## 5) Exact files likely to be created/changed
- `hesba-api-v1/src/modules/invoices/use-cases/invoice-draft-preparation.util.spec.ts` (new)
- `study-docs/42_invoice_util_test_verification.md` (new)
- `study-docs/43_invoice_util_test_change_log.md` (new)

## 6) Risks / non-goals
- Non-goal: integration tests, Prisma/database wiring, controller/service tests.
- Non-goal: changing production behavior.
- Risk: none significant; pure utility-level tests only.
