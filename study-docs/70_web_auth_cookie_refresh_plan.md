# 70 - Web Auth Cookie/Refresh Cleanup Plan

Date: 2026-04-01
Scope: second narrow structural pass in web auth server helper

## 1) Exact files proposed for change
- `hesba-dashboard/src/lib/auth/server.ts`
- `study-docs/71_web_auth_cookie_refresh_verification.md` (new)
- `study-docs/72_web_auth_cookie_refresh_change_log.md` (new)

## 2) Exact cleanup actions
1. Add local type for parsed refresh token payload.
2. Extract cookie-write sequence after refresh into one helper:
- write access token cookie
- optionally write refresh token cookie
- use existing expiry parser and options/constants
3. Replace inline cookie writes in `refreshAccessToken()` with helper call.

## 3) Intended behavioral impact
- None intended.
- Refresh success/failure behavior, cookie names/options, and API contract remain unchanged.

## 4) Risk assessment
- Low risk: internal refactor in one file.
- Main risk: accidentally changing write conditions; mitigated by preserving same guard (`accessToken` required before write, refresh optional).

## 5) Rollback notes
- Revert `src/lib/auth/server.ts` to previous revision.
- No backend/API changes required.

## 6) Verification plan
- Run `npm run build` in `hesba-dashboard`.
- Confirm no import/path regressions and successful type/build output.
