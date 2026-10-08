# API Contract Cleanup Plan

Date: 2026-04-01
Scope: narrow backend API response contract cleanup for Hesba

## 1) Current Confirmed Response-Shaping Behavior
1. Most active controllers in `hesba-api-v1/src/modules/*` return `ApiResponseDto` for successful responses.
2. Error responses are globally shaped by `AllExceptionsFilter` (already bound via `APP_FILTER`).
3. `GET /health` in `app.controller.ts` returns a raw object (intentional operational endpoint pattern).
4. No global success-shaping interceptor is currently enforcing success envelope behavior.
5. Web/mobile clients still perform defensive unwrapping for compatibility.

## 2) Main Inconsistencies Found
1. Success envelope is convention-based (controller-by-controller), not runtime-enforced centrally.
2. `health` is a known raw success response outlier and is not explicitly marked as exception in runtime metadata.
3. Inactive legacy controller exists under `src/common/notifications/notification.controller.ts` with raw returns, but it is not imported in active `AppModule` and therefore out of active runtime scope.

## 3) Exact Files Likely To Be Changed
1. `hesba-api-v1/src/common/interceptors/success-response.interceptor.ts` (new)
2. `hesba-api-v1/src/common/decorators/raw-response.decorator.ts` (new)
3. `hesba-api-v1/src/app.module.ts`
4. `hesba-api-v1/src/app.controller.ts`
5. `docs/api_integration_guide.md` (targeted update)
6. `study-docs/23_api_contract_cleanup_verification.md` (new)
7. `study-docs/24_api_contract_cleanup_change_log.md` (new)

## 4) Proposed Minimal Cleanup Strategy
1. Add a global success-response interceptor that:
- runs only for HTTP context
- keeps responses unchanged when they already look like envelope (`success + timestamp`)
- wraps non-envelope success payloads in `ApiResponseDto`
- respects explicit raw-response metadata
2. Add `@RawResponse()` decorator for explicit exceptions.
3. Mark `GET /health` as explicit raw endpoint using `@RawResponse()`.
4. Keep existing global error path (`AllExceptionsFilter`) unchanged.

## 5) Explicit Non-Goals
1. No full-controller mass rewrite.
2. No response schema redesign across all modules.
3. No frontend/mobile runtime changes.
4. No auth/session redesign.
5. No activation/refactor of inactive legacy modules.

## 6) Risk Assessment
1. Low-medium risk: any active endpoint returning raw non-envelope payload (if exists) will now be wrapped unless explicitly marked raw.
2. Low risk for existing primary modules because they already return `ApiResponseDto`.
3. Low risk for clients because web/mobile already support envelope extraction and defensive handling.

## 7) Verification Plan
1. Run backend build (`npm run build`).
2. Start backend locally and verify:
- one standard success endpoint remains envelope-shaped (e.g., `/api/v1/auth/forgot-password` with valid payload format)
- `GET /api/v1/health` remains raw and unchanged
- one error case (`/api/v1/__missing_route__`) still follows global error filter shape
3. Record observations and compatibility notes in `study-docs/23_api_contract_cleanup_verification.md`.
