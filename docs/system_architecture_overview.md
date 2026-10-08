# System Architecture Overview

Date: 2026-04-01
Status: first authoritative, code-grounded baseline

## Repository Scope (Verified)
The Hesba repository currently contains three primary applications:
- `hesba-api-v1`: NestJS backend API
- `hesba-dashboard`: Next.js web dashboard
- `hesba-dashboard-mobile`: Expo/React Native mobile dashboard

Supporting folders include `docs` and `study-docs` for documentation work, plus infra/artifact folders.

## Application Relationship (Verified)
1. Backend (`hesba-api-v1`) exposes API routes under a global prefix (`api/v1`) and Swagger docs under `api/docs`.
2. Web and mobile both act as API consumers through Axios-based client layers and feature-specific service/hooks modules.
3. Authentication/session handling exists in both clients, but with different storage/transport strategies:
- Web: cookie + server-action assisted flow
- Mobile: SecureStore + interceptor refresh flow

## Technology Baseline by App (Verified)

### Backend
- Runtime: Node.js
- Framework: NestJS
- Language: TypeScript
- Database layer: Prisma + PostgreSQL (`@prisma/adapter-pg` + `pg`)
- Queue: Bull (Redis-backed)
- API docs: `@nestjs/swagger`
- Security/middleware: Helmet, CORS, ValidationPipe, Throttler
- Logging: Winston + rotating files

### Web Dashboard
- Framework: Next.js (App Router)
- Runtime/UI: React
- i18n: `next-intl`
- API client/data: Axios + TanStack Query
- State: Zustand
- Styling: Tailwind CSS

### Mobile Dashboard
- Framework: Expo + React Native
- Navigation: `expo-router` (+ React Navigation stack/tabs)
- API client/data: Axios + TanStack Query
- State: Zustand
- Token storage: `expo-secure-store`
- i18n: i18next + react-i18next
- Styling: NativeWind

## High-Level Runtime Architecture (Verified)

### Backend Runtime Shape
- Entry bootstrap in `src/main.ts` configures:
- CORS allowlist behavior
- Helmet headers
- global prefix `/api/v1`
- global validation pipe
- global logging interceptor
- Swagger at `/api/docs`

- `AppModule` wires:
- global infra modules (config, DB, logger, cache, guards, translation, entitlements)
- domain modules (auth, parties, finance, platform, reporting, notifications, etc.)
- Bull queue root config using Redis connection settings

### Web Runtime Shape
- Locale-aware route handling in `src/proxy.ts` + `src/i18n/routing.ts`
- Server actions in `src/lib/auth/actions.ts` interact with backend auth endpoints
- Axios client (`src/lib/api/http-client.ts`) applies auth headers, language header, retry/refresh behavior
- Feature modules consume API via `src/lib/api/services/*` and `src/lib/api/hooks/*`

### Mobile Runtime Shape
- Root providers compose QueryClient + i18n + hydration bootstrapping
- Auth/session initialized in `src/stores/auth-store.ts`
- Shared API client (`src/lib/api/client.ts`) injects bearer token + tenant header and handles token refresh queue
- Feature API/hook layers are colocated under `src/features/*`

## Backend Core Layering (Verified)
Observed repeated pattern in most modules:
- Controller
- Service
- Repository
- DTOs
- Use-cases

This pattern is not universal in every module (for example: some modules are leaner or omit `use-cases`/`repository`), but it is the dominant structure.

## Cross-Cutting Concerns (Verified)

### Auth
- Backend auth module is present and mapped.
- Web auth uses server-side cookie utilities plus client API refresh route.
- Mobile auth uses SecureStore-backed token manager and refresh-on-401 interceptor flow.

### API Communication
- Both web and mobile rely on centralized endpoint maps and shared Axios clients.
- Backend uses `ApiResponseDto` plus a global success-shaping interceptor for envelope-first success responses.
- `GET /health` remains an explicit raw-response exception.
- Clients still include defensive normalization to preserve compatibility with remaining edge cases.

### State/Data Fetching
- Web: TanStack Query + Zustand.
- Mobile: TanStack Query + Zustand.

### Background Jobs / Queues
- Notifications module is explicitly queue-backed with Bull processor (`notifications` queue).

### Logging / Monitoring
- Backend logging is active via custom Winston logger and logging interceptor.
- Sentry service exists in backend code, but active runtime wiring status needs verification.
- Mobile has a Sentry helper file, but activation is not fully confirmed in current app boot path.

## Known Ambiguities / Under-Reconstruction Areas
1. Deployment topology is only partially confirmed:
- per-app Dockerfiles are current evidence,
- root `docker-compose.yml` build contexts are aligned with current `hesba-*` folders, but some legacy service/container naming remains.
2. Some naming/config artifacts still use legacy identifiers; documentation should treat these as technical debt, not canonical naming.
3. Contract consistency across all endpoints needs a tighter authoritative source (current clients include defensive normalization).
4. The backend `maintenance` area appears inactive/stale (folder residue without confirmed module wiring in `AppModule`).
5. Sentry is now explicitly wired in backend runtime module imports and global error path, but effective external reporting depends on environment (`SENTRY_DSN`/`SENTRY_ENABLED`).

## Branch-Out Docs
For deeper detail, continue with:
- `docs/backend_module_map.md`
- `docs/api_integration_guide.md`
