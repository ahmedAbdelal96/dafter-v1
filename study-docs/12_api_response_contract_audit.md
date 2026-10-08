# API Response Contract Audit

Date: 2026-04-01
Scope: backend runtime response shaping vs web/mobile client assumptions

## Executive Finding
The backend is mostly envelope-oriented for successful business endpoints (`ApiResponseDto`), but the contract is not strictly universal at runtime, and frontend clients contain defensive unwrapping logic that confirms shape variance handling.

## 1) Backend Success Contract (What is confirmed)
### Core envelope type
- File: `hesba-api-v1/src/common/dto/api-response.dto.ts`
- Envelope fields: `success`, `data`, `message`, `error`, `timestamp`

### Controllers using the envelope
`new ApiResponseDto(...)` is broadly used in module controllers (auth, users, customers, suppliers, employees, products, invoices, reports, platform, platform-dashboard, platform-audit, etc.).

Confidence: high (code usage is widespread and explicit).

## 2) Confirmed Exceptions / Non-Uniform Shapes
### Health endpoint
- File: `hesba-api-v1/src/app.controller.ts`
- `GET /health` returns a plain object (`status`, `timestamp`, `uptime`, `database`, `version`) without `ApiResponseDto`.

Impact:
- The API is not globally forced into one envelope by framework-level interceptor/filter.

## 3) Error Contract Status
### What exists
- Custom filters exist:
- `hesba-api-v1/src/common/filters/http-exception.filter.ts`
- `hesba-api-v1/src/common/filters/global-exception.filter.ts`

### Runtime binding check
No evidence found for:
- `app.useGlobalFilters(...)` in bootstrap
- `APP_FILTER` provider in module wiring
- `@UseFilters(...)` on controllers

Audit conclusion:
- A custom unified error envelope is implemented in code but not confirmed as active runtime behavior.
- Effective runtime error shape may still be default NestJS error responses for many paths.

Confidence: medium-high (absence of binding code is explicit; runtime behavior depends on uninspected external adapters).

## 4) Frontend Contract Assumptions
### Web (`hesba-dashboard`)
- `src/lib/api/contracts.ts` + `src/lib/api/response.ts` implement `isApiEnvelope` and `extractData`.
- Service methods often type responses as `T | ApiResponse<T>` and normalize at call-site.
- `src/lib/api/http-client.ts` auth refresh code also handles nested variants defensively.

### Mobile (`hesba-dashboard-mobile`)
- `src/lib/api/auth.api.ts` assumes `ApiEnvelope<T>` for auth calls.
- `src/lib/api/client.ts` refresh flow still defensively unwraps multiple nesting patterns:
  - `raw?.data?.tokens ?? raw?.tokens ?? raw?.data ?? raw`

Audit conclusion:
- Clients are engineered to tolerate mixed response shapes rather than relying on a strict guaranteed contract.

## 5) Swagger Alignment Notes
- Swagger is enabled in `hesba-api-v1/src/main.ts` at `/api/docs`.
- Because success and error shaping are not globally forced through one runtime mechanism, Swagger may not always reflect exact runtime response variants unless each endpoint is consistently documented and implemented.

Status: partially confirmed (Swagger exists; full endpoint-by-endpoint conformance not audited in this pass).

## 6) Concrete Inconsistency / Risk List
1. Success envelope pattern is dominant but not universal (`/health` direct object).
2. Error-shape standardization exists as code artifacts but lacks confirmed runtime binding.
3. Web/mobile clients contain fallback normalization branches, indicating practical contract uncertainty.
4. Refresh response nesting expectations are not represented as one strict shape across all client code paths.

## 7) Priority Recommendations (for later cleanup task)
1. Enforce one global response policy:
- either uniform envelope for all success responses, or explicit documented exceptions.
2. Decide and wire one global error filter/interceptor path in bootstrap/module DI.
3. Lock refresh/auth response schemas and remove extra fallback branches in clients.
4. Add lightweight contract tests (backend + web/mobile smoke) for envelope and auth refresh payload shape.
5. Keep `/health` intentionally raw only if documented as a deliberate exception.
