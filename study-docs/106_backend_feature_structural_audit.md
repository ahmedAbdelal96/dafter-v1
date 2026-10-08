# 106 Backend Feature Structural Audit (Customers)

## 1) Selected module and why
- Selected module: `hesba-api-v1/src/modules/customers`.
- Reason: It is a non-auth, real business module with existing layered structure (`controller -> service -> use-cases -> repository`) and a clear low-risk cleanup opportunity in list/query orchestration.

## 2) High-level module flow summary
- `CustomersController` exposes customer endpoints and wraps responses.
- `CustomersService` acts as a thin facade that delegates to use-cases.
- Use-cases handle business orchestration per action (`create`, `list`, `get`, `update`, `delete`, overdue, snapshot, frequent-products).
- `CustomersRepository` handles Prisma data access and query execution.

## 3) Key files/functions/classes involved
- `src/modules/customers/customers.controller.ts`
- `src/modules/customers/customers.service.ts`
- `src/modules/customers/use-cases/list-customers.use-case.ts`
- `src/modules/customers/customers.repository.ts`
- `src/modules/customers/dto/customer-query.dto.ts`

## 4) Responsibility map
- Controller: route mapping, guards/decorators, basic query parsing for some routes, response envelope.
- Service: delegation-only facade.
- List use-case: maps DTO query to repository params, invokes repository, shapes pagination meta.
- Repository: pagination/search/filter SQL construction via Prisma + mapping balance data.

## 5) Structural smells found
- `list-customers.use-case.ts` mixes two responsibilities inline:
  - translating incoming query DTO to repository params
  - building response pagination meta.
- This makes `execute(...)` less explicit and slightly harder to scan/maintain compared to other use-cases.
- Controller still has manual parsing in some endpoints (`overdue`, `frequent-products`), but changing this now is less valuable than tightening the list use-case hotspot.

## 6) Top cleanup opportunities
1. Extract query-to-repository mapping in list use-case to a dedicated private helper.
2. Extract pagination-meta construction in list use-case to a dedicated private helper.
3. Add local explicit types for mapped params/meta to improve readability and reduce implicit shape coupling.
4. (Deferred) Normalize controller-level `limit` parsing helpers for overdue/frequent-products routes.

## 7) Recommended narrow scope for this pass
- Apply one focused cleanup in `list-customers.use-case.ts` only:
  - private helper for query param mapping
  - private helper for pagination meta shaping
  - no behavioral/API contract change.

## 8) Confidence level
- High confidence for the scoped cleanup (pure structural clarity, same inputs/outputs).
- Medium confidence for broader controller parsing cleanup (deferred to avoid widening scope).
