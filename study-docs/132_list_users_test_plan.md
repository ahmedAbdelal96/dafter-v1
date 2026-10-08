# 132 ListUsersUseCase Test Plan

## 1) What ListUsersUseCase currently does
- Accepts `companyId` and `UserQueryDto`.
- Applies default pagination when omitted:
  - `page = 1`
  - `limit = 10`
- Maps query fields to repository params (`search`, `status`, `sortBy`, `sortOrder`).
- Calls `UsersRepository.findMany(companyId, params)`.
- Shapes output as:
  - `items` from repository `users`
  - `meta` with `total`, `page`, `limit`, `totalPages`, `hasNext`, `hasPrevious`.

## 2) Highest-priority behaviors to test
1. Correct mapping of explicit query fields into repository params.
2. Correct defaults when optional query fields are omitted.
3. Correct pagination meta computation.
4. Correct pass-through of repository `users` to returned `items`.
5. Correct behavior when repository returns empty results.
6. Correct status filter pass-through (if provided).

## 3) Proposed mock/stub strategy
- Pure unit tests with mocked repository (`findMany: jest.fn()`).
- Instantiate `ListUsersUseCase` directly.
- No DB/Prisma/Nest integration setup.

## 4) Proposed test cases
1. Explicit query mapping + items/meta return.
2. Defaults mapping when query is empty.
3. Empty result behavior with deterministic meta.
4. Status/search/sort pass-through mapping.

## 5) Exact files likely to be created/changed
- Create: `hesba-api-v1/src/modules/users/use-cases/list-users.use-case.spec.ts`
- Create: `study-docs/132_list_users_test_plan.md`
- Create: `study-docs/133_list_users_test_verification.md`
- Create: `study-docs/134_list_users_test_change_log.md`

## 6) Risks / non-goals
- Non-goal: repository/Prisma query behavior validation.
- Non-goal: HTTP controller response envelope validation.
- Risk: low; tests validate use-case contract only.
