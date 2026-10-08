# Module Delivery Checklist (Hesba Dashboard)

Use this checklist for every module before merge.

## A. Before Coding
- [ ] Backend controller/routes reviewed.
- [ ] DTOs and validation rules reviewed.
- [ ] Dependencies on other modules identified.
- [ ] UX flow for top frequent actions drafted.

## B. API Layer
- [ ] Endpoints added/updated in `src/lib/api/config.ts`.
- [ ] Typed service added in `src/lib/api/services/[module].ts`.
- [ ] React Query hooks added in `src/lib/api/hooks`.
- [ ] Query keys and invalidation strategy defined.

## C. UI Layer
- [ ] Functional page implemented (no placeholder).
- [ ] List/search/filter/pagination behavior verified.
- [ ] Create/Edit form validation verified (if applicable).
- [ ] Empty/loading/error states implemented.
- [ ] Destructive actions have explicit confirmation.

## D. Security & Access
- [ ] Role/permission checks applied to page and actions.
- [ ] Unauthorized behavior tested.

## E. i18n
- [ ] Keys updated in `messages/en` and `messages/ar`.
- [ ] No hardcoded UI strings in module components.

## F. Validation
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Module smoke check completed.
