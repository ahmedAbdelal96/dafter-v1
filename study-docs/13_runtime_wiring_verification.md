# Runtime Wiring Verification

Date: 2026-04-01
Scope: explicit answers for runtime wiring uncertainties

## 1) Is backend Sentry actually wired into runtime startup/request/error flow?
- Answer status: not confirmed
- Evidence:
  - `hesba-api-v1/src/common/sentry/sentry.module.ts` and `sentry.service.ts` exist.
  - `hesba-api-v1/src/app.module.ts` does not import `SentryModule`.
  - `hesba-api-v1/src/main.ts` has no Sentry initialization call.
  - Custom exception filter with Sentry capture exists, but no confirmed global/controller binding was found.
- Impact:
  - Production errors may not be reaching Sentry even if DSN env vars are set.
  - Team can incorrectly assume monitoring coverage is active.
- Recommended follow-up:
  - Add explicit runtime wiring decision (module import + global filter/integration), then verify with controlled test exception in non-prod.

## 2) Is maintenance module imported/exposed/used, or inactive/stale?
- Answer status: confirmed (inactive/stale)
- Evidence:
  - `hesba-api-v1/src/modules/maintenance` contains only `dto/`.
  - No `maintenance.module.ts` import in `AppModule`.
  - No controller/provider wiring or route exposure found by search.
- Impact:
  - Maintenance area appears as dead/incomplete scaffold.
  - Can confuse maintainers and docs if treated as active domain.
- Recommended follow-up:
  - Either archive/remove stale scaffold in a dedicated cleanup task, or complete module wiring with clear scope.

## 3) What is the strongest verifiable statement about deployment/runtime topology?
- Answer status: partially confirmed
- Evidence:
  - `hesba-api-v1/Dockerfile` confirms backend container flow (build, prisma generate/migrate, run `dist/main.js`).
  - `hesba-dashboard/Dockerfile` confirms Next standalone production container flow.
  - `docker-compose.yml` declares services: postgres, redis, api, web, backup.
  - `docker-compose.yml` uses legacy build contexts (`./dafter-api-v1`, `./dafter-dashboard`) which conflict with current folder names.
- Impact:
  - Dockerfiles are reliable per-app runtime evidence.
  - Compose topology intent is visible but current compose file is likely stale/misaligned.
- Recommended follow-up:
  - Validate and align compose paths in a dedicated infra task before treating compose as executable source of truth.

## 4) Are there obvious mismatches between documented API behavior and actual code behavior?
- Answer status: confirmed
- Evidence:
  - Success envelope (`ApiResponseDto`) is dominant in controllers, but `/health` returns raw object.
  - Custom global error envelope filters exist in code but are not confirmed wired at runtime.
  - Web/mobile clients contain defensive unwrapping branches for multiple payload nesting shapes.
- Impact:
  - API contract clarity is reduced; client code carries defensive complexity.
  - Swagger may not perfectly represent runtime response behavior in all paths.
- Recommended follow-up:
  - Establish and enforce one response contract policy (success + error), then remove unnecessary client-side fallback handling.

## Verification Summary
- Sentry runtime wiring: not confirmed
- Maintenance module: confirmed inactive/stale
- Runtime topology: partially confirmed (Dockerfiles strong, compose stale risk)
- API behavior mismatch risk: confirmed
