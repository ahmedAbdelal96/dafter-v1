# 35 - Tracked Temp Files Verification

Date: 2026-04-01
Repository: Hesba

## 1) Files moved/deleted/preserved
- Moved:
  - `hesba-api-v1/tmp-invoice-create-diag.ts`
    -> `hesba-api-v1/scripts/diagnostics/invoice-create-via-service.diag.ts`
  - `hesba-api-v1/tmp-invoice-create-direct.ts`
    -> `hesba-api-v1/scripts/diagnostics/invoice-create-via-use-case.diag.ts`
- Deleted:
  - `hesba-api-v1/tmpclaude-172b-cwd`
- Preserved:
  - Diagnostic logic/content preserved in the two moved scripts.

## 2) New paths if moved
- `hesba-api-v1/scripts/diagnostics/invoice-create-via-service.diag.ts`
- `hesba-api-v1/scripts/diagnostics/invoice-create-via-use-case.diag.ts`
- `hesba-api-v1/scripts/diagnostics/README.md` (new minimal context file)

## 3) Imports/runtime dependency impact
- Updated moved script imports from `./src/...` to `../../src/...` to match new folder depth.
- No backend runtime module wiring or business logic changed.
- These scripts are standalone manual diagnostics and not imported by application runtime.

## 4) Git/path verification
- Old paths existence checks returned `False` for all three original files.
- New diagnostics paths existence checks returned `True`.
- `git status` confirms intended outcome:
  - old temp files deleted
  - diagnostics folder/files added
  - study-docs outputs added

## 5) Unresolved items
- No unresolved target files remain in this narrow pass.
- Additional repository-wide temporary file triage (outside these three files) can be handled in future passes.

## 6) Confidence level
- High confidence.
