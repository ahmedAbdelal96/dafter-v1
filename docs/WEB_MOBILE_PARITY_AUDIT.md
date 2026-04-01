# WEB_MOBILE_PARITY_AUDIT.md

Last updated: 2026-03-17
Project: Hasba (legacy naming still present in parts of code/docs as Daftar)
Audit mode: implementation-based parity audit
Truth source: backend modules/controllers/routes, current web/mobile screens, hooks, API clients

---

## 1) Backend module inventory (implementation truth)

### A. Company operations modules
- `auth`
- `dashboard`
- `customers`
- `suppliers`
- `employees`
- `users`
- `products`
- `expenses`
- `invoices`
- `payments`
- `deferred-sales`
- `installments`
- `ledger`
- `reports`
- `notifications`
- `statements`
- `pricing`

### B. Finance/accounting modules
- invoices + payments
- deferred sales + installments
- ledger
- reports
- statements
- pricing

### C. System/platform administration modules
- `platform` (companies/plans/subscriptions/users/settings/capabilities)
- `platform-dashboard`
- `platform-audit`
- `entitlements`

### D. Support modules
- `audit`
- `maintenance` (unclear operational usage from current frontend integration)

---

## 2) Web parity audit (Backend -> Web)

### Done / Mostly done
- Company-side: customers, suppliers, employees, users, products, expenses, deferred sales, installments, ledger, notifications, reports, dashboard
- Super-admin: platform dashboard, tenants, plans, subscriptions, platform users, platform audit logs, platform settings
- API integration is real in these areas (services + hooks + query invalidation patterns)

### Partial / Risk
- Invoices web module is partial vs backend lifecycle:
  - backend supports `submit/approve/reject/cancel/:id/payments`
  - web currently centered on create/list/detail/delete + duplicate
- Company settings page is not implemented (`/(admin)/settings` redirects to dashboard)
- Super-admin hard-delete visibility in tenants list uses env-based toggle instead of server capability contract
- Legacy API surface exists (`settings.ts` legacy service not aligned to active backend)

### Missing
- Standalone payments module (`/payments`, `/payments/distribute`) not exposed on web
- Dedicated statements and pricing product surfaces not exposed

Web operational readiness:
- Company use: strong for daily CRUD/ledger/invoices baseline, but invoice state machine parity is incomplete
- Super-admin use: strong overall, with one governance gap (capability-driven hard-delete visibility consistency)

---

## 3) Mobile parity audit (Backend -> Mobile)

### Done / Mostly done
- Company-side mobile covers most daily modules, including invoices lifecycle actions and payments flow
- Super-admin mobile covers core tenant lifecycle and subscription lifecycle, including change-plan immediate and idempotency key usage
- Mobile platform lifecycle actions are policy-aware and include backend error mapping for critical codes

### Partial / Risk
- Reports module is partial: only summary/overdue/collection-schedule while backend offers a much larger reporting set
- Platform plans is read-only on mobile
- Platform dashboard depth is lighter than web (overview-focused)

### Missing
- Platform audit logs screen on mobile
- Platform settings/feature flags/policies screen on mobile
- Dedicated statements/pricing mobile modules

Mobile operational readiness:
- Company use: strong and in some invoice flows more complete than web
- Super-admin use: good for lifecycle ops, incomplete for governance/monitoring (audit/settings)

---

## 4) Company-side operations audit (what is fully usable today)

### Web - can fully do today
- Manage customers/suppliers/employees/users/products/expenses
- Manage deferred sales/installments and related payments
- Use ledger entries and statements
- Use notifications center
- Use reports pages (broader than mobile)

### Web - partial or not available
- Invoice state transitions and direct invoice payment actions are not fully exposed
- No standalone payments screen
- No true company settings module page

### Mobile - can fully do today
- High-frequency daily operations across major modules
- Invoice state transitions and payment actions
- Dedicated payments flow
- Subscription entitlement/quota visibility screen

### Mobile - partial or not available
- Reports breadth is limited
- No dedicated statements/pricing modules

---

## 5) Super-admin / platform audit

### Web super-admin - fully usable
- Companies lifecycle + tenant details
- Plans and subscriptions management
- Platform users management
- Platform audit logs
- Platform settings and feature flags

### Web super-admin - weak points
- Hard delete button visibility still tied to frontend env in at least one tenants surface; should be server capability-driven everywhere

