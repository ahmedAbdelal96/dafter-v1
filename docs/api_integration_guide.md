# API Integration Guide

Date: 2026-04-01
Scope: verified integration behavior between backend API and web/mobile clients

## 1) Integration Surface at a Glance
- Backend API base pattern: `.../api/v1`
- Backend Swagger docs path: `.../api/docs`
- Web and mobile both use Axios client layers + feature service/hook abstractions.

This guide is evidence-based and intentionally avoids speculative endpoint catalogs.

## 2) Backend Contract Signals (Verified)

### API Prefix and Docs
- Global prefix configured in backend bootstrap (`api/v1` default).
- Swagger generated and exposed at `/api/docs`.
- Swagger bearer auth schemes are now registered with compatible aliases (`access-token`, `bearer`, `JWT-auth`) to match existing decorator usage.

### Response Envelope Pattern
- Backend has `ApiResponseDto` wrapper (`success`, `data`, `message`, `error`, `timestamp`).
- Backend now has an explicit global success-shaping path through `SuccessResponseInterceptor`.
- Frontend clients include extraction/normalization logic that handles both wrapped and direct payloads.
- `GET /health` is a confirmed direct-object response (not wrapped in `ApiResponseDto`).

Implication:
- Contract shape is explicitly envelope-first for normal API success responses, with explicit raw exceptions (currently health).

## 3) Web Integration Pattern (Verified)

### Base URL and Endpoint Registry
- Base URL is defined in `src/lib/api/config.ts` (via `NEXT_PUBLIC_API_URL` fallback).
- Endpoint constants are centralized in `API_ENDPOINTS`.

### Request Layer
- `src/lib/api/http-client.ts` creates shared Axios instance.
- Request interceptor behavior includes:
- attach `Authorization: Bearer ...` from cookie/token manager
- attach tenant context header when available
- attach language header (`Accept-Language`)

### Response/Error Layer
- Handles network retries for idempotent reads (GET).
- Handles auth failure by calling `/api/auth/refresh` Next.js API route, then retries original request.
- On refresh failure, clears local auth state and redirects to sign-in.

### Auth/Session Flow (Web)
- Server-side utilities (`src/lib/auth/server.ts`) manage cookies and session helpers.
- Server actions (`src/lib/auth/actions.ts`) call backend auth endpoints directly.
- Middleware-like route guard (`src/proxy.ts`) enforces role-aware route access.

## 4) Mobile Integration Pattern (Verified)

### Base URL and Endpoint Registry
- Shared endpoint map in `src/lib/api/config.ts`.
- Base URL resolved dynamically in `src/lib/api/client.ts` (explicit env/app config, LAN hostUri fallback, localhost fallback).

### Request Layer
- Shared Axios instance in `src/lib/api/client.ts`.
- Access token and tenant ID are loaded from SecureStore-backed token store and injected into headers.

### Response/Error Layer
- 401 handling uses refresh-token flow with a single-flight queue (avoids concurrent refresh races).
- If refresh fails, session is cleared and auth-store callback is triggered.

### Auth/Session Flow (Mobile)
- `src/stores/auth-store.ts` initializes auth state from stored tokens and `/auth/me` validation.
- Logout clears SecureStore regardless of remote logout success.
- App boot uses provider/hydration flow before rendering main navigation.

## 5) API Contract Sources in Clients (Verified)
- Web:
- endpoint constants: `src/lib/api/config.ts`
- services: `src/lib/api/services/*`
- hooks: `src/lib/api/hooks/*`
- contract helpers: `contracts.ts`, `response.ts`

- Mobile:
- endpoint constants: `src/lib/api/config.ts`
- shared client + token store: `src/lib/api/client.ts`
- feature APIs/hooks: `src/features/*/api` and `src/features/*/hooks`

- Backend side contract references:
- controller route decorators in `src/modules/*/*.controller.ts`
- Swagger path in bootstrap

## 6) Known Integration Risks / Inconsistencies (Verified)
1. Legacy naming remains in technical keys/cookies/env defaults (`dafter_*`, `Daftar` strings), which can mislead maintainers.
2. Web `src/lib/api/types.ts` still contains legacy/irrelevant enum surfaces (for example booking/salon-style remnants), indicating type drift risk.
3. Web auth flow mixes server-action cookie lifecycle with client token-manager behavior; this increases complexity and potential edge cases.
4. Client code (web/mobile) performs substantial response normalization, suggesting backend response shape consistency is not strictly guaranteed across all endpoints.
5. Mobile has multiple base URL/fallback paths (env + hostUri + localhost + constants), which can lead to environment mismatch if not standardized.
6. Backend global exception path is now explicitly bound to `AllExceptionsFilter`; error payloads are more predictable, but full endpoint-by-endpoint contract harmonization is still pending.
7. Legacy/inactive code paths (for example controllers not wired into `AppModule`) may still contain non-envelope returns but do not define active runtime behavior.

## 7) Needs Verification
1. Canonical long-term auth/session model for web (cookie-only vs mixed client token access strategy).
2. Which endpoints are guaranteed to always return envelope shape vs direct payload.
3. Whether additional endpoints beyond `health` should be explicitly marked as raw exceptions in future.
4. Production CORS and host topology behavior across web/mobile deployments.
5. Production Sentry delivery behavior with real DSN and enablement flags.

## 8) Recommended Branch-Out Docs
- Endpoint-by-endpoint contract baseline per module (future)
- Auth/session deep-dive across web + mobile
- Error handling and retry policy matrix (web/mobile)
