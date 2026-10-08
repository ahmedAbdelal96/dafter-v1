# 65 - Web Auth Session Structural Audit

Date: 2026-04-01
Scope: `hesba-dashboard` web auth/session structure
Product: Hesba

## 1) High-level web auth/session flow summary
- Route gating is handled in `src/proxy.ts` using auth cookies + role classification.
- Server-side auth core is in `src/lib/auth/server.ts` (cookies, session read, refresh, clear).
- Server actions in `src/lib/auth/actions.ts` orchestrate login/register/logout and set/clear cookies.
- Guards in `src/lib/auth/guards.ts` enforce authenticated/role/permission redirects in server paths.
- Client-side state exists in `src/stores/auth-store.ts` and hooks/service code under `src/lib/api`.

## 2) Key files/functions/modules involved
- `src/proxy.ts`
- `src/lib/auth/server.ts`
- `src/lib/auth/actions.ts`
- `src/lib/auth/guards.ts`
- `src/lib/auth/constants.ts`
- `src/lib/api/services/auth.ts`
- `src/lib/api/hooks/use-auth.ts`
- `src/app/api/auth/refresh/route.ts`

## 3) Responsibility map
- `proxy.ts`: request-time redirect/protection and role routing.
- `server.ts`: cookie/session primitives and refresh orchestration.
- `actions.ts`: auth endpoint calls + server action side effects.
- `guards.ts`: server component/action-level authorization helpers.

## 4) Structural smells found
1. Expiry parsing logic is duplicated in `server.ts` (`setAuthCookies` and `refreshAccessToken`).
2. `server.ts` contains mixed concerns (cookie operations + refresh request orchestration), making local reasoning denser.
3. Legacy cookie naming (`dafter_*`) remains, but changing it is high-risk/out of scope.

## 5) Top cleanup opportunities
1. Extract one shared expiry parser helper in `server.ts` to remove duplication.
2. (Deferred) Isolate refresh-response cookie write logic into a dedicated helper.
3. (Deferred) Gradual naming cleanup strategy for legacy cookie keys with compatibility migration.

## 6) Recommended narrow scope for this pass
- One focused cleanup only: unify duplicated expiry parsing logic in `src/lib/auth/server.ts`.
- Keep runtime behavior unchanged.

## 7) Confidence level
- High confidence for this narrow cleanup.
