# 135 Web Feature Structural Audit (Pass 3)

## 1) Selected feature area and why
- Selected feature: `hesba-dashboard/src/features/users`.
- Reason: It aligns with recent backend Users cleanup and contains a clear, low-risk boundary hotspot in page-level export data shaping.

## 2) High-level feature flow summary
- `UsersPageClient` manages filters, list query, mutations, modals, and export flow.
- `use-users` hooks provide data/mutations.
- `usersApi` normalizes backend envelope/shape.
- UI is split across `UsersToolbar`, `UsersTable`, and modals.

## 3) Key files/functions/modules involved
- `src/features/users/components/UsersPageClient.tsx`
- `src/features/users/components/UsersToolbar.tsx`
- `src/features/users/components/UsersTable.tsx`
- `src/features/users/utils/user-format.ts`
- `src/lib/api/hooks/use-users.ts`
- `src/lib/api/services/users.ts`

## 4) Responsibility map
- Page client: orchestrates state + mutations + export trigger + modal control.
- Hooks/API: fetch/update and response normalization.
- Table/Toolbar: mostly presentational + interaction callbacks.
- Utils: currently role/status/permissions helpers; no dedicated export shaper yet.

## 5) Structural smells found
- `UsersPageClient` includes inline export row shaping logic inside `handleExportExcel`.
- This mixes page orchestration with data-to-export transformation responsibility.
- Pattern drifts from recent Customers/Suppliers refactors where export shaping moved to feature-local utility files.

## 6) Top cleanup opportunities
1. Extract users export-row mapping into `features/users/utils/user-export.ts`.
2. Keep export orchestration in page component while delegating row shaping to utility.
3. Align naming/pattern with existing `buildCustomerExportRows` / `buildSupplierExportRows` approach.

## 7) Recommended narrow scope for this pass
- Add one utility function for users export rows.
- Replace inline row mapping in `UsersPageClient` with utility call.
- No API/hook/query/UX changes.

## 8) Confidence level
- High confidence: single feature-local extraction with no expected behavior change.
