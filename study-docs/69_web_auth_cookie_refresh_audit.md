# 69 - Web Auth Cookie/Refresh Structural Audit

Date: 2026-04-01
Scope: `hesba-dashboard/src/lib/auth/server.ts`
Product: Hesba

## 1) Current cookie-writing flow summary
- `setAuthCookies(...)` writes:
  - access token cookie
  - refresh token cookie
  - user-data cookie
  - role cookie
- Cookie max-age is derived from expiry string parsing with shared helper.

## 2) Current refresh sequencing summary
- `refreshAccessToken()`:
  1. loads refresh token from cookie
  2. applies single-flight dedupe (`refreshInFlight`)
  3. calls backend refresh endpoint
  4. parses response token payload
  5. validates `accessToken` presence
  6. writes updated auth cookies
  7. returns success/failure and clears in-flight map

## 3) Which parts still mixed responsibilities
- Refresh function still combined parse/validate/write details inline with network flow.
- Cookie write details after refresh lived inside refresh orchestration block, reducing readability.

## 4) Highest-confidence cleanup opportunity
- Extract post-refresh cookie writing into a dedicated local helper so refresh flow becomes:
  - fetch -> parse -> validate -> write helper -> return

## 5) Recommended narrow scope for this pass
- Modify only `src/lib/auth/server.ts`.
- Introduce one helper for writing refreshed cookies from parsed token payload.
- Preserve all existing cookie keys/options/expiry fallback behavior.

## 6) Confidence level
- High confidence for narrow, behavior-safe structural cleanup.
