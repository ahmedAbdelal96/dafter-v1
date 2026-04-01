# Daftar Super Admin Frontend Roadmap (Platform Control Layer)

Last updated: 2026-03-11 (Sprint 5 closed, post-closure backlog refined)  
Scope: `dafter-dashboard` super-admin area aligned with `dafter-api-v1` platform routes under `/api/v1/platform*` and `/api/v1/platform-dashboard*`

---

## 1) Objective

Build a full Super Admin control layer that can run the SaaS platform end-to-end, not just view metrics.

Primary goal for first production milestone:
- Super Admin can:
  - Create and manage companies (tenants)
  - Manage tenant subscriptions and plans
  - Create/manage tenant users from platform level
  - Monitor platform health and take operational actions

---

## 2) Current Reality (As of 2026-03-11)

### Already implemented in frontend
Status: **Sprint 5 Completed**
- `super-admin/dashboard` implemented and integrated with `platform-dashboard` APIs.
- `super-admin/tenants` implemented with:
  - list/filter/pagination
  - server-side sorting controls (name/created/updated)
  - company details modal
  - company metrics view
  - edit company profile flow
  - disable/enable company flow
- `super-admin/subscriptions` implemented with:
  - list/filter/pagination
  - activate / change-plan / extend / suspend actions
  - plans visibility
  - subscription timeline modal per tenant
  - governance baseline (confirmation + reason capture + session action trace)
- `super-admin/plans` implemented with:
  - plans list/filter
  - create/edit plan flows
  - activate/deactivate plan state
  - limits/features management
- `super-admin/platform-users` implemented with:
  - list/filter/pagination
  - tenant-scoped user create/edit
  - permissions update
  - enable/disable user actions
  - export flow and details modal

### Already available in backend
Status: **Good Base, not full governance yet**
- Companies:
  - `POST /platform/companies`
  - `PATCH /platform/companies/:id`
  - `PATCH /platform/companies/:id/disable`
  - `PATCH /platform/companies/:id/enable`
  - `GET /platform/companies`
  - `GET /platform/companies/:id`
  - `GET /platform/companies/:id/metrics`
- Plans:
  - `POST /platform/plans`
  - `GET /platform/plans`
  - `PATCH /platform/plans/:id`
- Subscriptions:
  - `POST /platform/subscriptions/activate`
  - `POST /platform/subscriptions/suspend`
  - `POST /platform/subscriptions/extend`
- Platform dashboard:
  - `/platform-dashboard/overview`
  - `/platform-dashboard/charts`
  - `/platform-dashboard/health`

### Still missing for full Super Admin operations
Status: **Partially Pending**
- Tenant impersonation flow (secure, audited, time-bounded)
- Platform users credentials reset flow (admin-triggered reset/recovery)
- Governance reports persistence (export history and traceability)
- Incident operations center for high-risk actions
- Advanced feature-flags rollout controls (targeted rollout, staged enablement)

---

## 3) Architecture Direction (Mandatory Separation)

Principle:
- `tenant admin` concerns stay in tenant modules.
- `super admin` concerns stay in platform modules.

Frontend feature boundaries:
- `src/features/platform-dashboard/*` -> analytics only
- `src/features/platform-management/*` -> operational actions

Backend boundaries:
- `/platform-dashboard/*` -> aggregated read models
- `/platform/*` -> management operations

---

## 4) Super Admin Modules (Target)

1. Platform Dashboard
- KPI overview
- growth charts
- health lists
- quick actions

2. Tenants Management
- list/filter/sort companies
- create tenant
- edit tenant
- enable/disable tenant
- tenant details + usage metrics

3. Platform Users Management
- list users across tenants
- filter by tenant/role/status
- create tenant user from super admin
- edit permissions/status
- reset credentials flow

4. Plans Management
- create plan
- update limits/features/price/cycle
- activate/deactivate plan
- usage per plan

5. Subscriptions Management
- activate / extend / suspend
- change plan
- renewal risk list
- subscription history timeline per tenant

6. Governance & Operations
- audit logs for platform actions
- high-risk actions review
- incident-friendly operational trail

7. Platform Settings
- trial defaults
- subscription policy defaults
- guardrails and feature flags (if adopted)

---

## 5) Phased Implementation Plan

## Phase A - Stabilize Current Super Admin Base (P0)

Status: **Completed on 2026-03-10**

### A1. Tenants page hardening
- Add server-side sort controls if supported. ✅
- Add create/edit tenant modals (if backend contract ready). ✅
- Confirm action-level RBAC. ✅

### A2. Subscriptions page hardening
- Add strict action validation states. ✅
- Add better timeline/history UX per tenant. ✅
- Add safe mutation feedback + optimistic consistency. ✅

### A3. Platform dashboard consistency
- Ensure every mutation invalidates impacted dashboard queries. ✅
- Keep retry/focus settings stable to avoid request spam. ✅

Definition of done:
- no placeholders ✅
- no broken states on slow backend/cold start ✅
- full AR/EN coverage ✅

---

## Phase B - Platform Users Module (P1)
Status: **Completed on 2026-03-10**

### B1. Backend readiness check
Required endpoints (or equivalent):
- list platform users (with tenant scope)
- create user in specific tenant
- update user permissions/status
- disable/enable user

### B2. Frontend implementation
Route target:
- `/[locale]/super-admin/platform-users`

UI scope:
- list/filter table
- create/edit modal
- role/permission/status controls
- tenant selector

Definition of done:
- super admin can create and manage users for any tenant from one screen
- achieved ✅

---

