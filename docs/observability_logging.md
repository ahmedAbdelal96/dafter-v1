# Observability & Logging

Date: 2026-04-01
Scope: verified runtime observability/logging wiring in current codebase

## 1) Confirmed Backend Logging Path

### Bootstrap-level wiring (active)
From `hesba-api-v1/src/main.ts`:
- Global HTTP logging interceptor is applied:
  - `app.useGlobalInterceptors(new LoggingInterceptor(logger))`
- Custom logger service is retrieved from DI (`AppLoggerService`).

### Logger infrastructure
- Logger module/service exists (`hesba-api-v1/src/logger/*`).
- Dependencies include `winston` and `winston-daily-rotate-file` in backend `package.json`.

### Practical implication
- Request/response logging is confirmed as active global behavior.

## 2) Exception Handling Observability Status

### Active runtime path (verified)
- `hesba-api-v1/src/app.module.ts` now binds `AllExceptionsFilter` as a global filter via `APP_FILTER`.
- `hesba-api-v1/src/common/filters/http-exception.filter.ts` is the active error path for HTTP exceptions.

Behavior observed in smoke verification:
- 404 responses are emitted in the filter's envelope shape (`success: false`, `statusCode`, `path`, `method`, etc.).
- Filter log lines are emitted with `ExceptionFilter` context.

## 3) Sentry Status (Critical Verification)

### Runtime wiring status
- `hesba-api-v1/src/common/sentry/sentry.service.ts` implements Sentry SDK init/capture.
- `hesba-api-v1/src/common/sentry/sentry.module.ts` exists as global module.
- `hesba-api-v1/src/app.module.ts` now explicitly imports `SentryModule`.
- Backend dependency `@sentry/node` is present.

### Current operational state (verified)
- Sentry initialization path is now active through DI/module startup.
- In current local runtime, `SENTRY_DSN` is empty and `SENTRY_ENABLED=false`, so Sentry logs:
  `Sentry DSN not provided. Error tracking disabled.`
- This means wiring is explicit, but outbound error tracking remains disabled by configuration.

### Strongest evidence-based statement
Sentry is explicitly wired in backend runtime, but effective event delivery depends on valid Sentry environment configuration.

## 4) Queue / Job Observability
- Bull queue is configured in `AppModule` via `BullModule.forRootAsync(...)`.
- Notifications worker (`notifications.processor.ts`) logs processing, skips, and partial failures.

Conclusion:
- Queue processing has local operational logs, but no confirmed centralized metrics/alerts pipeline in this pass.

## 5) Web and Mobile Client-Side Observability Signals

### Web
- `hesba-dashboard/src/lib/api/http-client.ts` logs request/response details in development mode.
- Error handling includes structured status/message extraction for API failures.

### Mobile
- `hesba-dashboard-mobile/src/lib/api/client.ts` logs API request/response timing and failures (dev-focused).
- Includes explicit refresh/session-expiry tracing behavior.

These are useful for debugging, but they are not a confirmed centralized production observability stack.

## 6) Gaps and High-Priority Missing Pieces
1. End-to-end Sentry delivery is still unverified because DSN is not configured in current local environment.
2. No confirmed unified metrics/trace layer (APM, request metrics, queue metrics dashboards).
4. No confirmed structured correlation ID propagation policy across backend and clients.

## 7) Recommended Next Steps (Documentation/Verification)
1. Confirm intended production error pipeline and wire it explicitly (Sentry + global filter path).
2. Document canonical error response format after wiring is finalized.
3. Add minimal runtime verification checklist:
- startup log confirms monitoring init
- synthetic 5xx captured in monitoring
- queue failures visible in logs/alerts
4. Add observability runbook doc after wiring is stabilized.
