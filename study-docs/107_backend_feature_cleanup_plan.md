# 107 Backend Feature Cleanup Plan

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/customers/use-cases/list-customers.use-case.ts`
- `study-docs/106_backend_feature_structural_audit.md` (created)
- `study-docs/107_backend_feature_cleanup_plan.md` (this file)
- `study-docs/108_backend_feature_cleanup_verification.md` (to be created after verification)
- `study-docs/109_backend_feature_cleanup_change_log.md` (to be created after completion)

## 2) Exact cleanup actions
- In `ListCustomersUseCase`:
  - Extract query mapping into a private helper (DTO -> repository params).
  - Extract pagination meta shaping into a private helper.
  - Add small local types for helper return shapes.
  - Keep repository call and returned response contract identical.

## 3) Intended behavioral impact
- Intended impact: none.
- External API behavior, payload shape, pagination semantics, and defaults remain unchanged.

## 4) Risk assessment
- Low risk:
  - Refactor is internal to one use-case.
  - No controller/repository/database schema change.
  - No DTO contract change.
- Main risk: accidental mismatch in defaults (`page`, `limit`, `sortBy`, `sortOrder`) during extraction.

## 5) Rollback notes
- Single-file rollback possible by reverting `list-customers.use-case.ts` to previous inline mapping/meta construction.

## 6) Verification plan
1. Run backend build: `npm run build` in `hesba-api-v1`.
2. Run a targeted customers unit test if practical (existing `create-customer` spec) to confirm no broad side effect.
3. Confirm no API contract change by comparing returned structure in use-case code (`{ items, meta }`).
