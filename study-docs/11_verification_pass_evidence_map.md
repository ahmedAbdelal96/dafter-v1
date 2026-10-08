# Verification Pass Evidence Map

Date: 2026-04-01
Scope: focused verification for auth/session, API response contract, Sentry/observability wiring, maintenance module status, and runtime topology clues.

## Confidence Scale
- high: directly confirmed in active runtime/config code paths
- medium: strongly indicated but with partial ambiguity
- low: hints exist but wiring/usage is not confirmed

## Evidence Sources

| Source file | What it confirms | Confidence | Notes |
|---|---|---|---|
| `hesba-api-v1/src/main.ts` | Global runtime setup: CORS, Helmet, ValidationPipe, global `LoggingInterceptor`, API prefix (`api/v1`), Swagger setup (`api/docs`). | high | No global exception filter wiring found here. |
| `hesba-api-v1/src/app.module.ts` | Actual imported feature/infrastructure modules in runtime container. | high | No `SentryModule` import; no maintenance module import. |
| `hesba-api-v1/src/common/sentry/sentry.module.ts` | Sentry module/service implementation exists in codebase. | medium | Existence does not equal runtime activation. |
| `hesba-api-v1/src/common/sentry/sentry.service.ts` | Sentry SDK init/capture logic implemented and DSN-gated. | medium | Not sufficient without DI import and usage in startup/error path. |
| `hesba-api-v1/src/common/filters/http-exception.filter.ts` | Custom error envelope + optional Sentry capture path for 5xx. | medium | Filter is not bound globally or via controller decorators. |
| `hesba-api-v1/src/common/filters/global-exception.filter.ts` | Alternate global exception filter implementation exists. | low | No runtime binding evidence found. |
| `hesba-api-v1/src/common/dto/api-response.dto.ts` | Intended success envelope shape: `success/data/message/error/timestamp`. | high | Used widely in controllers. |
| `hesba-api-v1/src/modules/*/*.controller.ts` (sampled via ripgrep) | Most module endpoints return `new ApiResponseDto(...)`. | high | Contract mostly envelope-based for successful responses. |
| `hesba-api-v1/src/app.controller.ts` | `/health` returns raw object, not `ApiResponseDto`. | high | Explicit response-shape exception to main envelope pattern. |
| `hesba-api-v1/src/common/guards/jwt-auth.guard.ts` | JWT auth guard built on Passport strategy. | high | Core backend auth protection primitive. |
| `hesba-api-v1/src/modules/auth/auth.controller.ts` | Auth routes and response shaping for login/refresh/logout/profile/sessions/reset flows. | high | Uses `ApiResponseDto` on auth endpoints. |
| `hesba-api-v1/src/modules/auth/strategies/jwt.strategy.ts` | Access token validation and request user attachment behavior. | high | Loads user from DB; enriches permissions for staff. |
| `hesba-api-v1/src/modules/auth/services/token.service.ts` | Access token generation + refresh token generation/hash flow. | high | Confirms token pair model in backend. |
| `hesba-api-v1/src/modules/auth/auth.repository.ts` | Refresh token persistence/revocation and sessions listing persistence layer. | high | Confirms server-side token-session tracking model. |
| `hesba-api-v1/src/modules/maintenance` + `rg "maintenance"` | No active maintenance module wiring; folder has only `dto/`. | high | Strong signal of inactive/stale area. |
| `hesba-api-v1/src/modules/notifications/notifications.processor.ts` | Queue worker exists (`@Processor`) with logging around job processing. | high | Confirms queue runtime component and basic observability. |
| `hesba-dashboard/src/lib/auth/constants.ts` | Web auth cookie names and auth endpoint base wiring. | high | Uses legacy `dafter_*` cookie keys. |
| `hesba-dashboard/src/lib/auth/server.ts` | Web server-side cookie/session management and refresh flow. | high | Mixed model: access token readable cookie; refresh token httpOnly cookie. |
| `hesba-dashboard/src/app/api/auth/refresh/route.ts` | Web refresh bridge route that calls server refresh helper. | high | Used by Axios client refresh retry path. |
| `hesba-dashboard/src/lib/api/http-client.ts` | Web request/response interceptors, auth retry, logout behavior. | high | Handles 401 refresh + retry; assumes message/status patterns. |
| `hesba-dashboard/src/proxy.ts` | Route protection and role-aware redirects in web runtime. | high | Uses cookies/JWT payload fallback for role extraction. |
| `hesba-dashboard/src/config/route-access.ts` | Canonical role/route-area mapping used by middleware proxy. | high | Confirms super-admin vs tenant route model. |
| `hesba-dashboard/src/lib/api/contracts.ts` + `response.ts` | Defensive envelope/unwrapped response extraction on web. | high | Indicates inconsistent backend response expectations. |
| `hesba-dashboard-mobile/src/lib/api/client.ts` | Mobile token storage/injection + refresh queue + retry behavior. | high | Explicitly unwraps refresh responses defensively (`raw?.data?.tokens ?? ...`). |
| `hesba-dashboard-mobile/src/lib/api/auth.api.ts` | Mobile auth API assumes `ApiEnvelope<T>` in many calls. | medium | Coexists with defensive unwrap logic in client refresh path. |
| `hesba-dashboard-mobile/src/stores/auth-store.ts` | Mobile session bootstrap/validation flow (`tokenStore.load` + `/auth/me`). | high | Confirms app-start session rehydration pattern. |
| `docker-compose.yml` | Declared infra topology intent: Postgres + Redis + API + Web + backup service. | medium | Contains legacy path names (`./dafter-api-v1`, `./dafter-dashboard`) that may not match current folders. |
| `hesba-api-v1/Dockerfile` | Backend production container flow: build, prisma generate/migrate, run `dist/main.js`. | high | Strong runtime evidence for containerized backend start sequence. |
| `hesba-dashboard/Dockerfile` | Web production container flow: Next standalone build + `node server.js`. | high | Strong runtime evidence for containerized web start sequence. |

## Contradictions / Incomplete Areas
1. Sentry code exists, but active runtime wiring is not confirmed in `AppModule` or bootstrap/global filter binding.
2. Two custom exception filter implementations exist, but no confirmed binding path (`useGlobalFilters`, `APP_FILTER`, or `@UseFilters`) was found.
3. Success responses are mostly envelope-based, but `/health` returns a direct object, and clients include defensive extractors that suggest mixed shapes in practice.
4. `docker-compose.yml` describes a topology, but build contexts use legacy directory names, so it is not fully reliable as current runnable truth without correction.
5. Maintenance area appears present as folder residue only (no active module/controller/provider wiring).
