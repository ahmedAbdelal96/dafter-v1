# 61 - Login UseCase Structural Audit

Date: 2026-04-01
Scope: `hesba-api-v1/src/modules/auth/use-cases/login.use-case.ts`
Product: Hesba

## 1) High-level current login flow
- Normalize email.
- Check lockout attempts in cache.
- Resolve credentials (find user + verify password).
- Enforce user/company eligibility.
- Issue access/refresh tokens.
- Clear failed-attempt counter on success.

## 2) Key responsibilities inside LoginUseCase
- Security gating (lockout and invalid-credential handling).
- Eligibility checks (user status + company status).
- Token issuance orchestration with remember-me metadata.
- Failed-attempt side effects (increment on invalid credentials, clear on success).

## 3) Structural smells found (before cleanup)
1. `execute(...)` mixed many concerns inline (lookup, credential checks, eligibility checks, token payload shaping, response shaping).
2. Invalid-credential handling logic duplicated for both user-not-found and password mismatch branches.
3. Security-relevant sequencing was correct but visually dense in one method.
4. JWT payload/user-response construction lived inline, increasing mental load.

## 4) Top cleanup opportunities
1. Extract credential resolution path into a dedicated private method.
2. Extract user/company eligibility checks into a dedicated private method.
3. Centralize invalid-credential failure behavior in one helper.
4. Extract payload/response builders for explicit shaping boundaries.

## 5) Recommended narrow scope for this pass
- Refactor `login.use-case.ts` internally only.
- Keep flow order and side effects identical.
- Reuse existing tests as safety net; no broad auth changes.

## 6) Confidence level
- High confidence for narrow behavior-safe structural cleanup.
