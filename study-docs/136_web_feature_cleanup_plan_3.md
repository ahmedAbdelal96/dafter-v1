# 136 Web Feature Cleanup Plan (Pass 3)

## 1) Exact files proposed for change
- `hesba-dashboard/src/features/users/components/UsersPageClient.tsx`
- `hesba-dashboard/src/features/users/utils/user-export.ts` (new)
- `study-docs/135_web_feature_structural_audit_3.md` (created)
- `study-docs/136_web_feature_cleanup_plan_3.md` (this file)
- `study-docs/137_web_feature_cleanup_verification_3.md` (to be created)
- `study-docs/138_web_feature_cleanup_change_log_3.md` (to be created)

## 2) Exact cleanup actions
- Create `buildUserExportRows(users, t)` in feature-local utility.
- Replace inline export row mapping in `UsersPageClient` with this utility.
- Keep export orchestration (`fetchAllMetaItems`, `exportRowsToExcel`, notifications) unchanged.

## 3) Intended behavioral impact
- None intended.
- Same columns/labels/order/fallback values in exported sheet.

## 4) Risk assessment
- Low risk:
  - extraction-only, no API/query/mutation contract changes.
- Main risk: accidental column key mismatch during extraction.

## 5) Rollback notes
- Rollback by reverting `UsersPageClient` inline mapping and removing utility file.

## 6) Verification plan
1. Run `npm run build` in `hesba-dashboard`.
2. Confirm import/path correctness and TypeScript compilation success.
3. Ensure export call still passes rows from the same source data.
