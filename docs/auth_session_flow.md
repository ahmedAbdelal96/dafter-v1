# Auth & Session Flow

Date: 2026-04-01
Scope: current implemented model only (code-grounded)

## 1) Backend Auth Building Blocks (Verified)
- Auth module entry: `hesba-api-v1/src/modules/auth/auth.module.ts`
- Route layer: `hesba-api-v1/src/modules/auth/auth.controller.ts`
- Service/use-case orchestration: `hesba-api-v1/src/modules/auth/auth.service.ts`
- JWT validation: `hesba-api-v1/src/modules/auth/strategies/jwt.strategy.ts`
- Token generation/refresh primitives: `hesba-api-v1/src/modules/auth/services/token.service.ts`
- Session/refresh persistence and revocation: `hesba-api-v1/src/modules/auth/auth.repository.ts`
- Route protection primitive: `hesba-api-v1/src/common/guards/jwt-auth.guard.ts`

Confirmed model:
1. Login/register return user + token payload (wrapped in `ApiResponseDto`).
2. Access token is JWT bearer.
3. Refresh token is generated, hashed, stored server-side, and rotated/revoked through auth repository/service paths.
4. Protected endpoints use `JwtAuthGuard` (Passport JWT strategy).

## 2) Web Auth/Session Flow (Implemented)
Primary files:
- `hesba-dashboard/src/lib/auth/server.ts`
- `hesba-dashboard/src/lib/auth/constants.ts`
- `hesba-dashboard/src/lib/api/http-client.ts`
- `hesba-dashboard/src/app/api/auth/refresh/route.ts`
- `hesba-dashboard/src/proxy.ts`
- `hesba-dashboard/src/config/route-access.ts`

Observed flow:
1. Login/register server actions call backend auth endpoints.
2. Cookies are set by server utilities:
- access token cookie: readable by JS (`httpOnly: false`)
- refresh token cookie: `httpOnly: true`
- user data cookie: public UI/session metadata
3. Browser API client attaches bearer token from access-token cookie.
4. On 401/403 auth failure, client calls internal Next route `/api/auth/refresh`.
5. Refresh route invokes server refresh helper, which calls backend `/auth/refresh` using refresh token from cookie, then rewrites cookies.
6. Original request is retried with refreshed access token.
7. If refresh fails, local auth data is cleared and user is redirected to sign-in.

## 3) Web Route Protection and Role Redirects (Verified)
- `src/proxy.ts` applies route-area classification and auth checks.
- Role source order in middleware:
1. user-data cookie role
2. legacy role cookie
3. JWT payload fallback (access token)
- Behavior:
- unauthenticated access to tenant/superadmin routes redirects to localized signin with callback URL
- authenticated users hitting auth routes are redirected to default role route
- super-admin and tenant route areas are separated with redirect enforcement

## 4) Mobile Auth/Session Notes (Relevant Confirmation)
Primary files:
- `hesba-dashboard-mobile/src/lib/api/client.ts`
- `hesba-dashboard-mobile/src/lib/api/auth.api.ts`
- `hesba-dashboard-mobile/src/stores/auth-store.ts`

Confirmed behavior:
1. Tokens are persisted in SecureStore (web fallback uses localStorage).
2. Request interceptor attaches bearer token and tenant header.
3. On 401, refresh flow runs with single-flight queue to prevent concurrent refresh races.
4. On refresh failure, local tokens/session are cleared through registered callback.
5. App boot (`initialize`) loads stored tokens, validates via `/auth/me`, then restores session state.

## 5) Cookie / Token / Session Responsibilities (Current)
- Backend:
- issues access + refresh tokens
- validates bearer access token
- stores/rotates/revokes refresh-token session records
- Web:
- stores access token in JS-readable cookie for client-side header attachment
- stores refresh token in httpOnly cookie for server-side refresh route
- uses middleware cookies/JWT decode for route access decisions
- Mobile:
- stores both tokens in SecureStore
- refreshes directly against backend via Axios client

## 6) Known Ambiguities / Mixed Patterns
1. Web model is mixed (server-action cookies + client token manager + middleware JWT decode fallback), not a single unified strategy.
2. Legacy naming remains in cookie keys (`dafter_*`) and some comments/metadata.
3. Role derivation in middleware can use multiple sources (cookie JSON, legacy cookie, JWT payload), which may diverge if stale.
4. Auth error handling relies partly on message/status pattern matching in client interceptor logic.

## 7) Auth Technical Debt / Risks
1. Access token stored in JS-readable cookie increases XSS blast radius versus strict httpOnly-only session design.
2. Mixed web auth responsibilities across server and client layers increase edge-case complexity.
3. Legacy key names and compatibility fallbacks increase maintenance overhead.
4. Response unwrapping/normalization in clients indicates contract uncertainty around auth payload nesting.

## 8) Items Needing Later Consolidation
1. Define and enforce one canonical web session model (clear ownership for token storage/refresh logic).
2. Standardize role source of truth for route middleware.
3. Align auth response contract shape (especially refresh payload nesting) across backend and both clients.
4. Retire legacy `dafter_*` auth key names in a dedicated migration/refactor task.
