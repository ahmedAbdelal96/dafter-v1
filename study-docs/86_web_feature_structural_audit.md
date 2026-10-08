# Web Feature Structural Audit (Pass 1)

## 1) Selected Feature Area and Why
- Selected area: `hesba-dashboard/src/features/customers`.
- Reason: this feature has a clear page -> query hooks -> API service chain and contains a practical mixed-responsibility hotspot in export handling, making it a low-risk, high-confidence candidate for one narrow cleanup.

## 2) High-Level Feature Flow Summary
1. `CustomersPageClient` owns screen state (filters, pagination, modals, export UI).
2. Data fetching/mutations go through `use-customers` hooks.
3. Hooks delegate network calls to `customersApi` service.
4. UI rendering is split across toolbar/table/modals.
5. Export action currently fetches all pages then maps rows inline in `CustomersPageClient` before Excel export.

## 3) Key Files / Modules Involved
- `src/features/customers/components/CustomersPageClient.tsx`
- `src/features/customers/components/CustomersToolbar.tsx`
- `src/features/customers/components/CustomersTable.tsx`
- `src/lib/api/hooks/use-customers.ts`
- `src/lib/api/services/customers.ts`
- `src/features/customers/utils/customer-format.ts`

## 4) Responsibility Map
- `CustomersPageClient`: orchestration + UI state + export orchestration.
- `use-customers` hooks: query/mutation cache orchestration.
- `customersApi`: request/response normalization and data transport boundary.
- UI components: presentational behavior and interaction events.
- Format utils: numeric/currency helpers.

## 5) Structural Smells Found
1. `CustomersPageClient` mixes UI orchestration and export row shaping logic.
2. Export column mapping is inline and tightly coupled to page code, increasing cognitive load.
3. Data-shaping logic for export sits in component instead of feature utility boundary.

## 6) Top Cleanup Opportunities
1. Extract customer export row shaping to a feature-local utility.
2. Keep page focused on orchestration (fetch scope + export trigger) only.
3. (Deferred) unify repeated export shaping patterns across multiple features.

## 7) Recommended Narrow Scope For This Pass
- Apply only opportunity #1 for Customers:
  - move export row mapping from `CustomersPageClient` into a small utility in `features/customers/utils`.
  - keep existing keys, labels, formatting, and export behavior exactly the same.

## 8) Confidence Level
- **High** for no user-visible behavior change and low implementation risk.
