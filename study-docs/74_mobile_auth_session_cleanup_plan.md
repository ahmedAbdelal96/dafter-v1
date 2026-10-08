# Mobile Auth/Session Cleanup Plan (Pass 1)

## Files Proposed For Change
1. `hesba-dashboard-mobile/src/stores/auth-store.ts`
2. `study-docs/73_mobile_auth_session_structural_audit.md` (already created in this pass)
3. `study-docs/75_mobile_auth_session_cleanup_verification.md` (to be created)
4. `study-docs/76_mobile_auth_session_cleanup_change_log.md` (to be created)

## Exact Cleanup Actions
1. Add a small local helper in `auth-store.ts` to produce/assign the unauthenticated state shape consistently.
2. Replace repeated inline unauthenticated `set({...})` payloads in:
   - `initialize` failure path
   - `logout` finalization path
   - `clearSession`
3. Preserve existing token-clearing semantics (including best-effort API logout behavior).

## Intended Behavioral Impact
- Expected behavior change: **none**.
- Goal is structure/readability/maintainability only.

## Risk Assessment
- Low risk: isolated to one store file and internal state-shaping logic.
- Main risk: accidental omission of a field in one branch; mitigated by shared helper.

## Rollback Notes
- Revert `hesba-dashboard-mobile/src/stores/auth-store.ts` to previous version.
- No schema/config/runtime migration required.

## Verification Plan
1. Run practical static verification for mobile app (`npm run lint` in `hesba-dashboard-mobile`).
2. Validate imports/types compile through lint pipeline.
3. Confirm no auth flow files outside planned scope were changed.
4. Document limits (no full runtime device E2E in this pass).
