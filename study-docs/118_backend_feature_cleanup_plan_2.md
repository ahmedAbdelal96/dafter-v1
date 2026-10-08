# 118 Backend Feature Cleanup Plan (Pass 2)

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/suppliers/use-cases/list-suppliers.use-case.ts`
- `study-docs/117_backend_feature_structural_audit_2.md` (created)
- `study-docs/118_backend_feature_cleanup_plan_2.md` (this file)
- `study-docs/119_backend_feature_cleanup_verification_2.md` (to be created)
- `study-docs/120_backend_feature_cleanup_change_log_2.md` (to be created)

## 2) Exact cleanup actions
- In `ListSuppliersUseCase`:
  - extract query mapping to repository params into a dedicated private helper.
  - extract pagination meta building into a dedicated private helper.
  - add small local types for readability and explicit boundaries.

## 3) Intended behavioral impact
- Intended impact: none.
- API output shape remains `{ items, meta }`.
- Pagination and filtering behavior remains unchanged.

## 4) Risk assessment
- Low risk due to single-file local refactor.
- Main risk: accidental default/field mapping drift.

## 5) Rollback notes
- Rollback by reverting `list-suppliers.use-case.ts` to previous inline mapping/meta implementation.

## 6) Verification plan
1. Run backend build: `npm run build` in `hesba-api-v1`.
2. Run targeted suppliers test: `create-supplier.use-case.spec.ts` as regression sanity check.
3. Confirm use-case return structure remains unchanged.
