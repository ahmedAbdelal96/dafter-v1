# Frontend Audit

## Scope
This covers:
- `hesba-dashboard` (web)
- `hesba-dashboard-mobile` (mobile)

---

# Web Dashboard (`hesba-dashboard`)

## Strengths
- Modern App Router structure
- Locale-based routing and direction handling
- Role-aware route protection via `proxy.ts`
- React Query provider has thoughtful default behaviors
- Feature folders cover major product areas
- Theme/toast/query providers are centralized

## Major findings

## 1) Stale architecture/readme docs are actively misleading
**Severity:** Critical  
**Where**
- `ARCHITECTURE.md`
- `README.md`

**Why it matters**
Visible docs still describe beauty-center / salon / bookings flows that do not match the accounting modules visible in the real app. This will confuse future contributors immediately.

**Recommendation**
- rewrite from scratch based on current routes/features
- separate historical ideas from current implementation
- do not keep prompt fragments as README

## 2) Route/auth logic is centralized but complex
**Severity:** Medium  
**Where**
- `src/proxy.ts`

**Why it matters**
This file appears to carry a lot of responsibility:
- locale-aware routing
- auth checks
- role inference
- redirect policy
- cross-area access control

This is powerful, but it can become fragile quickly.

**Recommendation**
- extract pure helpers and unit-test them
- document the route matrix by role
- define a single source of truth for default routes per role

## 3) Auth state exists in both cookies and client store
**Severity:** Medium  
**Where**
- `src/stores/auth-store.ts`
- auth cookie usage in route protection

**Why it matters**
Mixed sources of truth often create hydration, stale-session, and mismatch bugs.

**Recommendation**
- document exact authority order
- minimize persisted client-side identity state
- add explicit revalidation/refresh rules on boot

## 4) Encoding issues are visible in comments/messages
**Severity:** Medium  
**Where**
- visible in `auth-store.ts` and likely related text assets

**Why it matters**
Localization quality and developer trust both suffer.

**Recommendation**
- standardize UTF-8
- move user-facing localized strings fully into translation/message files
- add encoding checks in pre-commit or CI

## 5) Feature organization is good, but standardization is incomplete
**Severity:** Medium  
**Where**
- `src/features/*`
- `packages/api-client/src/*`

**Why it matters**
Some features appear fully structured while shared client packaging looks early/skeletal. Without a consistent pattern, teams drift.

**Recommendation**
Define a feature module standard:
- components/
- api/
- hooks/
- types/
- utils/
- validators/
- tests/

Not every feature needs every folder, but the standard should be documented.

## 6) Duplicate or stray assets indicate cleanup debt
**Severity:** Low to Medium  
**Where**
- `src/app/globals copy.css`

**Why it matters**
Usually signals weak review hygiene and can mislead maintainers.

**Recommendation**
- remove duplicates
- add a repo rule against `copy`, `backup`, `final-final`, etc.

---

# Mobile Dashboard (`hesba-dashboard-mobile`)

## Strengths
- Real route grouping with platform/auth/client areas
- Platform area is not superficial
- Expo stack includes secure storage and notifications
- Feature folders exist for platform logic

## Major findings

## 7) Mobile app tree also contains planning/audit clutter
**Severity:** Medium  
**Why it matters**
A product app directory should not become a dumping ground for reports and internal artifacts.

**Recommendation**
- move working docs outside app source tree
- keep only source and essential technical docs in the app folder

## 8) Platform screen complexity may need component splitting
**Severity:** Medium  
**Where**
- `src/app/(platform)/index.tsx`

**Why it matters**
Large dashboard screens become hard to test and evolve.

**Recommendation**
- split into data hooks + presentation sections + widgets
- add empty/loading/error-state conventions

## 9) Role protection exists, but must stay contract-aligned with backend
**Severity:** Medium  
**Where**
- `src/app/(platform)/_layout.tsx`

**Recommendation**
- share role constants/contracts where possible
- test role-denial and redirect behavior across surfaces

## Cross-frontend recommendations
- define one auth/session model for web + mobile
- standardize feature folder conventions
- add UI test strategy per app
- centralize API client typing/contracts
- clean stale docs immediately
