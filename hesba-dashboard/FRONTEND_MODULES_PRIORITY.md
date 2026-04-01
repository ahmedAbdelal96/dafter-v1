# Hasba Web Frontend Modules Priority (Implementation Truth)

Last updated: 2026-03-17 (post Sprint 3)
Scope: `dafter-dashboard` vs backend `dafter-api-v1` (`/api/v1/*`)
Source of truth: backend controllers + current web routes/services/hooks/components

---

## 1) Current Reality Snapshot

### What is fully operational on web (company side)
- Auth: login/signup/refresh/session/profile basics
- Core operations pages exist and are API-backed:
  - customers
  - suppliers
  - employees (+ payroll page)
  - users/staff
  - products
  - expenses
  - invoices (create/list/detail/delete + duplicate in list)
  - deferred sales
  - installments
  - ledger statement
  - notifications center
  - reports page (extended sections, not placeholder)
- RBAC page guards exist via `requirePermission` in admin routes

### What is fully operational on web (super-admin side)
- Platform dashboard
- Tenants list + tenant details page
- Plans management
- Subscriptions management
- Platform users management
- Platform audit logs
- Platform settings (feature flags + platform policy settings)

### Important truth-based gaps on web
- `/(admin)/settings` is still redirect to dashboard (no company settings module)
- Invoices on web do not expose full backend lifecycle actions (`submit/approve/reject/cancel/record-payment`)
- Standalone payments module (`/payments`, `/payments/distribute`) is not exposed in web UI
- Super-admin hard-delete visibility still depends on frontend env toggle in tenants page instead of backend capabilities contract
- Legacy service/type surfaces still exist (`settings.ts`, old `ADMIN` in shared types, leftover legacy naming)

---

## 2) Backend -> Web Parity Status

Status scale: Done | Mostly done | Partial | Placeholder | Missing | Risk

| Area | Backend support | Web status | Notes |
|---|---|---|---|
| Auth | Full | Done | Core flows integrated |
| Dashboard | Full | Done | Overview/charts/highlights/alerts/receivables covered |
| Customers | Full | Mostly done | CRUD + details covered, not all advanced endpoints surfaced |
| Suppliers | Full | Mostly done | CRUD + details covered |
| Employees | Full | Mostly done | CRUD + details + payroll view, locking and edge-state QA still needed |
| Users (company) | Full | Mostly done | Staff management present |
| Products | Full | Mostly done | CRUD present, pricing endpoints not surfaced |
| Expenses | Full | Mostly done | CRUD + summary present |
| Invoices | Full lifecycle | Partial | Missing full state machine actions + direct payment UI |
| Payments module | Present | Missing | No standalone web module |
| Deferred Sales | Full | Mostly done | Main flows present |
| Installments | Full | Mostly done | Main flows present |
| Ledger | Full | Mostly done | Statement + entries present |
| Reports | Extended set | Mostly done | Stronger than old docs; still needs parity QA per endpoint |
| Notifications | Full | Mostly done | List/read/read-all present |
| Statements module | Present | Missing | No dedicated web screen/flow |
| Pricing module | Present | Missing | No dedicated web flow |
| Entitlements mine | Present | Partial | Service exists; company-facing subscription surface not first-class page |
| Platform companies | Full | Mostly done | Strong coverage |
| Platform plans | Full | Mostly done | Strong coverage |
| Platform subscriptions | Full | Mostly done | Includes change-plan immediate integration |
| Platform users | Full | Mostly done | Create/update/enable/disable/reset present |
| Platform audit logs | Full | Mostly done | Implemented page |
| Platform settings | Full | Mostly done | Implemented page |
| Platform capabilities | Present | Partial | Not consistently used for delete visibility in all views |

---

## 3) Priority Execution Plan (Web)

## Phase 1 - P0 parity and safety
Objective: close high-risk drift and lifecycle gaps that can break production behavior.

Deliverables:
1. Web invoice lifecycle parity
- Add UI actions for `submit/approve/reject/cancel/record-payment`
- Align with backend state machine and error mapping

2. Super-admin hard-delete visibility contract
- Replace env-only toggle in tenants UI with backend capabilities response
- Keep policy-aware hide/disable behavior consistent with mobile

3. Company settings route truth
- Remove misleading settings nav route or wire real module based on backend contract
- Avoid fake route/redirect confusion

Definition of done:
- No critical backend lifecycle endpoint is hidden for web operators where business requires it
- Delete policy visibility comes from server capability contract
- No dead route for settings

## Phase 2 - company operations completion
Objective: close missing company operational surfaces.

Deliverables:
1. Add web payments module for `/payments` and `/payments/distribute`
2. Decide and implement `statements`/`pricing` exposure or explicitly de-scope in product docs
3. Add company-facing entitlement/subscription visibility page (read-only)

## Phase 3 - hardening and drift cleanup
Objective: improve launch readiness and reduce future regressions.

Deliverables:
1. Remove/contain legacy `settings.ts` API surface not matching backend
2. Continue shared type cleanup (`ADMIN` and legacy naming drift)
3. Add regression smoke tests for super-admin lifecycle + invoice lifecycle

---

## 4) Outdated assumptions removed from previous plan

The following previous assumptions are no longer valid:
- "Reports is placeholder" -> incorrect; reports module is implemented and API-backed.
- "Notifications is placeholder" -> incorrect; notifications module is implemented.
- "Super-admin is mostly stub" -> incorrect; substantial platform modules are implemented.

Still valid risk:
- company settings route is not implemented (redirect only)
- invoice lifecycle and payments parity on web are incomplete vs backend

---

## 5) Work queue (strict order)

1. Web invoice lifecycle parity (submit/approve/reject/cancel/payment)
2. Server-capability-driven delete visibility in super-admin tenants list
3. Company settings route correction (remove redirect illusion)
4. Web standalone payments module
5. Shared type/service drift cleanup and regression tests

---

## 6) Sprint 3 execution sync

Completed in Sprint 3:
- Removed active legacy usage surface of web `settings.ts` API service (retired file).
- Added web smoke scripts for:
  - invoice lifecycle contract/runtime sanity (`smoke:invoice:lifecycle`)
  - platform governance contract/runtime sanity (`smoke:platform:governance`)

Notes:
- Sprint 2 remained `Close with caveats` (non-blocking QA-only follow-ups remain outside Sprint scope).
- Sprint 3 did not introduce new feature scope; it focused on parity hardening and smoke coverage.
