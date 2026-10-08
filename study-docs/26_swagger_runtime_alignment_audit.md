# Swagger/Runtime Alignment Audit

Date: 2026-04-01
Scope: focused high-value subset audit (health, auth, bootstrap endpoints, representative list endpoint)

## Audited Endpoint Groups

| Endpoint / Group | Controller/File | Observed Runtime Contract Expectation | Current Swagger State (Before Fix) | Mismatch Type | Recommended Action | Confidence |
|---|---|---|---|---|---|---|
| `GET /api/v1/health` | `src/app.controller.ts` | Intentional raw response (non-envelope), guarded by `@RawResponse()` | Raw object schema documented | none | no change (keep raw explicit) | high |
| `POST /api/v1/auth/login` | `src/modules/auth/auth.controller.ts` + `auth.swagger.ts` | Envelope success (`ApiResponseDto`) with `data.user` + `data.tokens` | Envelope example present | minor detail drift only | defer broad polishing | high |
| `POST /api/v1/auth/refresh` | `src/modules/auth/auth.controller.ts` + `auth.swagger.ts` | Envelope success with nested `{ data: { tokens } }` | 200 response existed without concrete schema example in Swagger JSON | missing success schema detail | add/update Swagger 200 example | high |
| `POST /api/v1/auth/logout` | `src/modules/auth/auth.controller.ts` + `auth.swagger.ts` | Envelope success with `data: null` | 200 description only, no explicit envelope example | under-documented success shape | add Swagger 200 envelope example | high |
| `POST /api/v1/auth/change-password` | `src/modules/auth/auth.controller.ts` + `auth.swagger.ts` | Envelope success with `data: null` | 200 description only, no explicit envelope example | under-documented success shape | add Swagger 200 envelope example | high |
| `GET /api/v1/auth/me` and `GET /api/v1/auth/sessions` | `src/modules/auth/auth.controller.ts` + `auth.swagger.ts` | Envelope success | examples present but naming references had legacy text | naming/documentation drift | small naming correction only | medium-high |
| Swagger security scheme usage across auth/controllers | `src/main.ts` + controller decorators | Runtime auth is bearer JWT; docs should recognize decorator variants | Only `access-token` scheme registered; many decorators use default/other names | scheme-name mismatch risk in docs UI | add bearer scheme aliases in Swagger config | high |
| `GET /api/v1/customers` | `src/modules/customers/customers.controller.ts` + `customers.swagger.ts` | Runtime shape: `ApiResponseDto(data=array)` + `meta` at root (`response.meta`) | Example documented as `data: { items, meta }` | concrete shape mismatch | update example to `data: [...]` with root `meta` | high |
| Representative users list (`GET /api/v1/users`) | `src/modules/users/users.controller.ts` + `users.swagger.ts` | Runtime shape: `data` array + root `meta` | Example already follows this pattern | none | no change | high |

## Applied Alignment Decisions in This Pass
1. Add Swagger bearer scheme aliases (`access-token`, `bearer`, `JWT-auth`) in `main.ts`.
2. Add missing envelope response examples for key auth endpoints (`refresh`, `logout`, `change-password`).
3. Correct customers list Swagger example to match runtime (`data` array + root `meta`).
4. Keep `health` as explicit raw endpoint without wrapping.

## Deferred Areas (Intentional)
1. Full endpoint-by-endpoint schema harmonization across all modules.
2. Deep standardization of every auth response example field beyond high-value mismatches.
3. Broad cleanup of all legacy tag labels/comments in Swagger files.
