# 110 ListCustomersUseCase Test Plan

## 1) Current ListCustomersUseCase behavior
- Receives `companyId` and `CustomerQueryDto`.
- Maps query input into repository params with defaults:
  - `page: 1`, `limit: 10`, `sortBy: createdAt`, `sortOrder: desc`.
- Calls `CustomersRepository.findMany(companyId, params)`.
- Returns:
  - `items` as repository `data` pass-through.
  - `meta` shaped from repository paging result:
    - `page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`.

## 2) Highest-priority behaviors to test
1. Query mapping correctness when all query fields are provided.
2. Default mapping correctness when optional query inputs are omitted.
3. Pagination meta correctness (`totalPages`, `hasNext`, `hasPrev`).
4. Item pass-through correctness from repository to use-case output.
5. Empty result behavior preserving shape and metadata consistency.

## 3) Proposed mock/stub strategy
- Use pure unit tests with a mocked repository object (`findMany: jest.fn()`).
- No DB, no Prisma, no Nest runtime bootstrap.
- Instantiate `ListCustomersUseCase` directly with the mocked repository.

## 4) Proposed test cases
1. Maps explicit query values to repository params and returns expected meta/items.
2. Applies default query values when query is empty and calls repository with defaults.
3. Returns correct meta for empty dataset (`items: []`, `hasNext: false`, `hasPrev` based on page).
4. Verifies `search`/`isActive` pass-through mapping when provided.

## 5) Exact files likely to be created/changed
- Create: `hesba-api-v1/src/modules/customers/use-cases/list-customers.use-case.spec.ts`
- Create: `study-docs/110_list_customers_test_plan.md`
- Create: `study-docs/111_list_customers_test_verification.md`
- Create: `study-docs/112_list_customers_test_change_log.md`

## 6) Risks / non-goals
- Non-goal: integration behavior with actual Prisma queries.
- Non-goal: controller-level query parsing.
- Risk: low; tests assert public execute behavior only, not private helper implementation details.
