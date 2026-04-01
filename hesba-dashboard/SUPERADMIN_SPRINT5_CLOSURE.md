# Super Admin Sprint 5 Closure

Date: 2026-03-10  
Scope: Tenants edit/disable lifecycle completion

## Completed Items

1. Tenant lifecycle actions completed
- Enabled full tenant profile update flow from super-admin tenants page.
- Enabled workspace state toggle flow (disable/enable) with safe confirmation modal.
- Kept actions aligned with backend contracts:
  - `PATCH /platform/companies/:id`
  - `PATCH /platform/companies/:id/disable`
  - `PATCH /platform/companies/:id/enable`

2. Tenant list hardening
- Added server-side sort controls (created date, updated date, name).
- Wired sort state to platform companies query and reset behavior.
- Kept pagination/filter integration stable with existing query key strategy.

3. Form and localization hardening
- Added stricter currency code validation (exactly 3 uppercase letters) before mutations.
- Localized tenants page metadata via `next-intl` namespace instead of static text.
- Added EN/AR translation keys for:
  - tenants metadata
  - filter sort controls
  - currency validation messages

## Validation

- `npm run i18n:check` -> passed  
- `npm run build` -> passed

## Notes

- Backend and frontend tenant lifecycle are now consistent for edit/disable/enable.
- Future lifecycle work (archive/delete) should be introduced as a separate guarded workflow to avoid destructive misuse.
