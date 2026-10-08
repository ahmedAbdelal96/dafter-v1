# API Contract Cleanup Change Log

Date: 2026-04-01
Scope: narrow, low-risk API response contract cleanup pass

## Code Files Changed

1. `hesba-api-v1/src/common/interceptors/success-response.interceptor.ts` (new)
- Added global success-response shaping interceptor.
- Behavior:
  - HTTP context only
  - preserves already-envelope responses
  - wraps non-envelope success payloads using `ApiResponseDto`
  - skips explicit raw-response endpoints

2. `hesba-api-v1/src/common/decorators/raw-response.decorator.ts` (new)
- Added `@RawResponse()` decorator metadata to explicitly exempt endpoints from success-envelope shaping.

3. `hesba-api-v1/src/app.module.ts`
- Registered global success interceptor via `APP_INTERCEPTOR`.
- Keeps existing global exception filter path unchanged.

4. `hesba-api-v1/src/app.controller.ts`
- Marked `GET /health` with `@RawResponse()`.
- Clarified Swagger description that health is intentional raw response.

## Documentation Files Updated

1. `docs/api_integration_guide.md`
- Documented explicit global success-shaping path.
- Documented explicit health raw exception.
- Clarified active-runtime vs inactive legacy controller behavior.

2. `docs/system_architecture_overview.md`
- Updated API communication section to reflect global success shaping + explicit health exception.

## Study Docs Created

1. `study-docs/22_api_contract_cleanup_plan.md`
2. `study-docs/23_api_contract_cleanup_verification.md`
3. `study-docs/24_api_contract_cleanup_change_log.md`

## Inconsistencies Fixed
1. Success envelope behavior is now explicit at runtime (not only convention-based in controllers).
2. Health endpoint exception is now explicit and documented in code/Swagger.

## Intentionally Left Unchanged
1. No mass rewrite of existing controllers already using `ApiResponseDto`.
2. No frontend/mobile runtime changes.
3. No activation/refactor of inactive legacy notification controller under `common/notifications`.
4. No broad Swagger standardization refactor across all modules.

## Follow-Up Candidates
1. Optional targeted sweep to annotate additional intentional raw endpoints (if any emerge).
2. Endpoint-by-endpoint Swagger response harmonization.
3. Separate cleanup of inactive legacy modules not wired in `AppModule`.
