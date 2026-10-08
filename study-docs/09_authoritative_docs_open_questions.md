# Authoritative Docs Open Questions

Date: 2026-04-01
Scope: unresolved technical questions discovered while building code-grounded docs.

| Question | Why it matters | Where to investigate next | Priority |
|---|---|---|---|
| Is backend Sentry actually active at runtime? (`common/sentry` exists, but AppModule import is not confirmed) | Impacts production observability expectations and incident response | `hesba-api-v1/src/app.module.ts`, bootstrap/init modules, runtime env config | high |
| What is the canonical web auth model long-term (server-action cookie flow vs client token-manager hybrid)? | Affects security model, refresh logic complexity, and bug surface | `hesba-dashboard/src/lib/auth/*`, `src/lib/api/http-client.ts`, auth architecture decisions | high |
| Which response shape is contractually guaranteed per endpoint (envelope vs direct payload)? | Client normalization complexity and breaking-change risk | Backend controllers/DTO patterns + Swagger output, web/mobile extraction helpers | high |
| Is `maintenance` under `src/modules` intentionally dormant or incomplete? | Prevents docs from misrepresenting active module inventory | `hesba-api-v1/src/modules/maintenance`, roadmap/issues history | medium |
| Should legacy technical identifiers (`dafter_*`, old cookie keys, env names) be migrated now or deferred? | Naming drift affects maintainability and onboarding clarity | cross-repo config/auth/token files, dedicated refactor task planning | medium |
| Are web `types.ts` legacy enums intentionally preserved or stale drift? | Type drift can mask contract mismatches and runtime bugs | `hesba-dashboard/src/lib/api/types.ts` vs backend schema/controllers | high |
| What is the approved production API base URL strategy for mobile (explicit env vs hostUri fallbacks)? | Wrong base URL strategy causes environment-specific outages | `hesba-dashboard-mobile/src/lib/api/client.ts`, release env setup docs | medium |
| Are platform capabilities consumed consistently in web and mobile (hard-delete visibility etc.)? | Governance behavior must be consistent across clients | platform services/hooks in web/mobile + backend capabilities endpoint | medium |
| Is there a generated or CI-enforced API contract workflow planned? | Reduces drift between backend and two frontends | CI scripts, docs roadmap, possible OpenAPI generation pipeline | medium |
| What is the authoritative deployment topology for production? | Needed for infra docs and accurate ops runbooks | docker/compose, infra manifests, deployment scripts/pipelines | medium |
