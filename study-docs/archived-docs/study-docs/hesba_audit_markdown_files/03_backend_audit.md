# Backend Audit (`hesba-api-v1`)

## Strengths
- Good modular decomposition under `src/modules`
- Explicit config segmentation (`app`, `jwt`, `database`, `redis`, `email`, `bull`, `notification`)
- Common cross-cutting areas exist: guards, filters, interceptors, middleware, sentry, cache, entitlements
- Main bootstrap includes validation, Swagger, security middleware, throttling, and logging
- Prisma schema clearly reflects deliberate multi-tenant modeling

## Major findings

## 1) Architecture is promising but very broad for the visible quality controls
**Severity:** High  
**Why it matters:** The backend covers many accounting/business domains, but the visible test and CI surface is small. High-scope accounting systems need stronger correctness guarantees.

**Where**
- `src/modules/*`
- `prisma/schema.prisma`
- `test/`

**Recommendation**
- Identify critical transaction paths first: invoice creation, installments, deferred sales, ledger postings, cash reconciliation
- Add integration tests around accounting invariants and tenant isolation

## 2) Prisma schema is very large and likely a maintenance hotspot
**Severity:** High  
**Why it matters:** A very large schema can still be healthy, but it needs strong migration/test discipline and bounded domain ownership.

**Where**
- `prisma/schema.prisma`

**Recommendation**
- Document model ownership by domain
- Add invariant tests per domain area
- Consider splitting schema documentation by business subdomain, even if Prisma remains one file
- Define mandatory transaction boundaries for financial write paths

## 3) Bootstrap/security defaults are mixed: some good choices, some risky tradeoffs
**Severity:** Medium  
**Observations**
- Good: global validation pipe with whitelist/forbidNonWhitelisted
- Good: throttling and helmet are present
- Risk: permissive / special-case CORS and cross-origin policy settings need review in production context
- Risk: Swagger exposed at `/api/docs` may need environment gating

**Where**
- `src/main.ts`

**Recommendation**
- Gate Swagger by environment or auth in production
- Audit CORS allowed origins and cookie/token strategy end-to-end
- Verify all cross-origin policy settings were chosen intentionally and documented

## 4) Encoding issues are present even in backend bootstrap text
**Severity:** Medium  
**Why it matters:** Broken text in logs/docs/messages is usually a repo/tooling/encoding process problem, not just cosmetics.

**Where**
- `src/main.ts`
- likely other localized message files

**Recommendation**
- Standardize UTF-8 everywhere
- audit editor settings, shell scripts, CI locale, and file creation sources
- add a simple scan for replacement characters / mojibake patterns

## 5) Backend repo contains temp/generated artifacts
**Severity:** High  
**Why it matters:** Temporary scripts and build artifacts reduce trust in deployment quality and clutter review surface.

**Where**
Examples observed:
- `tmp-invoice-create-diag.ts`
- `tmp-invoice-create-direct.ts`
- `tmpclaude-172b-cwd`
- `tsconfig.build.tsbuildinfo`

**Recommendation**
- Remove from VCS
- add `.gitignore` protections
- move debugging utilities to a clearly named `tools/` or `scratch/` folder if truly needed (and usually exclude it from production)

## 6) CI workflow appears misaligned with actual repo state
**Severity:** Critical  
**Why it matters:** If CI points to old paths/branches, it may not be protecting the code at all.

**Where**
- `.github/workflows/api-ci.yml` (inside backend app)

**Observed concerns**
- workflow triggers mention `main` and `develop`
- repo default branch is `master`
- working directory/path references `dafter-api-v1`
- actual folder is `hesba-api-v1`

**Recommendation**
- repair branch triggers immediately
- fix working directories and cache paths
- add build/lint/test stages, not only policy-gate scripts

## 7) Test surface is too small for the domain complexity
**Severity:** Critical  
**Where**
- `test/app.e2e-spec.ts`
- `test/jest-e2e.json`

**Why it matters**
For a platform with accounting, installments, deferred sales, reconciliation, and multi-tenant concerns, the visible automated test footprint is far below what is needed.

**Recommendation**
Minimum next wave:
- tenant isolation tests
- invoice lifecycle tests
- installment schedule tests
- ledger balancing/invariant tests
- auth/role tests
- webhook/notification tests if applicable

## Additional backend recommendations
- Create domain ownership docs per module
- Add request/response contract tests for public API endpoints
- Add migration verification in CI
- Add redaction rules for logs
- Add health/readiness endpoints and observability documentation
