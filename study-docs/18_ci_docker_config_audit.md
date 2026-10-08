# CI/Docker Config Audit

Date: 2026-04-01
Scope: focused infrastructure/config audit for Hesba repository paths and CI/Docker consistency.

## 1) Confirmed Stale or Mismatched References

### `docker-compose.yml`
1. `api.build.context` points to `./dafter-api-v1` (folder does not exist).
2. `web.build.context` points to `./dafter-dashboard` (folder does not exist).
3. `NEXT_PUBLIC_APP_NAME` default is `Daftar`.
4. Service/container names use legacy `daftar_*` naming.

Impact:
- Items (1) and (2) are functional breakages for compose builds.
- Item (3) is naming inconsistency (not a build breaker).
- Item (4) is mostly cosmetic/ops naming drift; changing it may affect external scripts using container names.

### `.github/workflows/backend-ci.yml`
1. `paths` filters target `dafter-api-v1/**` (non-existent path).
2. `working-directory` is `dafter-api-v1` (non-existent).
3. `cache-dependency-path` points to `dafter-api-v1/package-lock.json` (non-existent).

Impact:
- Workflow can fail or not trigger correctly for actual backend changes.

### `.github/workflows/web-ci.yml`
1. `paths` filters target `dafter-dashboard/**` (non-existent path).
2. `working-directory` is `dafter-dashboard` (non-existent).
3. `cache-dependency-path` points to `dafter-dashboard/package-lock.json` (non-existent).
4. Build env uses `NEXT_PUBLIC_APP_NAME: "Daftar Dashboard"`.

Impact:
- Workflow trigger/execution mismatch with actual web folder.

### `.github/workflows/mobile-ci.yml`
1. `paths` filters target `dafter-dashboard-mobile/**` (non-existent path).
2. `working-directory` is `dafter-dashboard-mobile` (non-existent).
3. `cache-dependency-path` points to `dafter-dashboard-mobile/package-lock.json` (non-existent).

Impact:
- Workflow trigger/execution mismatch with actual mobile folder.

## 2) Broken or Suspicious Paths
- Broken (confirmed non-existent):
  - `dafter-api-v1`
  - `dafter-dashboard`
  - `dafter-dashboard-mobile`
- Valid current folders:
  - `hesba-api-v1`
  - `hesba-dashboard`
  - `hesba-dashboard-mobile`

## 3) Branch/Reference Mismatch Check
- Workflows currently use `branches: [main, master]`.
- Repository local branch is `master`.
- No immediate branch-trigger break is confirmed from branch names alone.

## 4) Legacy Naming Affecting CI/Docker Behavior
- `dafter-*` path references in workflows and compose are directly harmful.
- `Daftar` naming in env defaults/comments is misleading and should be corrected where low-risk.

## 5) Safe-To-Fix Now (High Confidence)
1. Update compose build contexts to `hesba-*` folders.
2. Update workflow `paths`, `working-directory`, and `cache-dependency-path` to `hesba-*` folders.
3. Update `NEXT_PUBLIC_APP_NAME` defaults/CI env from `Daftar` to `Hesba` where directly tied to these configs.

## 6) Deferred Items
1. Renaming compose `container_name` values (`daftar_*`) is deferred to avoid accidental break for local tooling/scripts.
2. Package names inside each `package.json` (`dafter-*`) are deferred because they may have publishing/tooling implications beyond this focused pass.
3. Any broad CI redesign (matrices, extra jobs, deployment changes) is out of scope.
