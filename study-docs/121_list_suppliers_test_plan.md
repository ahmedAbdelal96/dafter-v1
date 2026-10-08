# 121 ListSuppliersUseCase Test Plan

## 1) What ListSuppliersUseCase currently does
- Accepts `companyId` and `SupplierQueryDto`.
- Maps query DTO fields into repository params passed to `repo.findMany(...)`.
- Applies default values when omitted:
  - `page: 1`
  - `limit: 20`
- Returns normalized use-case output:
  - `items` (pass-through from `data`)
  - `meta` with `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`.

## 2) Highest-priority behaviors to test
1. Explicit query mapping into repository params.
2. Default mapping when optional query fields are omitted.
3. Correct meta shaping from repository paging result.
4. Correct item pass-through behavior.
5. Empty-result behavior remains deterministic.

## 3) Proposed mock/stub strategy
- Use pure unit tests with mocked `SuppliersRepository` (`findMany` only).
- Instantiate `ListSuppliersUseCase` directly.
- No Prisma, no DB, no integration bootstrap.

## 4) Proposed test cases
1. Maps explicit query fields and returns expected items/meta.
2. Applies defaults when query is empty (`page=1`, `limit=20`).
3. Produces correct empty result shape/meta.
4. Preserves search/filter/sort mapping fields when provided.

## 5) Exact files likely to be created/changed
- Create: `hesba-api-v1/src/modules/suppliers/use-cases/list-suppliers.use-case.spec.ts`
- Create: `study-docs/121_list_suppliers_test_plan.md`
- Create: `study-docs/122_list_suppliers_test_verification.md`
- Create: `study-docs/123_list_suppliers_test_change_log.md`

## 6) Risks / non-goals
- Non-goal: validating repository/Prisma runtime behavior.
- Non-goal: controller-level query parsing behavior.
- Risk: low; tests focus on `execute(...)` input/output contract only.
