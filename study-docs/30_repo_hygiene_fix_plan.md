# 30 - Repo Hygiene Fix Plan

Date: 2026-04-01
Repository: Hesba

## 1) Exact cleanup actions
- Add a new root `.gitignore` with conservative, repo-wide hygiene rules.
- Delete only confirmed temporary/log artifacts in `hesba-api-v1`:
  - `.codex-api.log`
  - `tmp-start.log`
  - `tmp_swagger_run.out.log`
  - `tmp_swagger_run.err.log`
- Keep ambiguous tracked `tmp*.ts` diagnostic files deferred (no deletion in this pass).

## 2) Exact ignore rules to add/update
Add root rules for:
- dependencies/build outputs
- runtime logs and debug logs
- temp files (`tmp_*`, `tmp-*`)
- cache folders
- local env variants
- OS/editor artifacts
- accidental archive files (`*.zip`, `*.7z`, `*.rar`)

## 3) Why each deletion is safe
- Deleted files are plain runtime/command logs generated during local runs.
- No source/business logic content exists in these files.
- Removing them reduces noise without runtime impact.

## 4) Why each ignore rule is needed
- Prevent repeated accidental commits of machine-generated or local-only artifacts.
- Provide baseline hygiene protection at repository root across all subprojects.
- Reduce CI/review noise from transient files.

## 5) Rollback notes
- Restore deleted log files only if needed by re-running local commands; they are reproducible artifacts.
- Remove or adjust any root `.gitignore` rule if it conflicts with intentional future tracked assets.

## 6) Verification plan
- Confirm deleted files no longer exist.
- Confirm root `.gitignore` exists and includes required patterns.
- Run `git status` to ensure changes are narrow/surgical.
- Use `git check-ignore` samples to verify new ignore behavior on temp/log patterns.
