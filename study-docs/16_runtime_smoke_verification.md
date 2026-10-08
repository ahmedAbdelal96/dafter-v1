# Runtime Smoke Verification

Date: 2026-04-01
Scope: post-remediation backend runtime verification (Hesba)

## 1) Commands Run

### Build verification
```powershell
npm run build
```
Workdir: `hesba-api-v1`

### Runtime health verification (local startup + probes)
```powershell
$proc = Start-Process node -ArgumentList 'dist/main.js' -WorkingDirectory 'd:\Web\full-projects\hesba\hesba-api-v1' -PassThru
Start-Sleep 20
Invoke-WebRequest http://127.0.0.1:7000/api/v1/health
Invoke-WebRequest http://localhost:7000/api/v1/health
Stop-Process $proc.Id -Force
```

### Forced error-path verification (404)
```powershell
$proc = Start-Process node -ArgumentList 'dist/main.js' -WorkingDirectory 'd:\Web\full-projects\hesba\hesba-api-v1' -PassThru
Start-Sleep 15
curl.exe -i "http://127.0.0.1:7000/api/v1/__forced_missing_route__"
Stop-Process $proc.Id -Force
```

### Log verification for Sentry/filter behavior
```powershell
Get-Content .\hesba-api-v1\logs\combined-2026-04-01.log -Tail 80
```

## 2) What Passed
1. Backend build completed successfully after remediation.
2. Runtime startup succeeded locally on port `7000` (from `.env`).
3. Health endpoint succeeded:
- `GET /api/v1/health` returned `200` with health object.
4. Forced missing route returned `404` with filter envelope shape:
- includes `success: false`, `statusCode`, `timestamp`, `path`, `method`, `message`.
5. Logs confirm active `ExceptionFilter` path for 404 requests.
6. Logs confirm Sentry service initialization path is reached and reports DSN-disabled state.

## 3) What Failed / Warnings
1. Early probe on port `9000` failed (expected after reading `.env` which sets `PORT=7000`).
2. One startup attempt produced `EADDRINUSE` due overlapping local process using port `7000` during repeated smoke runs.

## 4) What Could Not Be Fully Verified
1. Actual outbound Sentry event delivery to Sentry backend could not be verified because current local env has:
- `SENTRY_DSN=` (empty)
- `SENTRY_ENABLED=false`
2. 5xx capture path to Sentry could not be end-to-end validated without enabled DSN.

## 5) Observed Runtime/Error Behavior
1. Global request logging remains active through `LoggingInterceptor`.
2. Global exception handling is now explicit and active via `AllExceptionsFilter`.
3. Error response path is now clearly filter-shaped for tested HTTP errors (404 case).
4. Sentry is wired in DI/runtime startup, but currently disabled by configuration, producing warning log:
- `Sentry DSN not provided. Error tracking disabled.`

## 6) Confidence Level
- Overall remediation confidence: high
- Sentry delivery confidence: medium (wiring confirmed, delivery unverified due config)
- Global error-path confidence: high (verified via live 404 response + filter logs)
