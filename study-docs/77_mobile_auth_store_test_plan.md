# Mobile Auth Store Unit Test Plan

## 1) Current `auth-store` Responsibilities
File: `hesba-dashboard-mobile/src/stores/auth-store.ts`

- Initializes auth session on app boot (`initialize`) via `tokenStore.load`, `tokenStore.isAuthenticated`, `authApi.getMe`, and optional company fetch.
- Handles login orchestration and tenant hydration.
- Handles logout finalization and always clears local token/session state.
- Handles session-expired local reset via `clearSession`.
- Uses shared unauthenticated state builder (`buildUnauthenticatedState`) introduced in the recent structural cleanup.

## 2) Highest-Priority Behaviors To Test
1. `initialize` failure path resets to unauthenticated state and marks initialization complete.
2. `clearSession` resets state consistently and clears local token persistence.
3. `logout` finalization resets state consistently even if API logout fails.
4. Repeated reset paths preserve the same core unauthenticated shape (`user`, `tenant`, `isAuthenticated`).

## 3) Mock/Stub Strategy
- Mock `@/lib/api/auth.api`.
- Mock `@/lib/api/client` (default `apiClient`, `tokenStore`, `registerSessionExpiredHandler`).
- Mock `@/lib/api/config` with minimal `API_ENDPOINTS.companies.me` value.
- Use mock-only unit tests (no emulator/device, no network, no backend).

## 4) Proposed Test Cases
1. `initialize` should clear tokens and end in unauthenticated state when `authApi.getMe` rejects.
2. `clearSession` should clear local tokens and set `isInitialized: true`, `error: null`, unauthenticated state.
3. `logout` should clear local tokens and set unauthenticated state even when `authApi.logout` rejects.
4. Core unauthenticated fields should be consistent across initialize-failure, logout, and clearSession paths.

## 5) Exact Files Likely To Be Created/Changed
1. `hesba-dashboard-mobile/src/stores/auth-store.spec.ts` (new)
2. `hesba-dashboard-mobile/package.json` (add narrow unit test script)
3. `hesba-dashboard-mobile/jest.config.cjs` (new minimal test config)
4. `study-docs/77_mobile_auth_store_test_plan.md` (new)
5. `study-docs/78_mobile_auth_store_test_verification.md` (new)
6. `study-docs/79_mobile_auth_store_test_change_log.md` (new)

## 6) Risks / Non-Goals
- Non-goal: broad mobile auth refactor.
- Non-goal: device/emulator/E2E verification.
- Risk: adding minimal test runner config may surface unrelated lint warnings; mitigation is to keep scope limited to unit-test execution and document limits clearly.
