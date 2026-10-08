# Web useAuth Plan

## 1) Exact Files Proposed For Change
1. `hesba-dashboard/src/lib/auth/context.tsx`
2. `study-docs/98_web_useauth_audit.md`
3. `study-docs/100_web_useauth_verification.md`
4. `study-docs/101_web_useauth_change_log.md`

## 2) Exact Hardening Action
1. Add explicit derived constant: `isAuthenticated = Boolean(user)`.
2. Wrap `AuthContext` value object in `useMemo` so `useAuth()` consumers receive a stable value object boundary when dependencies do not change.

## 3) Intended Behavioral Impact
- Intended behavior change: **none**.
- Only referential/output stability hardening for context value construction.

## 4) Risk Assessment
- Very low risk (local change in context value composition only).
- No API/server contract impact.

## 5) Rollback Notes
- Revert `context.tsx` to previous value construction style.
- No migrations/config changes required.

## 6) Verification Plan
1. Run `npm run build` in `hesba-dashboard`.
2. Optionally run lint if needed; build includes type safety and compile validation.
3. Document limitation around lack of dedicated hook test runner in current setup.
