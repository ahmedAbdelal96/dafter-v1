# Web useAuth Audit

## 1) Selected Auth-Derived-State Hook/File
- Selected file: `hesba-dashboard/src/lib/auth/context.tsx`
- Selected hook: `useAuth()` (reads `AuthContextValue` produced by `AuthProvider`).

## 2) What It Currently Returns
`useAuth()` returns `AuthContextValue` containing:
- `user`
- `tenant`
- `isLoading`
- `isAuthenticated`
- `login`
- `register`
- `logout`
- `refreshUser`

## 3) Derived/Memoized Outputs Exposed
- Derived output: `isAuthenticated` is derived from user presence.
- Action callbacks: `login/register/logout/refreshUser` are already wrapped with `useCallback`.
- Gap before this pass: context value object itself was reconstructed each render (no memoized value object boundary).

## 4) Likely Risks / Gaps
1. Lack of memoized context value can trigger broader consumer re-renders even when effective auth-derived outputs are unchanged.
2. Derived flag (`isAuthenticated`) was inline in value construction instead of explicit standalone derived state.
3. No dedicated web test runner is currently configured for narrow hook-unit tests in this project, limiting direct automated hook-level assertions in this pass.

## 5) Recommended Narrow Scope For This Pass
- Keep pass extremely narrow in `context.tsx` only:
  1. make `isAuthenticated` an explicit derived constant.
  2. memoize the provider value with `useMemo` for more stable `useAuth()` outputs.
- No auth flow logic changes.
- No provider/store architecture changes.

## 6) Confidence Level
- **High** for behavior-safe hardening with no contract changes.
