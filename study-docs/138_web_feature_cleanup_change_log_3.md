# 138 Web Feature Cleanup Change Log (Pass 3)

## Files changed
1. `hesba-dashboard/src/features/users/components/UsersPageClient.tsx`
- Improvement:
  - Replaced inline export row shaping in `handleExportExcel` with feature-local utility call.
- Why:
  - Clarifies feature boundary by separating page orchestration from export-data shaping.
- Behavioral impact:
  - None intended.

2. `hesba-dashboard/src/features/users/utils/user-export.ts` (new)
- Added `buildUserExportRows(users, t)` utility.
- Keeps the same export columns/labels/fallbacks previously defined inline in page component.

3. `study-docs/135_web_feature_structural_audit_3.md`
- Created audit for selected Users feature area.

4. `study-docs/136_web_feature_cleanup_plan_3.md`
- Created cleanup plan for the narrow pass.

5. `study-docs/137_web_feature_cleanup_verification_3.md`
- Created verification report with executed checks and build limitation.

6. `study-docs/138_web_feature_cleanup_change_log_3.md`
- This file.

## Intentionally deferred
- No broader refactor of `UsersPageClient` responsibilities.
- No hook/service contract changes.
- No UI/flow/API contract changes.
- No additional tests added in this pass.

## Follow-up candidates
1. Add a small unit test for `buildUserExportRows(...)`.
2. In a separate narrow pass, evaluate extracting one additional localized boundary (e.g., create/update payload builders) from `UsersPageClient` only if still high-confidence.
3. Investigate and stabilize the existing Next/Turbopack font build issue independently.
