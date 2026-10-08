# 32 - Repo Hygiene Change Log

Date: 2026-04-01
Repository: Hesba

## Files deleted
- `hesba-api-v1/.codex-api.log`
  - Reason: local runtime log artifact; should not be versioned.
- `hesba-api-v1/tmp-start.log`
  - Reason: temporary startup log artifact.
- `hesba-api-v1/tmp_swagger_run.out.log`
  - Reason: temporary command output log.
- `hesba-api-v1/tmp_swagger_run.err.log`
  - Reason: temporary command error log.

## Files changed
- `/.gitignore` (created)
  - Reason: root-level ignore baseline was missing; added conservative rules for logs/temp/cache/build/env-local/archive/editor artifacts.

## Study-docs files created
- `study-docs/29_repo_hygiene_audit.md`
- `study-docs/30_repo_hygiene_fix_plan.md`
- `study-docs/31_repo_hygiene_verification.md`
- `study-docs/32_repo_hygiene_change_log.md`

Reason: required audit/plan/verification/change-log outputs for this hygiene pass.

## Deferred suspicious items (not deleted)
- `hesba-api-v1/tmp-invoice-create-diag.ts`
- `hesba-api-v1/tmp-invoice-create-direct.ts`
- `hesba-api-v1/tmpclaude-172b-cwd`

Reason: tracked files with diagnostic history; deferred for explicit manual decision in a dedicated cleanup pass.
