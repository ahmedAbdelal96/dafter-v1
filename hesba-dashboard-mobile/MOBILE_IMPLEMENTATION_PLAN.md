# Hasba Mobile Implementation Plan (Implementation Truth)

Last updated: 2026-03-17 (post Sprint 3)
Scope: `dafter-dashboard-mobile` vs backend `dafter-api-v1`
Source of truth: current mobile routes/features/hooks/API integration

---

## 1) Current reality (what is already implemented)

### Company-side mobile modules (API-backed)
- dashboard/home
- customers
- suppliers
- employees
- users/staff
- products
- expenses
- invoices (includes lifecycle actions and payment actions)
- deferred sales
- installments
- ledger
- reports (limited subset)
- notifications
- profile
- subscriptions (entitlements and quotas view)
- payments screen (`/payments` + distribute flow)

### Super-admin mobile modules (API-backed)
- platform dashboard
- companies list + detail sheet
- company lifecycle actions: update/archive/restore/delete (policy-aware)
- subscription actions: activate/suspend/extend/change-plan immediate
- plans list (read-only)
- company users management (create/enable/disable)
- idempotency key injection for critical subscription mutations

---

## 2) Backend -> Mobile parity status

Status scale: Done | Mostly done | Partial | Placeholder | Missing | Risk

| Area | Backend support | Mobile status | Notes |
|---|---|---|---|
| Auth | Full | Done | Login/refresh/logout flows active |
| Dashboard | Full | Mostly done | Core KPIs covered |
| Customers | Full | Mostly done | Core CRUD + details present |
| Suppliers | Full | Mostly done | Core CRUD + details present |
| Employees | Full | Mostly done | Core CRUD + details present |
| Users (company) | Full | Mostly done | Staff flows present |
| Products | Full | Mostly done | CRUD present |
| Expenses | Full | Mostly done | CRUD + summaries present |
| Invoices | Full lifecycle | Mostly done | Better lifecycle parity than web |
| Payments module | Present | Mostly done | Dedicated mobile flow exists |
| Deferred Sales | Full | Mostly done | Core operational flow present |
| Installments | Full | Mostly done | Core operational flow present |
| Ledger | Full | Mostly done | Core flows present |
| Reports | Extended set | Partial | Mobile covers summary/overdue/collection only |
| Notifications | Full | Mostly done | read/unread/read-all covered |
| Statements module | Present | Missing | No dedicated mobile module |
| Pricing module | Present | Missing | No mobile flow |
| Entitlements mine | Present | Done | Subscriptions screen implemented |
| Platform companies | Full | Mostly done | Strong coverage |
| Platform plans | Full | Partial | Read-only only |
| Platform subscriptions | Full | Mostly done | Lifecycle + change-plan covered |
| Platform users | Full | Mostly done | Main actions present |
| Platform audit logs | Full | Missing | No mobile screen |
| Platform settings | Full | Missing | No mobile screen |
| Platform dashboard health/charts depth | Full | Partial | Basic overview, no full parity with web analytics |

---

## 3) Main parity gaps to close before launch

1. Reports parity gap
- Backend has many report endpoints; mobile only surfaces 3 report tabs.

2. Platform operations parity gap
- No mobile platform audit logs screen.
- No mobile platform settings (feature flags/policies) screen.

3. Read-only plans on mobile
- Plans list exists but create/edit/deactivate lifecycle is web-only.

4. Legacy naming/content drift in mobile copy
- Still multiple Daftar/salon wording in comments/text and docs.

5. Dedicated statements/pricing modules not surfaced
- Endpoints exist in backend but no clear product exposure path in mobile.

---

## 4) Execution phases (mobile only)

## Phase 1 - P0 parity safety
Objective: close high-impact admin parity and operational visibility gaps.

Deliverables:
1. Add platform audit logs mobile screen (filter + list + pagination)
2. Add platform settings mobile screen (read first, then safe update actions if approved)
3. Ensure all platform destructive actions remain capability-driven from backend

Definition of done:
- Super-admin can monitor audit and key platform settings from mobile
- No hard-delete UI path shown without capability

## Phase 2 - Company operations completion
Objective: improve day-to-day merchant utility parity.

Deliverables:
1. Expand reports mobile module to include remaining high-value endpoints:
- profit-loss
- cash-flow
- customers-aging
- suppliers-aging
- sales-detailed
- collections-followup
2. Keep current tabs fast; add sectioned/report-category navigation

## Phase 3 - UX/validation hardening
Objective: reduce user friction and support load.

Deliverables:
1. Strengthen form validation and error-to-field mapping in heavy forms
2. Standardize loading/empty/error states across all large lists
3. Add smoke tests for high-frequency operations (customers/invoices/payments/platform lifecycle)

---

## 5) Strict short-term backlog (ordered)

1. Platform audit logs screen (mobile super-admin)
2. Platform settings screen (mobile super-admin)
3. Reports expansion beyond 3 tabs
4. Copy/naming cleanup (Hasba naming, remove legacy domain leftovers)
5. Smoke test suite expansion for company + platform lifecycle paths

---

## 6) Sprint 3 execution sync

Completed in Sprint 3:
- Error-mapping hardening for invoice/deferred/installment forms (field-level mapping from backend errors).
- Reports state-consistency hardening:
  - normalized date-range query params in hooks
  - unified cache timings for reports queries
  - stabilized preset date params in reports screen via memoization
  - unified retry label usage for report tabs
- Added mobile reports contract smoke script:
  - `test:reports-contract-smoke`
  - validates advanced reports API/hook/screen wiring and aging `asOfDate` contract mapping

Out of Sprint scope:
- QA-DATA-WEB-PAY-01
- QA-MOB-REP-DEVICE-01