### Mobile super-admin - fully usable
- Company CRUD/lifecycle (with policy-aware delete visibility)
- Subscription lifecycle: activate/suspend/extend/change-plan immediate
- Company users management

### Mobile super-admin - missing for operations confidence
- Platform audit logs
- Platform settings
- Full parity plans management actions

---

## 6) Missing modules and weak modules

### Missing entirely
- Web: standalone payments module
- Mobile: platform audit logs
- Mobile: platform settings
- Web/mobile: dedicated statements + pricing surfaces

### Weak/incomplete (present but needs improvement)
- Web invoices lifecycle controls (partial)
- Mobile reports breadth (partial)
- Web company settings route behavior (redirect-only)
- Cross-platform capability usage consistency (web env toggle vs server capability)
- Legacy naming/types/doc drift still present and can mislead delivery

---

## 7) Parity matrix

Status values: Done | Mostly done | Partial | Placeholder | Missing | Risk

| Area | Backend | Web | Mobile | Admin relevance | Company relevance | Status | Missing work | Severity |
|---|---|---|---|---|---|---|---|---|
| Auth | Full | Done | Done | Medium | High | Done | Minor consistency QA | Medium |
| Dashboard | Full | Mostly done | Mostly done | High | High | Mostly done | KPI parity checks | Medium |
| Customers | Full | Mostly done | Mostly done | Medium | High | Mostly done | Edge-case validation hardening | Medium |
| Suppliers | Full | Mostly done | Mostly done | Medium | High | Mostly done | Edge-case validation hardening | Medium |
| Employees | Full | Mostly done | Mostly done | Medium | High | Mostly done | Conflict/version UX consistency | Medium |
| Users/staff | Full | Mostly done | Mostly done | Medium | High | Mostly done | Permissions UX parity | Medium |
| Products | Full | Mostly done | Mostly done | Medium | High | Mostly done | Pricing endpoint exposure decision | Medium |
| Expenses | Full | Mostly done | Mostly done | Low | High | Mostly done | Reporting tie-ins QA | Medium |
| Invoices lifecycle | Full | Partial | Mostly done | High | Critical | Partial | Web lifecycle actions parity | Critical |
| Payments module | Present | Missing | Mostly done | Medium | High | Partial | Build web payments module | High |
| Deferred sales | Full | Mostly done | Mostly done | Low | High | Mostly done | Workflow QA | Medium |
| Installments | Full | Mostly done | Mostly done | Low | High | Mostly done | Workflow QA | Medium |
| Ledger | Full | Mostly done | Mostly done | Medium | High | Mostly done | Stress/perf QA | Medium |
| Reports | Extended | Mostly done | Partial | Medium | High | Partial | Expand mobile report set | High |
| Notifications | Full | Mostly done | Mostly done | Low | Medium | Mostly done | Delivery/device-token QA | Medium |
| Statements | Present | Missing | Missing | Low | Medium | Missing | Product decision + implementation | Medium |
| Pricing | Present | Missing | Missing | Low | Medium | Missing | Product decision + implementation | Medium |
| Company settings | Unclear dedicated backend | Risk (redirect) | Partial (profile local) | Medium | Medium | Risk | Remove fake route or wire real contract | High |
| Platform companies | Full | Mostly done | Mostly done | Critical | Low | Mostly done | Consistency QA | Medium |
| Platform plans | Full | Mostly done | Partial | Critical | Low | Partial | Mobile plan management parity decision | Medium |
| Platform subscriptions | Full | Mostly done | Mostly done | Critical | Low | Mostly done | Regression QA on lifecycle | Medium |
| Platform users | Full | Mostly done | Mostly done | High | Low | Mostly done | Permission matrix QA | Medium |
| Platform audit logs | Full | Mostly done | Missing | Critical | Low | Partial | Mobile audit logs screen | High |
| Platform settings | Full | Mostly done | Missing | Critical | Low | Partial | Mobile platform settings screen | High |
| Capability-driven delete visibility | Full capability endpoint | Partial | Mostly done | Critical | Low | Risk | Use server capability in all web views | High |
| Docs consistency | N/A | Risk | Risk | High | High | Risk | Update planning docs from code truth | High |

---

## 8) Implementation roadmap

## Phase 1: High-risk parity gaps
Objective: close gaps that can cause wrong operations or governance blind spots.

