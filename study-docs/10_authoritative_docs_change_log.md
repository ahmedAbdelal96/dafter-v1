# Authoritative Docs Change Log

Date: 2026-04-01
Scope: creation of first authoritative, code-grounded technical docs.

## Files Created

1. `docs/system_architecture_overview.md`
- Purpose: high-level architecture baseline derived from code.
- Evidence highlights: backend bootstrap/module wiring, web/mobile API/auth/runtime files.

2. `docs/backend_module_map.md`
- Purpose: backend domain/module map from actual NestJS structure.
- Evidence highlights: `AppModule` imports, module folders, controller route prefixes, notifications queue wiring.

3. `docs/api_integration_guide.md`
- Purpose: explain real web/mobile API integration behavior and contract patterns.
- Evidence highlights: web/mobile API config + clients + auth stores + server auth actions/routes.

4. `study-docs/08_authoritative_docs_source_map.md`
- Purpose: explicit source-of-truth map with confidence ratings.

5. `study-docs/09_authoritative_docs_open_questions.md`
- Purpose: unresolved technical questions discovered during evidence review.

6. `study-docs/10_authoritative_docs_change_log.md`
- Purpose: this change log.

## Existing Files Updated

1. `study-docs/06_missing_docs_backlog.md`
- Update type: light status update.
- Decision: mark architecture/module-map/api-integration backlog items as completed in this pass, keep remaining items pending.

## Evidence Used (Primary)

- Backend:
- `hesba-api-v1/package.json`
- `hesba-api-v1/src/main.ts`
- `hesba-api-v1/src/app.module.ts`
- `hesba-api-v1/src/app.controller.ts`, `src/app.service.ts`
- `hesba-api-v1/prisma/schema.prisma`
- `hesba-api-v1/src/database/*`
- `hesba-api-v1/src/modules/*`
- `hesba-api-v1/src/common/guards/*`, `src/common/interceptors/*`, `src/logger/*`, `src/common/sentry/*`

- Web:
- `hesba-dashboard/package.json`
- `hesba-dashboard/next.config.ts`
- `hesba-dashboard/src/proxy.ts`
- `hesba-dashboard/src/lib/auth/*`
- `hesba-dashboard/src/app/api/auth/refresh/route.ts`
- `hesba-dashboard/src/lib/api/*` (config, http-client, contracts, response, services, hooks)
- `hesba-dashboard/src/providers/query-provider.tsx`

- Mobile:
- `hesba-dashboard-mobile/package.json`
- `hesba-dashboard-mobile/app.json`
- `hesba-dashboard-mobile/src/lib/api/*`
- `hesba-dashboard-mobile/src/stores/auth-store.ts`
- `hesba-dashboard-mobile/src/components/providers/*`
- `hesba-dashboard-mobile/src/app/_layout.tsx` and route-group layouts
- `hesba-dashboard-mobile/src/features/*/api|hooks`

## Major Documentation Decisions

1. Prioritized code-evidence over historical text/docs.
2. Marked unclear items explicitly as verification gaps instead of guessing.
3. Avoided publishing speculative deployment or exhaustive endpoint catalogs.
4. Recorded known drift/ambiguities (legacy naming, mixed response handling, mixed auth flow) as explicit risks.
