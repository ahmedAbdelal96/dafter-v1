# 116 Customers Controller Cleanup Change Log

## Files changed
1. `hesba-api-v1/src/modules/customers/customers.controller.ts`
- Improvement applied:
  - Replaced duplicated inline `limit` parsing with private helpers:
    - `parseLimitOrDefault(...)`
    - `parseOverdueLimit(...)`
    - `parseFrequentProductsLimit(...)`
- Why:
  - Clarify controller boundary and keep endpoint methods focused on HTTP-to-service orchestration.
  - Reduce parsing duplication while preserving runtime behavior.
- Behavioral impact:
  - None intended (same formulas/defaults retained).

2. `study-docs/113_customers_controller_audit.md`
- Created module boundary audit and cleanup opportunity analysis.

3. `study-docs/114_customers_controller_cleanup_plan.md`
- Created narrow plan and verification strategy.

4. `study-docs/115_customers_controller_cleanup_verification.md`
- Created verification report with command outcomes and limitations.

5. `study-docs/116_customers_controller_cleanup_change_log.md`
- This file.

## Intentionally deferred
- No DTO redesign for overdue/frequent-products query parsing.
- No broad controller refactor.
- No HTTP/e2e tests were added in this pass.
- No cleanup of legacy/mojibake comments in controller.

## Recommended follow-up
1. Add a small controller-level unit/e2e test for `limit` parsing behavior in `overdue` and `frequent-products`.
2. Consider a separate narrow readability pass for legacy comment encoding issues.
