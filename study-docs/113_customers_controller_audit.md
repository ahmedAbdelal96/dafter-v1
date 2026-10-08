# 113 Customers Controller Boundary Audit

## 1) Current controller responsibilities
- Exposes HTTP endpoints for customers (`create`, `list`, `get`, `update`, `delete`, `overdue`, `snapshot`, `frequent-products`).
- Applies guards/permissions/feature decorators.
- Converts HTTP input (`@Query`, `@Param`, `@Body`) into service calls.
- Wraps responses in `ApiResponseDto`.

## 2) Where parsing/normalization currently happens
- `GET /customers` uses `CustomerQueryDto` directly (clean DTO boundary).
- `GET /customers/overdue` performs inline query parsing:
  - `sort` normalization (`age` or fallback `amount`)
  - `limit` parsing/clamp (`Math.min(parseInt(limit, 10) || 20, 100)`).
- `GET /customers/:id/frequent-products` performs inline `limit` parsing:
  - `parseInt(limit, 10) || 8`.

## 3) Structural smells found
- Manual parsing in controller for two endpoints.
- Duplicated coercion pattern for `limit` parsing.
- Parsing defaults are embedded inline, making controller boundary logic less explicit.
- Minor hidden coercion risk remains (e.g. `parseInt` + `||` behavior), but this is existing behavior and should be preserved in this pass.

## 4) Top cleanup opportunities
1. Extract `limit` parsing into small private controller helpers to centralize intent.
2. Keep endpoint methods focused on HTTP-to-service orchestration.
3. Make default values and clamp policy visibly named in one place.
4. (Deferred) Move some query parsing to DTO/Pipe if behavior contract can be validated safely.

## 5) Recommended narrow scope for this pass
- Update `customers.controller.ts` only:
  - replace inline `limit` parsing in `overdue` and `frequent-products` with private helper methods.
  - preserve exact existing parsing semantics and defaults.

## 6) Confidence level
- High confidence for this small boundary cleanup (single-file, same formulas, no contract change).
