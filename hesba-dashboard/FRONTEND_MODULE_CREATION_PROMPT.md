# Daftar Frontend Module Creation Prompt (Backend-First)

Use this file as the single source of truth whenever you build any new frontend module in `dafter-dashboard`.

---

## 1) Mission

Build each module as production-grade software for **Daftar Accounting Platform**, aligned with real backend contracts in `dafter-api-v1`.

Your implementation must be:
- Correct to backend routes/DTOs
- Fast to use for daily operations
- Maintainable and scalable
- Fully localized (AR/EN)
- Safe against regressions (type, i18n, permissions)

---

## 2) Mandatory Engineering Standard

Apply this standard on every module:

> Write the code as if you are a senior software developer, following best practices for code quality, maintainability, performance, and scalability. Structure and organize the code clearly, using modern design principles and patterns where appropriate. Handle edge cases and errors properly, and add clear explanatory comments where helpful. If there are important design decisions or performance optimizations, explain them in the code comments.

---

## 3) Non-Negotiable Rules

1. Backend-first, never UI-first.
2. Never assume API fields; inspect actual response shape first.
3. No hardcoded business text in pages/components.
4. No `ModulePlaceholder` in finished modules.
5. No `any` in module code unless justified and documented.
6. AR/EN translation keys must be added in the same PR.
7. `npm run i18n:check` must pass.
8. All pages must support loading, error, empty, success states.
9. All mutating actions must provide clear user feedback.
10. Role/permission checks must be enforced at page and action level.
11. Reusable UI first: filters/selectors must use shared components (e.g. `Combobox`) before creating module-specific alternatives.
12. Target fastest path to action: primary user goal should be reachable with minimal clicks and clear defaults.
13. Any export action must open scope modal first (date range + optional max rows), not direct download.
14. Export requests must send only API-supported filters (verify in backend DTO/controller before wiring).

---

## 4) Required Discovery Before Writing Code

For module `[module-name]`, do this first:

1. Inspect backend:
- `dafter-api-v1/src/modules/[module-name]/**`
- Controller endpoints and HTTP methods
- DTOs and validation constraints
- Auth/guards + role expectations
- Error scenarios and status codes

2. Map dependencies:
- Which modules must exist first (e.g. invoices depend on customers/products)
- Which shared data is needed (users, tenant, settings)

3. Build a feature map:
- Pages needed (list/create/edit/details/actions)
- Critical actions (approve/cancel/pay/etc.)
- Filters needed for real workflow
- Table columns based on user decisions

4. UX plan for speed:
- What users do most frequently
- Which actions need quick shortcuts
- Which defaults reduce clicks

Do not start coding before this map is clear.

---

## 5) Project File Conventions

## 5.1 Pages
- `src/app/[locale]/(admin)/[module]/...`
- `src/app/[locale]/super-admin/[module]/...` (if platform scope)

## 5.2 Feature folder
- `src/features/[module]/components/*`
- `src/features/[module]/hooks/*` (optional)
- `src/features/[module]/utils/*` (optional)
- `src/features/[module]/types.ts` (if module-specific)

## 5.3 API layer
- `src/lib/api/services/[module].ts`
- `src/lib/api/hooks/use-[module].ts`
- `src/lib/api/config.ts` (endpoints registry)
- `src/lib/api/hooks/query-keys.ts`

## 5.4 Translations
- `messages/en/[module].json`
- `messages/ar/[module].json`

Never create `src/messages`.

---

## 6) Data Contract Workflow (Strict)

Before any component:
1. Define TS types from backend DTO/response.
2. Implement service methods matching routes exactly.
3. Implement query/mutation hooks with:
- Proper cache keys
- Targeted invalidation
- Error normalization
4. Only then implement UI.

---

## 7) UX Blueprint for Every Module

Each module should include (as applicable):
- List page with search/filter/sort/pagination
- Create form
- Edit form
- Details/overview panel
- Safe delete or status transition flow
- Export flow with explicit scope selection (date range + max rows) when export exists

