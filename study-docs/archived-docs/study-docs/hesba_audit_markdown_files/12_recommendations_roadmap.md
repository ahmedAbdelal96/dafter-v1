# Recommendations & Roadmap

## Phase 1 — Stabilize the foundation (highest priority)
1. Standardize product naming across repo, apps, Docker, CI, docs, envs
2. Remove committed logs/zip/tmp/generated artifacts
3. Fix CI triggers, working directories, and actual quality gates
4. Rewrite root/app READMEs and architecture docs to match reality
5. Audit UTF-8 / Arabic text encoding across backend/web/mobile

## Phase 2 — Protect core correctness
1. Add backend integration tests for accounting-critical flows
2. Add auth/role/tenant isolation tests
3. Add contract tests for API responses/errors
4. Add smoke e2e for critical web/mobile flows

## Phase 3 — Clarify shared contracts
1. Define canonical role model
2. Define auth/session lifecycle
3. Decide real shared API-client strategy
4. Standardize error shapes and entitlement handling

## Phase 4 — Improve maintainability
1. Introduce monorepo contribution standards
2. Standardize frontend feature-module layout
3. Split oversized screens/coordination files
4. Add ADRs for major architecture decisions

## Phase 5 — Performance and operations hardening
1. Query instrumentation and dashboards
2. Performance budgets for key endpoints/screens
3. Load-test integration into release process
4. Health checks / readiness / deployment runbooks

## Suggested ownership model
- Platform/infra owner: CI/CD, Docker, envs, repo hygiene
- Backend domain owners: accounting modules by bounded context
- Frontend owner(s): web/mobile standards and auth/session UX
- Product/architecture owner: docs, naming, contract alignment
