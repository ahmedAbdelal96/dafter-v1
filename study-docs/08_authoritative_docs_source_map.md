# Authoritative Docs Source Map

Date: 2026-04-01
Scope: evidence used to build the first authoritative docs set for Hesba.

## 1) Backend Evidence Sources

| Source | What it confirmed | Confidence |
|---|---|---|
| `hesba-api-v1/package.json` | Backend runtime stack (NestJS, Prisma, Bull, Redis, Swagger deps, Jest scripts) | high confidence |
| `hesba-api-v1/src/main.ts` | Global API prefix, CORS, Helmet, ValidationPipe, Swagger setup at `api/docs`, global logging interceptor | high confidence |
| `hesba-api-v1/src/app.module.ts` | Actual imported feature modules and infrastructure wiring; Bull root config; i18n + throttling | high confidence |
| `hesba-api-v1/src/app.controller.ts` + `src/app.service.ts` | Health endpoint and DB connectivity check behavior | high confidence |
| `hesba-api-v1/prisma/schema.prisma` | Data model direction, multi-tenant shape, domain entities/enums | high confidence |
| `hesba-api-v1/src/database/prisma/prisma.service.ts` | Prisma + pg adapter usage, DB pooling strategy, slow query logging | high confidence |
| `hesba-api-v1/src/database/database.module.ts` | Prisma service provided globally with subscription governance service | high confidence |
| `hesba-api-v1/src/modules/*` (folder structure + controllers/use-cases/dto/repositories) | Module organization pattern and domain map | high confidence |
| `hesba-api-v1/src/modules/notifications/*` | Queue-backed notifications flow (`BullModule.registerQueue`, `@Processor`) | high confidence |
| `hesba-api-v1/src/modules/platform/platform.controller.ts` | Platform admin route surface (companies/plans/subscriptions/users/settings/capabilities) | high confidence |
| `hesba-api-v1/src/common/guards/guards.module.ts` | Guard stack and ordering intent | high confidence |
| `hesba-api-v1/src/logger/logger.service.ts` | Winston + rotate-file logging strategy | high confidence |
| `hesba-api-v1/src/common/sentry/*` | Sentry service/module exists in code | medium confidence |

## 2) Web Dashboard Evidence Sources

| Source | What it confirmed | Confidence |
|---|---|---|
| `hesba-dashboard/package.json` | Next.js + React + next-intl + React Query + Zustand + Axios stack | high confidence |
| `hesba-dashboard/next.config.ts` | next-intl plugin usage + CSP/security headers + API origin allowance in `connect-src` | high confidence |
| `hesba-dashboard/src/proxy.ts` | Route protection + locale-aware routing + role-based redirects | high confidence |
| `hesba-dashboard/src/i18n/routing.ts` | Supported locales (`ar`, `en`) and URL locale prefix behavior | high confidence |
| `hesba-dashboard/src/lib/auth/constants.ts` | Auth cookies, API auth endpoint base construction | high confidence |
| `hesba-dashboard/src/lib/auth/server.ts` | Server-side cookie/session handling and refresh flow | high confidence |
| `hesba-dashboard/src/lib/auth/actions.ts` | Server actions based login/register orchestration against backend auth endpoints | high confidence |
| `hesba-dashboard/src/app/api/auth/refresh/route.ts` | API route used by client to refresh access token | high confidence |
| `hesba-dashboard/src/lib/api/config.ts` | Base URL and frontend endpoint map used by services | high confidence |
| `hesba-dashboard/src/lib/api/http-client.ts` | Axios interceptors, token header injection, refresh-retry flow, network retry behavior | high confidence |
| `hesba-dashboard/src/lib/api/contracts.ts` + `response.ts` | API envelope extraction pattern and normalization strategy | high confidence |
| `hesba-dashboard/src/lib/api/services/*` + `hooks/*` | Service layer + TanStack Query hook pattern for backend integration | high confidence |
| `hesba-dashboard/src/providers/query-provider.tsx` | QueryClient defaults and retry/error handling policy | high confidence |
| `hesba-dashboard/src/lib/api/types.ts` | Mixed/stale type surface risk (legacy enums visible) | high confidence |

## 3) Mobile Evidence Sources

| Source | What it confirmed | Confidence |
|---|---|---|
| `hesba-dashboard-mobile/package.json` | Expo + React Native + expo-router + React Query + i18next + Zustand + Axios stack | high confidence |
| `hesba-dashboard-mobile/app.json` | Expo router entry + app scheme + plugins (`expo-router`, `expo-secure-store`) | high confidence |
| `hesba-dashboard-mobile/src/lib/api/client.ts` | Axios client with SecureStore-backed tokens and queued refresh logic | high confidence |
| `hesba-dashboard-mobile/src/lib/api/config.ts` | Mobile endpoint registry + query keys + retry policy | high confidence |
| `hesba-dashboard-mobile/src/lib/api/auth.api.ts` | Auth API wrapping and token persistence behavior | high confidence |
| `hesba-dashboard-mobile/src/stores/auth-store.ts` | Auth initialization/login/logout and session-expiry callback wiring | high confidence |
| `hesba-dashboard-mobile/src/components/providers/AppProviders.tsx` | React Query + i18n provider composition and default query policy | high confidence |
| `hesba-dashboard-mobile/src/components/providers/StoreHydration.tsx` | Boot hydration flow (fonts, stores, locale, RTL, auth init) | high confidence |
| `hesba-dashboard-mobile/src/app/_layout.tsx` + `src/app/(auth|client|platform)/_layout.tsx` | Navigation tree split and role-based routing structure | high confidence |
| `hesba-dashboard-mobile/src/features/*/api + hooks` | Feature-level API usage pattern via shared apiClient + Query hooks | high confidence |
| `hesba-dashboard-mobile/src/constants/config.ts` | Hardcoded fallback config values and legacy identifiers | medium confidence |

## 4) Environment/Repo-Level Evidence

| Source | What it confirmed | Confidence |
|---|---|---|
| `.env.production.example` | Example env surface exists but contains legacy naming; not authoritative runtime truth | medium confidence |
| `README.md` + app READMEs | Current documentation reconstruction status and scope boundaries | medium confidence |
| `study-docs/01..07` | Historical cleanup decisions and known naming drift | medium confidence |

## 5) Major Areas with Incomplete Evidence

1. Exact production deployment topology (single host vs split services, reverse proxy details) is not fully confirmed from current code.
2. Full API contract stability/versioning policy is not explicitly codified (endpoint maps exist, but no strict generated contract workflow confirmed).
3. Sentry runtime activation status in backend is unclear: Sentry service exists, but explicit module import in `AppModule` is not confirmed.
4. Web auth model has mixed server-action and client-token behaviors; intended long-term canonical flow needs verification.
5. `maintenance` module path exists under backend modules, but active wiring/usage is not confirmed.
6. Some web/mobile type/config surfaces still carry legacy naming and may not represent final canonical API semantics.