UX priorities:
- Most common actions in 1-2 clicks
- Clear status badges and action availability
- Confirm destructive actions
- Keyboard-friendly forms
- Mobile-safe layouts for key operations
- Reusable filter controls (`Combobox`, date-range, pagination controls) across modules for consistent behavior
- Smart defaults and quick-select values for high-frequency operations

### 7.2 Export UX Contract (Mandatory)

When implementing any export action:
- Show `ExportScopeModal` before exporting.
- Scope fields:
  - `dateFrom` (optional)
  - `dateTo` (optional)
  - `maxRecords` (optional, positive integer)
- Pre-fill scope modal with current page filters when available.
- Export should fetch complete dataset (multi-page) within scope, not only current visible page.
- Respect current locale for file labels/sheet names and RTL behavior where relevant.
- Before sending scope fields to API, verify endpoint supports them in backend DTO/controller.
- Never send unsupported query params to avoid validation errors (`400 Bad Request`).

### 7.1 Reusable Selection Pattern (Mandatory)

When a module needs any selection UI (status, page size, related entity, product, customer, supplier, etc.):
- Use shared `Combobox` component from `src/components/ui/combobox/Combobox.tsx`.
- Avoid raw `<select>` in module pages unless there is a strong accessibility/performance reason.
- Keep option mapping in the module component via `useMemo`.
- Support clear/reset behavior and predictable fallback value.
- For remote datasets, support debounced search and loading/empty states.
- Always localize placeholder, empty text, and search hint.

---

## 8) i18n and Encoding Safety

1. All user-facing strings use `next-intl`.
2. Add keys in EN and AR together.
3. Keep files UTF-8 clean.
4. Run:
- `npm run i18n:check`
5. Block merge if:
- Missing keys
- `???` text
- Mojibake (`Ã`, `Ø`, `Ù`, replacement chars)

---

## 9) Done Definition (Module)

A module is done only if all are true:

1. Backend endpoints fully integrated and tested.
2. Placeholder removed from target route.
3. List + form + details + actions completed (module-appropriate).
4. Permission checks enforced.
5. Loading/error/empty states implemented.
6. AR/EN translations complete and validated.
7. `npm run i18n:check` passes.
8. `npm run build` passes.
9. Basic smoke test performed against live local API.
10. Change summary documented in PR notes.
11. Reusable UX controls are applied (or justified if not used).

---

## 10) Execution Prompt (Use This)

Copy this prompt when starting any module:

```md
Implement module: [MODULE_NAME] for Daftar Accounting dashboard.

Context:
- Frontend: d:\Web\full-projects\daftar-v1\dafter-dashboard
- Backend: d:\Web\full-projects\daftar-v1\dafter-api-v1
- API base: /api/v1

Process (strict):
1) Analyze backend controller + DTOs for this module.
2) Produce endpoint and data-contract map.
3) Implement/adjust API service + query hooks + query keys.
4) Build pages/components in correct route location.
5) Implement full UX states (loading/error/empty/success).
6) Add translations in messages/en + messages/ar for all keys.
7) Run i18n and build validation.
8) Summarize decisions, risks, and next steps.

Engineering standard:
Write the code as if you are a senior software developer, following best practices for code quality, maintainability, performance, and scalability. Structure and organize the code clearly, using modern design principles and patterns where appropriate. Handle edge cases and errors properly, and add clear explanatory comments where helpful. If there are important design decisions or performance optimizations, explain them in the code comments.
```

---

## 11) Module Priority Anchor

Always follow module order from:
- `FRONTEND_MODULES_PRIORITY.md`

If request conflicts with dependency order:
- Document dependency risk
- Propose minimal safe sequence
- Then implement

---

## 12) Quick Anti-Patterns

Do not:
- Build UI before endpoint mapping
- Copy template module blindly
- Add untyped response handling
- Skip AR/EN parity
- Use static mock data in finished pages
- Leave TODOs in core flow without explicit note

Do:
- Prefer reusable patterns
- Keep components focused and testable
- Keep API calls centralized
- Keep UX simple and operation-centric
