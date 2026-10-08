# Runtime Remediation Change Log

Date: 2026-04-01
Scope: small backend runtime remediation pass for Hesba

## 1) Code Files Changed

### `hesba-api-v1/src/app.module.ts`
- Added `APP_FILTER` import and bound `AllExceptionsFilter` globally.
- Imported `SentryModule` into `AppModule` imports.

Why:
1. Make one explicit, reviewable global exception handling path.
2. Ensure existing Sentry module/service are explicitly part of runtime DI/startup path.

## 2) Documentation Files Created

### `study-docs/15_runtime_remediation_plan.md`
- Captures scope, minimal approach, risks, rollback, and verification plan before code changes.

### `study-docs/16_runtime_smoke_verification.md`
- Captures executed commands, observed runtime behavior, limitations, and confidence.

### `study-docs/17_runtime_remediation_change_log.md`
- Captures complete change inventory and final decisions.

## 3) Documentation Files Updated

### `docs/observability_logging.md`
- Updated from "wiring not confirmed" to verified post-change runtime state.
- Clarified that Sentry wiring is explicit but delivery depends on DSN/config enablement.

### `docs/system_architecture_overview.md`
- Updated ambiguity note to reflect explicit Sentry wiring with configuration dependency.

### `docs/api_integration_guide.md`
- Updated risk/verification notes to reflect explicit global exception path and remaining contract harmonization work.

## 4) Final Sentry Status
- Status: explicitly wired
- Operational note: currently inactive for outbound tracking in local env due missing/disabled Sentry config (`SENTRY_DSN` empty, `SENTRY_ENABLED=false`).

## 5) Global Exception Handling Status
- Status: explicit and clearer
- Active global path: `AllExceptionsFilter` bound through `APP_FILTER` in `AppModule`.

## 6) Remaining Gaps
1. End-to-end Sentry event delivery is not verified until DSN is configured and enabled in target environment.
2. API response-contract full harmonization is still pending (this pass intentionally avoided broad refactor).
3. Only narrow smoke paths were validated (`/health` and one forced 404 route).