Deliverables:
1. Web invoice lifecycle parity (`submit/approve/reject/cancel/record-payment`)
2. Web super-admin capability-driven hard-delete visibility (server contract)
3. Mobile platform audit logs screen
4. Mobile platform settings screen (at least read and safe toggles approved by backend policy)

Dependencies:
- Confirm final contract for company settings and platform settings writable fields

Risks:
- If lifecycle actions are wired without strict status guards, user confusion/regression risk

Definition of done:
- Core lifecycle actions available where backend supports them
- Governance-critical modules available on at least one admin UI and policy-consistent

## Phase 2: Company operations completion
Objective: close missing operational surfaces used daily.

Deliverables:
1. Web standalone payments module
2. Mobile report expansion to high-value endpoints
3. Decide statements/pricing exposure (implement or explicitly de-scope)

Dependencies:
- Product decision on statements/pricing UX and ownership

Risks:
- Over-expansion of reports without prioritization can slow delivery

Definition of done:
- Merchant can run receivables/payments/reporting flows without switching channels unnecessarily

## Phase 3: Super-admin/platform completion
Objective: complete cross-channel parity for platform operations.

Deliverables:
1. Mobile plan management parity decision (keep read-only or add mutations)
2. Cross-platform consistency for capabilities and policy error handling

Definition of done:
- Super-admin has predictable controls and visibility on both web and mobile

## Phase 4: UX/validation/hardening
Objective: remove friction and reduce support load.

Deliverables:
1. Form validation tightening in heavy flows
2. Better empty/loading/error handling consistency
3. Regression smoke tests for top lifecycle flows

## Phase 5: tests/docs/final launch readiness
Objective: launch confidence.

Deliverables:
1. Update runbooks and module plans from implementation truth
2. Add parity matrix checks to release checklist
3. Final staging pass across web/mobile/super-admin

---

## 9) Next 2 sprints (practical)

### Sprint 1 goal
Close governance-critical parity and invoice lifecycle risk.

Tasks:
1. Implement web invoice lifecycle actions and status-guarded UI
2. Switch web hard-delete visibility from env toggle to capabilities endpoint
3. Build mobile platform audit logs screen
4. Add mobile platform settings read screen

Why now:
- These are high-severity operational/safety gaps.

Blockers/dependencies:
- Confirm exact editable fields allowed in platform settings from backend

Do not expand yet:
- Do not add NEXT_CYCLE billing/scheduling UI
- Do not redesign reports in this sprint

### Sprint 2 goal
Close company daily operations parity gaps.

Tasks:
1. Build web standalone payments module
2. Expand mobile reports to selected backend endpoints (P&L, cash flow, aging)
3. Resolve company settings route truth (implement or remove route)
4. Cleanup legacy naming/type drift in shared docs and user-facing strings

Why now:
- Directly impacts daily merchant productivity and onboarding clarity.

Blockers/dependencies:
- Product decision for statements/pricing inclusion in MVP

Do not expand yet:
- No enterprise restructuring features
- No large redesign outside parity closure

---

## 10) Top priorities and verdict

### Top 10 remaining web/mobile/platform gaps
1. Web invoice lifecycle parity missing vs backend
2. Web standalone payments module missing
3. Mobile platform audit logs missing
4. Mobile platform settings missing
5. Mobile reports breadth limited vs backend
6. Web capability-driven delete visibility inconsistent
7. Company settings route is redirect-only (misleading)
8. Statements module not exposed in web/mobile
9. Pricing module not exposed in web/mobile
10. Legacy naming/type/doc drift still leaks into implementation context

### Top 5 company-side priorities
1. Web invoice lifecycle actions
2. Web payments module
3. Mobile reports expansion
4. Company settings route truth
5. Cross-platform validation/error consistency in high-frequency forms

### Top 5 super-admin priorities
1. Capability-based hard-delete visibility everywhere
2. Mobile platform audit logs
3. Mobile platform settings
4. Cross-platform policy/error mapping consistency
5. Plan management parity decision on mobile

### Final verdict
Web + mobile are not at full operational parity with backend yet.
- Company-side parity: close, but blocked by web invoice lifecycle/payments and mobile reports breadth.
- Super-admin parity: close on web, partial on mobile due to missing audit/settings surfaces.
- Practical readiness: good foundation, but parity closure work above should be completed before declaring full operational parity.
