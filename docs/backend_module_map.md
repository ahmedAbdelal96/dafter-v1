# Backend Module Map

Date: 2026-04-01
Status: authoritative baseline from current `hesba-api-v1` structure

## 1) Backend Overview
`hesba-api-v1` is a NestJS monolith-style API with modular domain boundaries, Prisma/PostgreSQL persistence, Redis-backed queueing, and Swagger documentation.

## 2) Confirmed Stack / Runtime
- NestJS + TypeScript
- Node.js (engine range in package.json)
- Prisma ORM + PostgreSQL driver (`pg`)
- Redis + Bull queueing (`@nestjs/bull`, `bull`)
- Swagger (`@nestjs/swagger`)
- Throttling (`@nestjs/throttler`)
- i18n (`nestjs-i18n`)
- Central logging with Winston rotate-file transports

## 3) Module Organization Approach
Observed dominant shape under `src/modules/*`:
- `{module}.module.ts`
- `{module}.controller.ts`
- `{module}.service.ts`
- `{module}.repository.ts`
- `dto/`
- `use-cases/`

Not every module implements all layers identically.

## 4) Major Domain Modules (from `src/modules` + `AppModule` imports)

### Identity / Access / Tenant Context

| Module | Apparent responsibility | Important visible parts | Notable integrations | Confidence |
|---|---|---|---|---|
| `auth` | Login, register, token refresh, session/user auth operations | controller/service/repository/dto/use-cases present | uses notifications integration paths for auth-related flows | high |
| `users` | Tenant user/staff lifecycle | controller/service/repository/dto/use-cases | permissions + role checks in guards/decorators | high |
| `companies` | Tenant self/company-level profile/settings operations | controller/repository/dto/use-cases (service file not present as main entry) | cash reconciliation mode operations visible | medium |
| `entitlements` | `/my/entitlements` and feature catalog exposure | dedicated controller + common entitlement service usage | depends on global entitlement infra module | high |

### Core Business Data

| Module | Apparent responsibility | Important visible parts | Notable integrations | Confidence |
|---|---|---|---|---|
| `customers` | customer CRUD + customer snapshots | full module pattern + use-cases | links into invoices/pricing/reporting data flows | high |
| `suppliers` | supplier CRUD and related finance references | full module pattern | used by expenses/reports contexts | high |
| `employees` | employee CRUD and related financial records | full module pattern | referenced by reports/payroll-like paths | high |
| `products` | product catalog and pricing baseline inputs | full module pattern | used by invoices/pricing/reporting | high |
| `pricing` | customer-specific product pricing operations | controller/service/repository/dto/use-cases | linked to customers/products | high |

### Finance / Transactions / Accounting

| Module | Apparent responsibility | Important visible parts | Notable integrations | Confidence |
|---|---|---|---|---|
| `ledger` | ledger entry creation/deletion and statements | full module pattern | central accounting dependency for many modules | high |
| `expenses` | expense CRUD + summary | full module pattern | contributes to reporting and dashboard metrics | high |
| `deferred-sales` | deferred sale lifecycle + payments | full module pattern | linked with invoices/installments/ledger | high |
| `installments` | installment contracts/schedule/payments | full module pattern | linked with reports/ledger/invoices contexts | high |
| `invoices` | invoice lifecycle + invoice payments + payment distribution | module has `invoices.controller.ts` and extra `payments.controller.ts`; full use-case set | imports `CustomersModule`; transition-specific use-cases visible | high |
| `statements` | customer account statement endpoint(s) | controller + service visible (leaner module) | depends on ledger/customer financial records | medium |
| `cash-reconciliation` | daily cash reconciliation operations/modes | controller/service/repository/dto present | tied to company mode and dashboard/report visibility paths | medium |

### Reporting / Dashboards / Notifications

| Module | Apparent responsibility | Important visible parts | Notable integrations | Confidence |
|---|---|---|---|---|
| `reports` | multi-domain reporting endpoints (finance/sales/aging/performance) | controller/service/repository/dto/use-cases (nested cases) | aggregates multiple domain modules/tables | high |
| `dashboard` | tenant dashboard overview/charts/highlights/alerts | full module pattern + shared dashboard date helpers | relies on cross-domain query aggregation | high |
| `platform-dashboard` | super-admin dashboard metrics (overview/charts/health) | full module pattern + controller routes | platform-level aggregation | high |
| `notifications` | push notifications + device token lifecycle | controller/service/repository/use-cases + queue processor | Bull queue + Expo push service | high |
| `audit` | auditing endpoints/querying | controller/service/repository + dto present | likely cross-domain logs access | medium |
| `platform-audit` | platform audit logs/lookups endpoints | controller/service/repository/dto/use-cases | route prefix under `platform/*` | high |

### Platform Administration

| Module | Apparent responsibility | Important visible parts | Notable integrations | Confidence |
|---|---|---|---|---|
| `platform` | super-admin companies/plans/subscriptions/users/settings/capabilities | broad controller route surface + repository/use-cases + idempotency submodule | imports `UsersModule`; includes platform settings service and feature flags service | high |

### Structural Note
`maintenance` folder exists under `src/modules`, but active Nest module wiring is not confirmed (no `{module}.module.ts` observed and not imported in `AppModule`).

## 5) Shared Infrastructure / Common Layers

### Global Infra Modules in `AppModule`
- `DatabaseModule`
- `LoggerModule`
- `CacheModule`
- `GuardsModule`
- `TranslationModule`
- `EntitlementModule`

### Guarding Model (from `common/guards`)
Documented order in guards module comments:
- `JwtAuthGuard` -> `RolesGuard` -> `TenantSubscriptionGuard` -> `FeatureGuard` -> `PermissionsGuard`

### API Envelope
`ApiResponseDto` indicates a standard envelope with `success`, `data`, `message`, `error`, `timestamp`.

## 6) Prisma / Database Layer Overview
- Prisma schema is comprehensive and multi-tenant oriented (company-scoped entities widely present).
- `PrismaService` uses `@prisma/adapter-pg` with explicit connection pool settings and query monitoring.
- Health check uses DB query (`SELECT 1`) through Prisma.

## 7) Queues / Background Processing Overview
- Bull root config is initialized in `AppModule` with Redis settings.
- Notifications module registers queue `notifications` and processes jobs via `@Processor` and `@Process`.
- Queue comments and code indicate async push delivery to Expo endpoint through a processor service path.

## 8) Observed Strengths
1. Clear modular boundaries and consistent folder conventions in most domains.
2. Strong cross-cutting setup at bootstrap level (validation, throttling, CORS, logging, Swagger).
3. Rich domain decomposition across finance, platform, reporting, and notifications.
4. Explicit queue-based async pattern for notification delivery.
5. Evidence of tenant/subscription/feature guard model rather than only role-level auth.

## 9) Structural Risks / Ambiguities
1. Legacy naming still appears in code comments/identifiers; not functionally blocking but raises documentation drift risk.
2. Some modules are structurally uneven (full use-case layering in most modules, leaner shape in others).
3. `maintenance` area appears incomplete/not wired.
4. Sentry code exists but active module wiring in app bootstrap is not fully confirmed.
5. Reports and platform domains are large; ownership boundaries between modules should be documented further.

## 10) Follow-up Docs
- `docs/api_integration_guide.md` for frontend/backend contract behavior
- future deep dives: per-module sequence/flow docs under `hesba-api-v1/docs/`
