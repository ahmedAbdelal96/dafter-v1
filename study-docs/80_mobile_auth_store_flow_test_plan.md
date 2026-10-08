# Mobile Auth Store Flow Test Plan (Pass 2)

## 1) What `initialize` Currently Does
1. Loads tokens from `tokenStore.load()`.
2. If no token (`tokenStore.isAuthenticated() === false`), exits early.
3. If token exists, fetches current user (`authApi.getMe`) and company profile (`apiClient.get(API_ENDPOINTS.companies.me)`) in parallel.
4. On success, sets authenticated state (`user`, `tenant`, `isAuthenticated: true`).
5. On failure, clears local tokens and resets unauthenticated state.
6. Always sets `isInitialized: true` and registers session-expired callback in `finally`.

## 2) What `login` Currently Does
1. Sets `isLoading: true` and clears error.
2. Calls `authApi.login(credentials)`.
3. If `companyId` exists, attempts to fetch full company profile; falls back to minimal tenant if company fetch fails.
4. Sets authenticated state (`user`, `tenant`, `isAuthenticated: true`, `error: null`).
5. On failure, maps API error message (or fallback Arabic message), stores it in `error`, and rethrows.
6. Always sets `isLoading: false` in `finally`.

## 3) Highest-Priority Remaining Branches
1. `initialize` success with valid token and hydrated user/tenant.
2. `initialize` no-token branch (and stale authenticated residue prevention).
3. `login` success path with company hydration.
4. `login` success fallback when company fetch fails.
5. `login` failure path with explicit message propagation and no auth residue.

## 4) Mock/Stub Strategy
- Reuse current Jest setup and existing mocks.
- Mock `authApi.getMe/login` and `clientModule.default.get` responses per test.
- Mock `tokenStore.isAuthenticated()` for token/no-token branches.
- Seed Zustand store state explicitly per scenario for deterministic assertions.

## 5) Proposed Test Cases
1. initialize success -> sets authenticated user+tenant and marks initialized.
2. initialize no-token -> keeps/forces unauthenticated state and marks initialized.
3. login success (company fetch success) -> sets authenticated state with hydrated tenant.
4. login success (company fetch failure) -> still authenticates using login response tenant fallback.
5. login failure -> sets mapped error, resets loading, keeps unauthenticated state.

## 6) Exact Files Likely To Change
1. `hesba-dashboard-mobile/src/stores/auth-store.spec.ts`
2. `study-docs/80_mobile_auth_store_flow_test_plan.md`
3. `study-docs/81_mobile_auth_store_flow_test_verification.md`
4. `study-docs/82_mobile_auth_store_flow_test_change_log.md`
5. `hesba-dashboard-mobile/src/stores/auth-store.ts` only if a tiny behavior-safe fix is required by high-confidence test evidence.

## 7) Risks / Non-Goals
- Non-goal: broad auth refactor or runtime contract changes.
- Non-goal: device/emulator/E2E verification.
- Risk: no-token initialize branch may reveal stale-state ambiguity; if confirmed, apply only the smallest safe fix.
