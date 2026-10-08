# Web Feature Cleanup Plan (Pass 1)

## 1) Exact Files Proposed For Change
1. `hesba-dashboard/src/features/customers/components/CustomersPageClient.tsx`
2. `hesba-dashboard/src/features/customers/utils/customer-export.ts` (new)
3. `study-docs/86_web_feature_structural_audit.md` (created)
4. `study-docs/88_web_feature_cleanup_verification.md` (to create)
5. `study-docs/89_web_feature_cleanup_change_log.md` (to create)

## 2) Exact Cleanup Actions
1. Create a feature-local utility for customer export row shaping.
2. Replace inline row mapping inside `handleExportExcel` with utility call.
3. Keep existing translation keys, formatting, and column ordering unchanged.

## 3) Intended Behavioral Impact
- Intended impact: **none** (structural clarity only).

## 4) Risk Assessment
- Low risk:
  - isolated to customers feature.
  - no API contract change.
  - no query/mutation behavior change.

## 5) Rollback Notes
- Revert the new utility and page-file import/call changes.
- No migration or data changes involved.

## 6) Verification Plan
1. Run `npm run build` in `hesba-dashboard` (strong practical verification).
2. If needed, run `npm run lint` for static safety.
3. Confirm no user-visible flow changes were introduced in code paths.
