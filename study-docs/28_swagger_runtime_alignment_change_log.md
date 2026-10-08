# Swagger/Runtime Alignment Change Log

Date: 2026-04-01
Scope: narrow Swagger/runtime response-shape alignment pass

## Files Changed

### 1) `hesba-api-v1/src/main.ts`
Changes:
- Swagger title changed to `Hesba API`.
- Added bearer auth scheme aliases: `bearer`, `JWT-auth` (kept `access-token`).
- Bootstrap log message updated to `Hesba API` naming.

Why:
- Align Swagger docs identity and auth scheme references with actual controller decorator usage.

### 2) `hesba-api-v1/src/modules/auth/swagger/auth.swagger.ts`
Changes:
- Simplified auth tag label to neutral `Auth`.
- Added explicit 200 response schema example for refresh endpoint.
- Added explicit envelope examples for logout and change-password success responses.
- Updated legacy user-agent example text (`Hesba-Mobile`).

Why:
- Improve high-value auth endpoint Swagger/runtime alignment and reduce ambiguous/missing response-shape docs.

### 3) `hesba-api-v1/src/modules/customers/swagger/customers.swagger.ts`
Changes:
- Corrected `GET /customers` success example shape:
  - from `data: { items, meta }`
  - to `data: [...]` with root-level `meta`.

Why:
- Match observed controller runtime response pattern (`ApiResponseDto(items)` + `response.meta`).

### 4) `docs/api_integration_guide.md`
Changes:
- Added note on Swagger bearer scheme aliases alignment.
- Fixed numbering in "Needs Verification" list.

Why:
- Keep active integration docs aligned with current verified Swagger/runtime state.

## Study Docs Created
1. `study-docs/25_swagger_runtime_alignment_plan.md`
2. `study-docs/26_swagger_runtime_alignment_audit.md`
3. `study-docs/27_swagger_runtime_alignment_verification.md`
4. `study-docs/28_swagger_runtime_alignment_change_log.md`

## What Was Aligned
1. Swagger auth schemes vs controller `ApiBearerAuth(...)` usage.
2. Auth refresh/logout/change-password success response documentation.
3. Customers list example shape vs runtime contract behavior.
4. Product naming in Swagger entrypoint and examples.

## Intentionally Deferred
1. Full module-by-module Swagger normalization.
2. Exhaustive per-endpoint success/error example completion.
3. Broad cleanup of all legacy comments/text artifacts in non-critical Swagger descriptions.
4. Any business-logic/controller-flow changes.

## Remaining Future Candidates
1. Add uniform success/error response decorator helpers for modules with sparse Swagger examples.
2. Audit additional list endpoints for `data/meta` documentation precision.
3. Add consistent error-envelope examples across major modules.
