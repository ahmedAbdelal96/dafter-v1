# 29 - Repo Hygiene Audit

Date: 2026-04-01
Repository: Hesba
Scope: Root + `hesba-api-v1` + `hesba-dashboard` + `hesba-dashboard-mobile` + `study-docs`

## 1) Current hygiene issues found
- Root repository had no `.gitignore` file.
- Runtime/temp log artifacts were present in backend folder:
  - `hesba-api-v1/.codex-api.log`
  - `hesba-api-v1/tmp-start.log`
  - `hesba-api-v1/tmp_swagger_run.out.log`
  - `hesba-api-v1/tmp_swagger_run.err.log`
- Historical root-level noise patterns were observed in git history/status context (`tmp_*`, `*.zip`, root `logs/*`).

## 2) Current ignore-rule gaps
- Missing root-level ignore rules for cross-repo artifacts:
  - logs
  - temporary files (`tmp_*`, `tmp-*`)
  - archive exports (`*.zip`, `*.7z`, `*.rar`)
  - common caches/build outputs when created at root level
- App-level `.gitignore` files exist and are mostly good, but do not replace root protection.

## 3) Files/folders safe to remove now
- `hesba-api-v1/.codex-api.log` (local runtime log)
- `hesba-api-v1/tmp-start.log` (temporary startup log)
- `hesba-api-v1/tmp_swagger_run.out.log` (temporary command output)
- `hesba-api-v1/tmp_swagger_run.err.log` (temporary command error output)

## 4) Files/folders that should be ignored going forward
- Root-level logs and debug outputs: `logs/`, `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`
- Root-level temp artifacts: `tmp/`, `.temp/`, `.tmp/`, `tmp_*`, `tmp-*`
- Build/cache artifacts: `dist/`, `build/`, `out/`, `.next/`, `coverage/`, `.cache/`, `.turbo/`, `.eslintcache`, `.parcel-cache/`
- Local env variants: `.env`, `.env.local`, `.env.*.local`
- Accidental archive exports: `*.zip`, `*.7z`, `*.rar`

## 5) Suspicious items deferred for manual review
- `hesba-api-v1/tmp-invoice-create-diag.ts`
- `hesba-api-v1/tmp-invoice-create-direct.ts`
- `hesba-api-v1/tmpclaude-172b-cwd`

Reason for deferral:
- These files are currently tracked by git and may have been used for ad-hoc diagnostics.
- Their naming suggests temporary/debug purpose, but deletion was deferred for conservative safety.

## 6) Exact files likely to be changed in this pass
- `/.gitignore` (new root hygiene baseline)
- `study-docs/29_repo_hygiene_audit.md`
- `study-docs/30_repo_hygiene_fix_plan.md`
- `study-docs/31_repo_hygiene_verification.md`
- `study-docs/32_repo_hygiene_change_log.md`
- delete selected backend temp/log artifacts listed above
