# Mobile Auth Store Flow Test Change Log (Pass 2)

## Files Updated
1. `hesba-dashboard-mobile/src/stores/auth-store.spec.ts`
   - Extended suite with focused initialize/login flow tests.
   - Added deterministic mocks for token presence, auth API responses, tenant hydration success/failure, and login failure message propagation.

2. `hesba-dashboard-mobile/src/stores/auth-store.ts`
   - Tiny production adjustment in `initialize` no-token branch:
     - clear stale in-memory auth residue by applying unauthenticated state before early return.
   - Behavioral intent preserved; fix aligns with existing cleanup goal and prevents stale session leakage.

3. `study-docs/80_mobile_auth_store_flow_test_plan.md`
4. `study-docs/81_mobile_auth_store_flow_test_verification.md`
5. `study-docs/82_mobile_auth_store_flow_test_change_log.md`

## What Behaviors Are Now Protected
1. initialize success path sets authenticated user + tenant and marks initialized.
2. initialize no-token path ends unauthenticated and initialized.
3. login success path authenticates and hydrates tenant when company fetch succeeds.
4. login success fallback retains login tenant when company fetch fails.
5. login failure stores backend message, stops loading, and keeps unauthenticated state.
6. previously covered reset paths remain protected.

## What Remains Untested
1. initialize: user success + company fetch failure (authenticated with null tenant).
2. login: fallback default message branch when backend message is missing.
3. callback-driven session-expiry flow integration with client interceptor.

## Recommended Follow-Up
1. Add one tiny test for `initialize` with company fetch rejection while `getMe` succeeds.
2. Add one tiny test for login error fallback message (no `response.data.message`).
3. Keep tests focused on store orchestration (no device/E2E in this layer).
