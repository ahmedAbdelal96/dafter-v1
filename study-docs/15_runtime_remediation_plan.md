# Runtime Remediation Plan

Date: 2026-04-01
Scope: small, high-confidence backend runtime remediation for Hesba

## 1) Current Confirmed Runtime Gaps
1. Sentry implementation exists (`common/sentry/*`) but is not explicitly wired into active runtime boot path.
2. Multiple exception filters exist, but there is no explicit global filter binding in bootstrap/module DI.
3. Global request logging exists, but the global error response path is not explicitly unified in runtime wiring.
4. Previous verification indicates observability docs are ahead of confirmed runtime wiring and need precise post-change alignment.

## 2) Exact Files Likely To Be Changed
Code (backend):
- `hesba-api-v1/src/app.module.ts`
- `hesba-api-v1/src/main.ts`

Possibly (only if needed):
- `hesba-api-v1/src/common/filters/http-exception.filter.ts`
- `hesba-api-v1/src/common/sentry/sentry.service.ts`

Docs:
- `study-docs/16_runtime_smoke_verification.md` (new)
- `study-docs/17_runtime_remediation_change_log.md` (new)
- `docs/observability_logging.md` (targeted update if behavior changes are verified)
- `docs/system_architecture_overview.md` (targeted update if behavior changes are verified)
- `docs/api_integration_guide.md` (only if backend error path materially changes client-facing behavior)

## 3) Proposed Minimal Remediation Approach
1. Wire Sentry module explicitly in backend runtime module imports, reusing existing `SentryModule` and `SentryService`.
2. Make one global exception path explicit by binding a single existing filter (prefer `AllExceptionsFilter` that already integrates logger + optional Sentry).
3. Keep existing global `LoggingInterceptor` intact.
4. Avoid response-contract refactor; only make runtime path explicit and reviewable.

## 4) Risks
1. Changing global exception filter can alter exact error payload shape for endpoints that previously used default Nest behavior.
2. If Sentry DSN is absent, Sentry remains effectively disabled (expected behavior) though now explicitly wired.
3. Duplicate logging risk if interceptor + filter both log failures (acceptable short-term, but should be monitored).

## 5) Rollback Notes
1. Revert `AppModule` provider/import changes to remove explicit filter/Sentry wiring.
2. Revert any bootstrap/global filter wiring in `main.ts` if added.
3. Keep docs aligned with whichever runtime state is finally active.

## 6) Post-Change Verification Plan
1. Run backend build to confirm compile/type integrity.
2. Run a narrow runtime smoke:
- start backend
- hit one healthy endpoint (`/health`)
- hit one forced error path (non-existent route) to observe global error handling shape/logging
3. Confirm final Sentry status:
- explicitly wired in runtime DI path or still blocked by config/dependency limits.
4. Record exact commands and outputs summary in `study-docs/16_runtime_smoke_verification.md`.
