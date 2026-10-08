# CI/Docker Fix Plan

Date: 2026-04-01
Scope: surgical config cleanup for path/name mismatches.

## 1) Files To Change
1. `docker-compose.yml`
2. `.github/workflows/backend-ci.yml`
3. `.github/workflows/web-ci.yml`
4. `.github/workflows/mobile-ci.yml`

Optional docs update (if materially justified):
5. `docs/system_architecture_overview.md`

## 2) Exact Problems and Planned Fixes

### `docker-compose.yml`
- Fix `api.build.context` from `./dafter-api-v1` to `./hesba-api-v1`.
- Fix `web.build.context` from `./dafter-dashboard` to `./hesba-dashboard`.
- Update `NEXT_PUBLIC_APP_NAME` default from `Daftar` to `Hesba`.

Safety:
- Changes only correct broken folder references and naming defaults.
- No runtime application logic is modified.

### `.github/workflows/backend-ci.yml`
- Update path filters to `hesba-api-v1/**`.
- Update default working directory to `hesba-api-v1`.
- Update npm cache dependency path to `hesba-api-v1/package-lock.json`.

Safety:
- Aligns workflow with real repository structure.

### `.github/workflows/web-ci.yml`
- Update path filters to `hesba-dashboard/**`.
- Update default working directory to `hesba-dashboard`.
- Update npm cache dependency path to `hesba-dashboard/package-lock.json`.
- Update CI build env `NEXT_PUBLIC_APP_NAME` to `Hesba Dashboard`.

Safety:
- Path corrections are structural and deterministic.
- App-name env update is naming cleanup only.

### `.github/workflows/mobile-ci.yml`
- Update path filters to `hesba-dashboard-mobile/**`.
- Update default working directory to `hesba-dashboard-mobile`.
- Update npm cache dependency path to `hesba-dashboard-mobile/package-lock.json`.

Safety:
- Aligns workflow with real repository structure.

## 3) What Will Be Verified After Changes
1. All changed workflow paths/directories exist locally.
2. Compose build contexts exist locally.
3. Compose file parses with `docker compose config` if Docker CLI is available.
4. Workflow files contain no remaining `dafter-*` path references.

## 4) Rollback Notes
1. Revert the four modified config files to previous commit/state.
2. No data migration or runtime state migration is required.
3. Rollback is purely file-level and immediate.
