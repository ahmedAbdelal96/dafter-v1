# CI/Docker Change Log

Date: 2026-04-01
Scope: focused infrastructure/config cleanup for Hesba

## 1) Files Changed

### `docker-compose.yml`
Changes:
1. Removed obsolete `version` key.
2. Updated API build context:
- from `./dafter-api-v1`
- to `./hesba-api-v1`
3. Updated Web build context:
- from `./dafter-dashboard`
- to `./hesba-dashboard`
4. Updated `NEXT_PUBLIC_APP_NAME` default:
- from `Daftar`
- to `Hesba`

Why:
- Fix broken build path references and reduce misleading legacy naming in active infra config.

### `.github/workflows/backend-ci.yml`
Changes:
1. Path filters updated to `hesba-api-v1/**`.
2. `working-directory` updated to `hesba-api-v1`.
3. `cache-dependency-path` updated to `hesba-api-v1/package-lock.json`.

Why:
- Align backend CI workflow with real folder structure so triggers/execution are valid.

### `.github/workflows/web-ci.yml`
Changes:
1. Path filters updated to `hesba-dashboard/**`.
2. `working-directory` updated to `hesba-dashboard`.
3. `cache-dependency-path` updated to `hesba-dashboard/package-lock.json`.
4. CI env `NEXT_PUBLIC_APP_NAME` updated to `Hesba Dashboard`.

Why:
- Fix real workflow path mismatches and reduce active legacy naming.

### `.github/workflows/mobile-ci.yml`
Changes:
1. Path filters updated to `hesba-dashboard-mobile/**`.
2. `working-directory` updated to `hesba-dashboard-mobile`.
3. `cache-dependency-path` updated to `hesba-dashboard-mobile/package-lock.json`.

Why:
- Align mobile CI workflow with real folder structure so triggers/execution are valid.

### `docs/system_architecture_overview.md`
Changes:
1. Updated compose status note to reflect that build contexts are now aligned with `hesba-*` folders.
2. Kept note that some legacy service/container naming remains.

Why:
- Keep architecture doc accurate after infra cleanup.

## 2) New Study Docs Created
1. `study-docs/18_ci_docker_config_audit.md`
2. `study-docs/19_ci_docker_fix_plan.md`
3. `study-docs/20_ci_docker_verification.md`
4. `study-docs/21_ci_docker_change_log.md`

## 3) Issues Fixed
1. Broken compose build contexts referencing non-existent folders.
2. CI workflows referencing non-existent folder paths for triggers/execution/cache.
3. Active CI/Docker naming defaults using legacy product name in corrected files.
4. Obsolete compose schema key warning (`version`) removed.

## 4) Issues Intentionally Deferred
1. Compose `container_name` values (`daftar_*`) were not renamed to avoid breaking unknown local scripts/tooling.
2. `package.json` package names (`dafter-*`) were not changed due potential downstream tooling impact.
3. No broad CI redesign or deployment workflow expansion was attempted (out of scope).

## 5) Decision Rationale
- Prioritized high-confidence functional mismatches first (paths that were definitely broken).
- Avoided risky renames that might impact external scripts/runtime conventions.
- Kept changes surgical, reviewable, and limited to infra/config alignment.
