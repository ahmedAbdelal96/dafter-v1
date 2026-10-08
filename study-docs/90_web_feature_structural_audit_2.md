# Web Feature Structural Audit (Pass 2)

## 1) Selected Feature Area and Why
- Selected area: `hesba-dashboard/src/features/suppliers`.
- Reason: Suppliers has the same proven low-risk cleanup pattern used in Customers (inline export-row shaping inside page component), making it an equivalent high-confidence candidate.

## 2) High-Level Feature Flow Summary
1. `SuppliersPageClient` manages filters, pagination, create/edit/delete modals, and export actions.
2. Data reads/writes go through `use-suppliers` hooks.
3. Hooks delegate HTTP operations and response normalization to `suppliersApi`.
4. Table/toolbar/modals render presentation and trigger page handlers.
5. Export path currently fetches all pages and maps rows inline in page component.

## 3) Key Files / Functions / Modules
- `src/features/suppliers/components/SuppliersPageClient.tsx`
- `src/features/suppliers/components/SuppliersTable.tsx`
- `src/features/suppliers/components/SuppliersToolbar.tsx`
- `src/features/suppliers/utils/supplier-format.ts`
- `src/lib/api/hooks/use-suppliers.ts`
- `src/lib/api/services/suppliers.ts`

## 4) Responsibility Map
- `SuppliersPageClient`: feature orchestration, query parameter state, modal state, export trigger.
- `use-suppliers`: React Query wiring and cache invalidation.
- `suppliersApi`: backend data contract normalization.
- supplier utils: formatting and numeric parsing.
- UI components: view rendering and UI event hooks.

## 5) Structural Smells Found
1. Export row-shaping logic is inline in `SuppliersPageClient`, mixing UI orchestration with data transformation.
2. Page component carries both flow control and export mapping concerns, increasing local complexity.
3. Export mapping boundary is less discoverable for reuse/testing compared with a feature-local utility.

## 6) Top Cleanup Opportunities
1. Extract suppliers export row-shaping into feature-local utility.
2. Keep page focused on orchestration (fetch scope + modal state + notifications).
3. (Deferred) unify similar export-row utilities across all list features.

## 7) Recommended Narrow Scope For This Pass
- One improvement only:
  - move export mapping in Suppliers page to `features/suppliers/utils` utility.
  - preserve translation keys, column order, and formatting exactly.

## 8) Confidence Level
- **High** for a behavior-safe structural cleanup with low implementation risk.
