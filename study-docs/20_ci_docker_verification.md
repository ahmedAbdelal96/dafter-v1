# CI/Docker Verification

Date: 2026-04-01
Scope: static + limited CLI validation after focused CI/Docker config cleanup.

## 1) Commands / Checks Performed

### A) Path existence checks
```powershell
Test-Path .\hesba-api-v1
Test-Path .\hesba-dashboard
Test-Path .\hesba-dashboard-mobile
Test-Path .\hesba-api-v1\package-lock.json
Test-Path .\hesba-dashboard\package-lock.json
Test-Path .\hesba-dashboard-mobile\package-lock.json
```

### B) Workflow path/reference checks
```powershell
rg -n "hesba-api-v1/\*\*|hesba-dashboard/\*\*|hesba-dashboard-mobile/\*\*|working-directory: hesba-|cache-dependency-path: hesba-" .\.github\workflows\backend-ci.yml .\.github\workflows\web-ci.yml .\.github\workflows\mobile-ci.yml
```

### C) Stale path regression check
```powershell
rg -n "dafter-api-v1|dafter-dashboard|dafter-dashboard-mobile" docker-compose.yml .github/workflows/backend-ci.yml .github/workflows/web-ci.yml .github/workflows/mobile-ci.yml
```

### D) Docker compose validation
1. Initial parse attempt:
```powershell
docker compose config
```
Failed due required env interpolation (`POSTGRES_PASSWORD` missing).

2. Validation with safe dummy env values:
```powershell
$env:POSTGRES_PASSWORD='dummy'
$env:JWT_SECRET='dummy_dummy_dummy_dummy_dummy_dummy'
$env:JWT_REFRESH_SECRET='dummy_dummy_dummy_dummy_dummy_dummy'
docker compose config
```

## 2) What Passed
1. All corrected app paths and lockfile references exist.
2. Workflow files now point to `hesba-*` folders in:
- trigger paths
- default working directories
- npm cache dependency paths
3. No remaining `dafter-*` path references in the corrected CI/Docker files.
4. `docker compose config` resolves successfully with required env vars provided.
5. Compose output now resolves build contexts to existing absolute folders:
- `...\hesba-api-v1`
- `...\hesba-dashboard`

## 3) What Could Not Be Fully Verified
1. Full GitHub Actions runtime execution on GitHub runners (local static verification only).
2. Full docker image build/run for all services (out of scope for this focused pass).

## 4) Remaining Risks
1. Compose service/container names still use legacy `daftar_*`; unchanged intentionally to avoid breaking local tooling relying on container names.
2. Package names in `package.json` still use legacy naming; unchanged intentionally (outside this infra-path pass).
3. Workflow branch filters still include both `main` and `master`; no break currently, but branch policy should be standardized later if needed.

## 5) Confidence Level
- Config/path remediation confidence: high
- CI runtime behavior confidence: medium-high (static checks strong; remote runner execution not performed in this pass)
- Docker runtime confidence: medium (compose parse validated; full service boot not executed)