## Phase C - Plans Control Completion (P1)
Status: **Completed on 2026-03-10**

### C1. Plans page
Route target:
- `/[locale]/super-admin/plans`

UI scope:
- plans table
- create plan modal
- edit plan modal
- active/inactive state
- limits/features display

### C2. Subscription-plan integration
- Add change-plan workflow from subscriptions and/or tenant details.

Definition of done:
- pricing and limits are fully manageable from UI
- achieved ✅

---

## Phase D - Governance Layer (P1/P2)
Status: **Baseline completed on 2026-03-10 (frontend scope)**

### D1. Audit logs
Route target:
- `/[locale]/super-admin/audit-logs`

Scope:
- who performed what action
- tenant, timestamp, action type
- filters by actor/tenant/action/date

### D2. Safety controls
- explicit confirms for destructive operations
- reason/note capture for suspend/disable operations
- session action trace in subscriptions page

Definition of done:
- operational decisions are traceable and reviewable
- partial ✅ (frontend baseline done; persisted audit endpoint pending)

---

## Phase E - Optional Advanced Controls (P2)

### E1. Tenant impersonation (optional)
- secure, audited, time-bounded impersonation.

### E2. Platform policy settings
- defaults for trial/subscription/limits.

### E3. Feature flags
- progressive rollout controls (if adopted by backend).

---

## 6) Super Admin Definition of Done (Global)

A Super Admin module is done only when:
- Route fully implemented (no static placeholder).
- API service + hooks typed and integrated.
- Loading/error/empty/success states are explicit.
- Action-level RBAC applied.
- AR/EN translations complete and readable (no mojibake/`???`).
- Build + i18n check pass.
- Cross-module cache invalidation is correct.

---

## 7) Immediate Next 3 Sprints (Recommended)

## Sprint 1 (7 days) - Completed (2026-03-10)
1. Tenants hardening completion (create/edit/disable where contract exists).
2. Subscriptions hardening + timeline UX.
3. Platform QA pass for existing super-admin pages.

## Sprint 2 (7 days) - Completed (2026-03-10)
1. Build `platform-users` module end-to-end.
2. Add tenant-scoped user creation and management workflows.

## Sprint 3 (7 days) - Completed (2026-03-10)
1. Build `plans` management UI.
2. Add change-plan in subscription workflows.
3. Finalize governance minimum set (action notes + basic audit view if backend ready).

## Sprint 4 (7 days) - Completed (2026-03-10)
1. Added persisted audit-log API and UI (`/super-admin/audit-logs`). ✅
2. Added advanced governance filters (actor/action/date/tenant + lookup endpoint). ✅
3. Completed hardening pass baseline (RBAC + regression build/i18n checks + translation fixes). ✅

## Sprint 5 (7 days) - Completed (2026-03-10)
1. Completed tenant edit/disable/enable operations in super-admin tenants module. ✅
2. Added tenants sorting controls wired to backend query contract. ✅
3. Hardened tenant forms/metadata localization and completed validation pass. ✅

## Sprint 6 (7 days) - Planned
1. Build tenant impersonation flow (request/start/stop) with strict audit events.
2. Add super-admin initiated credentials reset flow for platform users.
3. Harden security boundaries (time-boxed session, explicit confirmation, audit metadata).

## Sprint 7 (7 days) - Planned
1. Build governance reporting center with persisted export history.
2. Add report metadata browsing (actor, filters, time, record count, status).
3. Add operational visibility cards for high-risk actions trend.

## Sprint 8 (7 days) - Planned
1. Build incident operations center for critical actions and follow-up status.
2. Add advanced feature-flag rollout controls (progressive rollout and targeting baseline).
3. Final hardening pass (RBAC/i18n/error handling/regression QA) for all new modules.

---

## 8) Risks and Mitigation

### Risk: Mixing tenant-admin and super-admin concerns
Mitigation:
- keep strict feature/module boundaries.

### Risk: API contract gaps for platform users/governance
Mitigation:
- freeze frontend scope per sprint based on confirmed backend contract.

### Risk: i18n corruption regressions in Arabic files
Mitigation:
- enforce UTF-8 without BOM for `messages/ar/*.json`.
- keep `npm run i18n:check` mandatory before merge.

### Risk: Stale dashboard after management actions
Mitigation:
- invalidate both `platform` and `platform-dashboard` query keys on mutations.

---

## 9) Work Queue (Ordered)

1. Implement tenant impersonation module (audited + time-bounded + explicit stop flow).
2. Implement platform-users credentials reset/recovery flow.
3. Expand governance to persisted export/reporting views.
4. Build incident operations center for high-risk actions.
5. Add advanced feature-flag rollout controls.
6. Final super-admin hardening pass for remaining modules (RBAC, i18n, error handling, regression QA).

---

## 10) Remaining Modules Tracker (Single Source of Truth)

Use this section as the canonical checklist for what is still missing in Super Admin.

| Module / Capability | Status | Target Sprint | Notes |
|---|---|---|---|
| Tenant impersonation | Not started | Sprint 6 | Must be auditable, explicit start/stop, short-lived token/session. |
| Platform user credentials reset flow | Not started | Sprint 6 | Admin-triggered reset with secure delivery path and audit trail. |
| Governance export history (persisted reports) | Not started | Sprint 7 | Store report jobs/metadata and expose list/detail UI. |
| Incident operations center | Not started | Sprint 8 | Unified queue for high-risk actions and follow-up state. |
| Advanced feature-flag rollout | Not started | Sprint 8 | Add staged rollout/targeting controls beyond simple on/off. |
