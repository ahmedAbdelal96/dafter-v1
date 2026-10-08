# 54 - Auth Session Structural Audit

Date: 2026-04-01
Scope: backend auth/session structure in `hesba-api-v1`
Product: Hesba

## 1) High-level backend auth/session flow
- Entry points are in `src/modules/auth/auth.controller.ts` (`login`, `refresh`, `logout`, `logout-all`, profile/session endpoints).
- `AuthService` is a thin facade delegating each endpoint to a specific use-case.
- Token lifecycle:
  - access token: JWT from `TokenService`
  - refresh token: random token, SHA-256 hash persisted via `AuthRepository`
  - rotation: `RefreshTokenUseCase` revokes old token then issues/stores a new pair
- Session visibility/revocation is backed by refresh-token records (`findActiveSessions`, `revokeRefreshToken`, `revokeAllUserTokens`).

## 2) Key classes/files/functions involved
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/services/token.service.ts`
- `src/modules/auth/auth.repository.ts`
- `src/modules/auth/use-cases/login.use-case.ts`
- `src/modules/auth/use-cases/refresh-token.use-case.ts`
- `src/modules/auth/use-cases/logout.use-case.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`

## 3) Responsibility map
- Controller: HTTP contracts, guards/decorators, response wrapping.
- Service facade: endpoint-to-use-case delegation only.
- Use-cases: orchestration and auth/session decision flow.
- TokenService: token generation + hashing + refresh persistence orchestration.
- Repository: raw DB reads/writes for users/tokens/reset flows.

## 4) Structural smells found
1. `RefreshTokenUseCase.execute(...)` had multiple responsibilities in one long method (lookup, security checks, user/company checks, rotation).
2. Auth/session decision sequencing was correct but not explicit enough in named boundaries.
3. Limited direct auth use-case test coverage existed for refresh-token branch behavior prior to this pass.
4. Some legacy naming/comments still exist in shared type headers (cosmetic; out of scope).

## 5) Top cleanup opportunities
1. Split refresh-token flow into typed internal validation steps.
2. Introduce explicit local types for stored token / user meta inside refresh flow.
3. Add focused unit tests for refresh-token security branches.
4. (Deferred) Add similar structural decomposition for login lockout logic if needed later.

## 6) Recommended narrow scope for this pass
- Touch only refresh-token use-case structure and add focused tests for it.
- Keep auth endpoints/contracts/token semantics unchanged.

## 7) Confidence level
- High confidence for this narrow scope.
