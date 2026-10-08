# Mobile Auth/Session Structural Audit (Pass 1)

## Scope
- Target app: `hesba-dashboard-mobile`
- Focus area: mobile auth/session flow around store state, SecureStore persistence, hydration, refresh-expiry handling, and role-based routing.

## High-Level Flow (Verified)
1. App boot runs `StoreHydration`, then calls `useAuthStore.getState().initialize()`.
2. `initialize()` loads token cache from `tokenStore.load()` and checks `tokenStore.isAuthenticated()`.
3. If authenticated, it validates user via `authApi.getMe()` and tries company profile via `GET /companies/me`.
4. On validation failure, local tokens are cleared and auth state is reset.
5. Axios client handles 401 refresh; on refresh failure it invokes `registerSessionExpiredHandler` callback, which triggers `clearSession()` in auth store.
6. Route layouts gate by `isInitialized` and `isAuthenticated`, and branch by role (`SUPER_ADMIN` routed to platform stack).

## Key Files / Responsibilities
- `hesba-dashboard-mobile/src/stores/auth-store.ts`
  - Central auth state + orchestration (`initialize`, `login`, `logout`, `clearSession`).
- `hesba-dashboard-mobile/src/lib/api/client.ts`
  - Token store (`SecureStore`), request auth headers, refresh queue, session-expired callback trigger.
- `hesba-dashboard-mobile/src/lib/api/auth.api.ts`
  - Auth endpoint wrappers + envelope unwrapping.
- `hesba-dashboard-mobile/src/components/providers/StoreHydration.tsx`
  - Boot sequencing and auth initialization trigger.
- `hesba-dashboard-mobile/src/app/(auth)/_layout.tsx`
- `hesba-dashboard-mobile/src/app/(client)/_layout.tsx`
  - Auth/role-based route protection.

## Structural Smells Found
1. Session reset state is duplicated in multiple branches (`initialize` catch, `logout` finally, `clearSession`).
2. Auth store mixes local state reset details with repeated token-clearing intent, increasing maintenance risk.
3. `clearSession()` and `logout()` both implement similar local finalization semantics with slightly different inline object literals.
4. Naming is mostly clear, but unauthenticated reset intent is spread instead of centralized.

## Top Cleanup Opportunities (3-5)
1. Centralize unauthenticated state shaping into one helper used by `initialize`, `logout`, and `clearSession`.
2. Centralize “local session reset” sequencing for clarity (state reset semantics explicit in one place).
3. Optionally make session-expired handler registration intent more explicit (defer in this pass).

## Recommended Narrow Scope For This Pass
- Apply only opportunity #1 (and minimal part of #2) in `auth-store.ts`.
- No auth flow redesign, no token semantics changes, no route behavior changes.

## Confidence
- **High** for the selected cleanup scope and no-behavior-change expectation.
