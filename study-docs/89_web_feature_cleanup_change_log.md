# Web Feature Cleanup Change Log (Pass 1)

## Code Files Changed
1. `hesba-dashboard/src/features/customers/components/CustomersPageClient.tsx`
   - Removed inline export row-mapping block from `handleExportExcel`.
   - Replaced it with a call to `buildCustomerExportRows(...)`.

2. `hesba-dashboard/src/features/customers/utils/customer-export.ts` (new)
   - Added feature-local utility to shape customer export rows.
   - Preserves previous export labels, order, status mapping, and currency formatting.

## Study-Docs Files Created
1. `study-docs/86_web_feature_structural_audit.md`
2. `study-docs/87_web_feature_cleanup_plan.md`
3. `study-docs/88_web_feature_cleanup_verification.md`
4. `study-docs/89_web_feature_cleanup_change_log.md`

## What Was Improved
- Clarified boundary between page orchestration and export data-shaping.
- Reduced mixed UI/data-shaping responsibility inside `CustomersPageClient`.
- Kept the improvement narrow and localized to Customers feature.

## What Was Intentionally Deferred
1. Cross-feature export pattern consolidation (Users/Suppliers/Employees/etc.).
2. Broader Customers page decomposition beyond this one boundary improvement.
3. Any API/query hook redesign.

## Follow-Up Candidates
1. Apply the same extraction pattern to one additional feature page (e.g., Suppliers) in a separate narrow pass.
2. Introduce a lightweight shared export-row helper pattern only if repeated safely across features.
