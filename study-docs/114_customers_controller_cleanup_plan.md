# 114 Customers Controller Cleanup Plan

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/customers/customers.controller.ts`
- `study-docs/113_customers_controller_audit.md` (created)
- `study-docs/114_customers_controller_cleanup_plan.md` (this file)
- `study-docs/115_customers_controller_cleanup_verification.md` (to be created)
- `study-docs/116_customers_controller_cleanup_change_log.md` (to be created)

## 2) Exact cleanup actions
- In `CustomersController`:
  - extract `limit` parsing into private helper(s).
  - replace inline `parseInt`/`Math.min` calls in:
    - `listOverdue(...)`
    - `getFrequentProducts(...)`
- Preserve exact current defaults/coercion behavior.

## 3) Intended behavioral impact
- None intended.
- External API contract, endpoint signatures, and effective runtime defaults remain unchanged.

## 4) Risk assessment
- Low risk:
  - single-file, local refactor.
  - no DTO or service signature changes.
- Main risk: accidental behavior drift in parsing formulas.

## 5) Rollback notes
- Rollback is straightforward by restoring previous inline parsing in both endpoints.

## 6) Verification plan
1. Run `npm run build` in `hesba-api-v1`.
2. Run targeted list use-case tests to ensure no unintended ripple.
3. Validate resulting controller code still applies same limit formulas.
