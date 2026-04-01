# Module Delivery Checklist (Daftar)

Use this checklist for every module before merge.

## A. Before Coding
- [ ] Backend controller/routes reviewed.
- [ ] DTOs and validation rules reviewed.
- [ ] Dependencies on other modules identified.
- [ ] UX flow for top 3 frequent actions drafted.

## B. API Layer
- [ ] Endpoints added/updated in `src/lib/api/config.ts`.
- [ ] Typed service added in `src/lib/api/services/[module].ts`.
- [ ] React Query hooks added in `src/lib/api/hooks/use-[module].ts`.
- [ ] Query keys defined and invalidation strategy set.
- [ ] Uses normalized list query params (`query-params.ts`).

## C. UI Layer
- [ ] Placeholder removed and replaced by functional page.
- [ ] List page implemented (search/filter/pagination).
- [ ] Create/Edit form implemented with validation.
- [ ] Details page or detail panel implemented (if required).
- [ ] Destructive actions have explicit confirmation.
- [ ] Loading, empty, error states implemented.

## D. Security & Access
- [ ] Role/permission checks applied to page and actions.
- [ ] Unauthorized behavior tested.

## E. i18n
- [ ] Keys added in `messages/en/[module].json`.
- [ ] Keys added in `messages/ar/[module].json`.
- [ ] No hardcoded UI strings in module components.
- [ ] `npm run i18n:check` passes.

## F. Validation
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Smoke test done with running backend.
- [ ] Edge cases covered (empty results, invalid input, API failure).

