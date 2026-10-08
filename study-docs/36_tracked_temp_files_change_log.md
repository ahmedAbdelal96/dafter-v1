# 36 - Tracked Temp Files Change Log

Date: 2026-04-01
Repository: Hesba

## Files moved
- `hesba-api-v1/tmp-invoice-create-diag.ts`
  -> `hesba-api-v1/scripts/diagnostics/invoice-create-via-service.diag.ts`
  - Reason: preserve diagnostic value while removing root-level temporary naming/noise.

- `hesba-api-v1/tmp-invoice-create-direct.ts`
  -> `hesba-api-v1/scripts/diagnostics/invoice-create-via-use-case.diag.ts`
  - Reason: preserve useful diagnostic repro script in intentional location.

## Files deleted
- `hesba-api-v1/tmpclaude-172b-cwd`
  - Reason: local path artifact with no source/runtime/diagnostic value.

## Folders created
- `hesba-api-v1/scripts/diagnostics/`
  - Reason: explicit organization for manual backend diagnostic scripts.

## Files created
- `hesba-api-v1/scripts/diagnostics/README.md`
  - Reason: minimal explanation that these scripts are manual diagnostics.

- `study-docs/33_tracked_temp_files_audit.md`
- `study-docs/34_tracked_temp_files_fix_plan.md`
- `study-docs/35_tracked_temp_files_verification.md`
- `study-docs/36_tracked_temp_files_change_log.md`
  - Reason: required outputs for audit/plan/verification/change log.

## Ignore rules changed
- None in this pass.

## Deferred items
- None from the three targeted files.
