# Web Feature Cleanup Plan (Pass 2)

## 1) Exact Files Proposed For Change
1. `hesba-dashboard/src/features/suppliers/components/SuppliersPageClient.tsx`
2. `hesba-dashboard/src/features/suppliers/utils/supplier-export.ts` (new)
3. `study-docs/90_web_feature_structural_audit_2.md` (created)
4. `study-docs/92_web_feature_cleanup_verification_2.md` (to create)
5. `study-docs/93_web_feature_cleanup_change_log_2.md` (to create)

## 2) Exact Cleanup Actions
1. Add feature-local export-row utility for Suppliers list export.
2. Replace inline export mapping in `SuppliersPageClient` with utility call.
3. Keep existing behavior intact (same labels, order, formats, and export flow).

## 3) Intended Behavioral Impact
- Intended impact: **none** (structural boundary clarity only).

## 4) Risk Assessment
- Low risk due to localized change in one feature boundary.
- No API hook/service contract changes.
- No UI flow redesign.

## 5) Rollback Notes
- Revert page import/call and remove new utility file.
- No data migration or runtime config changes required.

## 6) Verification Plan
1. Run `npm run build` in `hesba-dashboard`.
2. Confirm compile/type checks pass and suppliers routes remain included.
3. Document limitations (no manual browser walkthrough in this pass).
