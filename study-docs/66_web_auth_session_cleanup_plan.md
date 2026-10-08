# 66 - Web Auth Session Cleanup Plan

Date: 2026-04-01
Scope: first narrow structural cleanup pass for web auth/session

## 1) Exact files proposed for change
- `hesba-dashboard/src/lib/auth/server.ts`
- `study-docs/67_web_auth_session_cleanup_verification.md` (new)
- `study-docs/68_web_auth_session_cleanup_change_log.md` (new)

## 2) Exact cleanup actions
1. Add a single shared helper in `server.ts` to parse expiry strings (`d/h/m/s`) into seconds.
2. Replace duplicated inline `parseExpiry` functions in:
- `setAuthCookies(...)`
- `refreshAccessToken(...)`
3. Keep fallback behavior identical to current logic.

## 3) Intended behavioral impact
- Intended impact: none (internal readability/maintainability only).
- Cookie maxAge values and refresh/session behavior remain unchanged.

## 4) Risk assessment
- Low risk: internal helper extraction in one file.
- Main risk: subtle fallback mismatch; mitigated by preserving same defaults and unit-by-unit mapping.

## 5) Rollback notes
- Revert `src/lib/auth/server.ts` to previous version.
- No API/backend contract or routing rollback required.

## 6) Verification plan
- Run `npm run build` in `hesba-dashboard` (includes i18n check + Next build).
- If full build becomes impractical due environment constraints, document limitation and run strongest available static check.
