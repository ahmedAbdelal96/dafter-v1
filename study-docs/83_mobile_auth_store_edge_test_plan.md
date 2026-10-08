# Mobile Auth Store Edge Test Plan (Final Hardening Pass)

## 1) Remaining Edge Cases To Cover
1. `initialize` success + company fetch failure:
   - user should stay authenticated
   - tenant should follow current implemented behavior (currently `null`).
2. `login` failure fallback message branch:
   - when `response.data.message` is missing, store should use the current fallback error message.
3. session-expired callback behavior (mock-level):
   - callback registered via `registerSessionExpiredHandler` should clear/reset auth state through `clearSession` behavior.

## 2) Proposed Mock/Stub Strategy
- Reuse existing Jest mock setup in `auth-store.spec.ts`.
- Drive branch behavior by controlling:
  - `tokenStore.isAuthenticated`
  - `authApi.getMe` / `authApi.login`
  - `apiClient.get`
  - captured callback from `registerSessionExpiredHandler.mock.calls`.

## 3) Proposed Test Cases (2-4 total)
1. initialize with valid token + user success + company fetch reject -> authenticated user + `tenant: null`.
2. login failure without backend message -> fallback message is set and auth residue is not created.
3. captured session-expired callback invocation -> state reset and token clear path is triggered.

## 4) Exact Files Likely To Change
1. `hesba-dashboard-mobile/src/stores/auth-store.spec.ts`
2. `study-docs/83_mobile_auth_store_edge_test_plan.md`
3. `study-docs/84_mobile_auth_store_edge_test_verification.md`
4. `study-docs/85_mobile_auth_store_edge_test_change_log.md`
5. `hesba-dashboard-mobile/src/stores/auth-store.ts` only if tests prove a real, high-confidence issue.

## 5) Risks / Non-Goals
- Non-goal: broad auth store redesign.
- Non-goal: emulator/device/E2E coverage.
- Risk: fallback-message assertion may be sensitive to literal text encoding; mitigation is to assert exact current fallback behavior from runtime value and keep scope minimal.
