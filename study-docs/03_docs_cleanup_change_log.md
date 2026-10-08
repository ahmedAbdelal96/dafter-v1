# Docs Cleanup Change Log

Date: 2026-04-01
Scope: documentation cleanup, safe archiving, and obvious artifact removal.

## Files Moved (Archived)

- `docs/DAFTAR_PROJECT_STUDY_AR.md` -> `study-docs/archived-docs/docs/DAFTAR_PROJECT_STUDY_AR.md`
- `docs/Daftar_WhatsApp_Orders_Execution_Spec_AR_v2.md` -> `study-docs/archived-docs/docs/Daftar_WhatsApp_Orders_Execution_Spec_AR_v2.md`
- `docs/dafter-system-docs.md` -> `study-docs/archived-docs/docs/dafter-system-docs.md`
- `docs/implementation_checklist.md` -> `study-docs/archived-docs/docs/implementation_checklist.md`
- `docs/Implementation_Plan.md` -> `study-docs/archived-docs/docs/Implementation_Plan.md`
- `docs/inhancmeent_plan.md` -> `study-docs/archived-docs/docs/inhancmeent_plan.md`
- `docs/NEW_MODULE_PROMPT.md` -> `study-docs/archived-docs/docs/NEW_MODULE_PROMPT.md`
- `docs/PRODUCTION_PLAN.md` -> `study-docs/archived-docs/docs/PRODUCTION_PLAN.md`
- `hesba-dashboard/ARCHITECTURE.md` -> `study-docs/archived-docs/hesba-dashboard/ARCHITECTURE.md`
- `hesba-dashboard/AUTH_FLOW.md` -> `study-docs/archived-docs/hesba-dashboard/AUTH_FLOW.md`
- `hesba-dashboard/BOOKINGS_COMPLETION_SUMMARY.md` -> `study-docs/archived-docs/hesba-dashboard/BOOKINGS_COMPLETION_SUMMARY.md`
- `hesba-dashboard/CORE_COMPONENTS.md` -> `study-docs/archived-docs/hesba-dashboard/CORE_COMPONENTS.md`
- `hesba-dashboard/DYNAMIC_NAVIGATION.md` -> `study-docs/archived-docs/hesba-dashboard/DYNAMIC_NAVIGATION.md`
- `hesba-dashboard/STRUCTURE.md` -> `study-docs/archived-docs/hesba-dashboard/STRUCTURE.md`
- `hesba-dashboard-mobile/BOOKINGS_PARITY_AUDIT.md` -> `study-docs/archived-docs/hesba-dashboard-mobile/BOOKINGS_PARITY_AUDIT.md`
- `study-docs/hesba_audit_markdown_files.zip` -> `study-docs/archived-docs/study-docs/hesba_audit_markdown_files.zip`
- `study-docs/hesba_audit_markdown_files/` -> `study-docs/archived-docs/study-docs/hesba_audit_markdown_files/`
- `stitch.zip` -> `study-docs/archived-docs/artifacts/stitch.zip`

Reason: legacy/misleading docs or non-baseline artifacts were preserved in archive instead of hard deletion.

## Files Deleted (Obvious Artifacts)

- `application-2026-03-19.log`
- `tmp_audit.js`
- `tmp_audit_out.txt`
- `tmp_check_out.txt`
- `tmp_diag.js`
- `tmp_fix_mojibake.js`
- `tmp_fix_win1252.js`
- `tmp_hardcoded_check.js`
- `tmp_s2_qa_runtime.ps1`
- `logs/.02b6704d06aced5b5048e0ca06a3a9dd30ce561b-audit.json`
- `logs/.24b02ce8ba70cac8f8cc5fbd0726f21af2e792fe-audit.json`
- `logs/.2f21340df2ca7ed3b7a897acfa6f601754f502fc-audit.json`
- `logs/.304156e0aba5c24013d6265161fe02dce76841ae-audit.json`
- `logs/.5fdc4fe626424902f777cc3af2fb3ae6bf58e3a6-audit.json`
- `logs/.c9a6578d222df4600c3d887ae3fe87fe2d46c9e6-audit.json`
- `logs/.f33c3888f2bf4d2c91f04a01be3101e5d8878ade-audit.json`
- `logs/api-2026-02-21.log`
- `logs/api-dev-runtime.log`
- `logs/api.log`
- `logs/combined-2026-02-21.log`
- `logs/debug-2026-02-21.log`
- `logs/error-2026-02-21.log`
- `logs/exceptions-2026-02-21.log`
- `logs/performance-2026-02-21.log`
- `logs/rejections-2026-02-21.log`

Reason: generated runtime/debug outputs and local temporary files should not be versioned.

## Files Edited

- `README.md` (created)
  - Added minimal root baseline README for Hesba and repo structure.
- `hesba-dashboard/README.md`
  - Replaced misleading legacy prompt content with temporary neutral placeholder.
- `hesba-dashboard-mobile/README.md`
  - Replaced generic Expo template text with temporary neutral placeholder.
- `hesba-api-v1/README.md`
  - Replaced generic Nest template text with temporary neutral placeholder.
- `study-docs/01_docs_cleanup_audit.md` (created)
  - Added docs audit, classification, and recommended actions.
- `study-docs/02_naming_inconsistency_report.md` (created)
  - Added naming baseline and deferred code/config rename boundaries.
- `study-docs/03_docs_cleanup_change_log.md` (created)
  - Added complete move/delete/edit record for this cleanup pass.
