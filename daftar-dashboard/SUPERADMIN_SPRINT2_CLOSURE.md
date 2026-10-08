# Super Admin Sprint 2 Closure

Date: 2026-03-10  
Scope: `super-admin/platform-users`

## Completed Items

1. Platform users module delivery
- Implemented canonical route: `/{locale}/super-admin/platform-users`.
- Added legacy compatibility route: `/{locale}/super-admin/users` -> redirects to canonical route.
- Updated super-admin navigation to use canonical route.

2. Core user management workflows
- Tenant-scoped users list with:
  - company selector
  - search / status filter / pagination
- Create staff user flow with:
  - in-modal company selector
  - form validation and permission controls
- Edit user flow (basic profile fields).
- Update permissions flow.
- Enable/disable user actions.
- User details modal.

3. Stability and regression safeguards
- Added UX guard for create flow when company is not selected.
- Disabled focus-triggered refetch on platform-users queries to reduce noisy repeated requests in day-to-day usage.
- Kept export flow aligned with current filters and selected tenant.

## Route Canonicalization

- Canonical: `/{locale}/super-admin/platform-users`
- Backward compatibility:
  - middleware normalizes `/superadmin/*` -> `/super-admin/*`
  - `/super-admin/users` redirects to `/super-admin/platform-users`

## Validation

- `npm run i18n:check` -> passed
- `npx eslint src/components/ui/modal/index.tsx src/features/platform-users/components/UserCreateModal.tsx src/features/platform-users/components/UsersPageClient.tsx src/lib/api/hooks/use-platform-users.ts src/config/route-access.ts src/config/navigation-items.tsx` -> passed (with existing non-blocking warning from `react-hook-form watch` usage)

## Notes

- Arabic translation readability remains tied to UTF-8 handling in editor/runtime; keep files in UTF-8 and validate via `i18n:check`.
- Next sprint target: Sprint 3 (`plans` module + subscription plan-change + governance baseline).
