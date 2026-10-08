# Swagger/Runtime Alignment Plan

Date: 2026-04-01
Scope: narrow backend Swagger/runtime response contract alignment for Hesba

## 1) Current Confirmed Runtime Response Rules
1. Success responses are envelope-first at runtime via global `SuccessResponseInterceptor`.
2. Endpoints already returning `ApiResponseDto` remain as-is (no double wrapping).
3. Explicit raw exceptions can be declared with `@RawResponse()`.
4. `GET /health` is intentionally raw and currently marked with `@RawResponse()`.
5. Error responses are shaped by global `AllExceptionsFilter`.

## 2) Current Swagger Documentation Pattern
1. Swagger is generated centrally in `main.ts` with a bearer auth scheme name `access-token`.
2. Controllers often use module-level Swagger decorator files (`auth.swagger.ts`, `users.swagger.ts`, `customers.swagger.ts`, `invoices.swagger.ts`).
3. Some endpoints include envelope-like examples, but coverage/detail is uneven.
4. Some decorators use `ApiBearerAuth()` with default/other names, creating potential scheme-name mismatch in docs.

## 3) Likely Mismatch Categories
1. Auth scheme name mismatch in Swagger docs:
- runtime doc defines `access-token` scheme
- many endpoints use `ApiBearerAuth()` default (bearer) or other names.
2. Endpoint example shape mismatch vs runtime envelope layout:
- especially list endpoints where runtime returns `{ success, data: [...], meta, ... }` but docs may show `data: { items, meta }`.
3. Success endpoints with missing/underspecified Swagger response schemas (particularly auth/session endpoints).
4. Raw exception endpoints need clear and explicit Swagger wording (health already partially addressed).

## 4) Exact Files Likely To Be Changed
1. `hesba-api-v1/src/main.ts`
2. `hesba-api-v1/src/modules/auth/swagger/auth.swagger.ts`
3. `hesba-api-v1/src/modules/customers/swagger/customers.swagger.ts`
4. `study-docs/26_swagger_runtime_alignment_audit.md` (new)
5. `study-docs/27_swagger_runtime_alignment_verification.md` (new)
6. `study-docs/28_swagger_runtime_alignment_change_log.md` (new)
7. `docs/api_integration_guide.md` (targeted update if alignment changes confirmed)

## 5) Endpoint Selection Criteria for This Pass
1. High-value early-consumed endpoints (health/auth/login/refresh/profile/session).
2. Representative list CRUD endpoint with known shape risk (customers list).
3. Endpoints with clear runtime behavior and high confidence from controller/use-case code.

## 6) Non-Goals
1. No full Swagger refactor across all modules.
2. No business-logic/service/controller redesign.
3. No frontend/mobile runtime changes.
4. No speculative contract claims for endpoints not audited.

## 7) Verification Strategy
1. Build backend (`npm run build`).
2. Start backend and hit representative endpoints:
- `/api/v1/health` (raw)
- `/api/v1/auth/forgot-password` (envelope success)
- missing route error case (envelope error)
3. Fetch Swagger JSON and inspect selected paths/schemes for alignment:
- auth routes
- health route
- customers list schema example
4. Record mismatches fixed, deferred items, and confidence level.
