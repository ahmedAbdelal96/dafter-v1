# Web Feature Cleanup Change Log (Pass 2)

## Code Files Changed
1. `hesba-dashboard/src/features/suppliers/components/SuppliersPageClient.tsx`
   - Removed inline suppliers export-row mapping from page component.
   - Replaced with utility call to `buildSupplierExportRows(...)`.

2. `hesba-dashboard/src/features/suppliers/utils/supplier-export.ts` (new)
   - Added feature-local helper for suppliers export row shaping.
   - Preserves current export labels, row order, and value formatting behavior.

## Study-Docs Files Created
1. `study-docs/90_web_feature_structural_audit_2.md`
2. `study-docs/91_web_feature_cleanup_plan_2.md`
3. `study-docs/92_web_feature_cleanup_verification_2.md`
4. `study-docs/93_web_feature_cleanup_change_log_2.md`

## What Was Improved
- Clearer boundary between Suppliers page orchestration and export data shaping.
- Reduced mixed responsibilities inside `SuppliersPageClient`.
- Matched the same safe structural pattern used previously in Customers.

## What Was Intentionally Deferred
1. Cross-feature extraction/standardization of export-row utilities.
2. Broader Suppliers feature decomposition or architecture-level changes.
3. Any API/query refactor or contract-level adjustments.

## Follow-Up Candidates
1. Optional third narrow pass on a similar feature (e.g., Employees or Users) to continue boundary cleanup consistency.
2. Later low-risk shared export-helper pattern if repeated feature utilities prove stable.
