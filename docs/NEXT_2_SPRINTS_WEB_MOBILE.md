# NEXT_2_SPRINTS_WEB_MOBILE.md

Last updated: 2026-03-17
Scope: close highest web/mobile parity gaps against backend

---

## Sprint 1 (Parity Safety Sprint)

### Sprint goal
Close production-risk parity gaps in lifecycle and platform governance.

### Exact tasks

1. Web invoice lifecycle parity
- Add service/hook coverage for:
  - `PATCH /invoices/:id/submit`
  - `PATCH /invoices/:id/approve`
  - `PATCH /invoices/:id/reject`
  - `PATCH /invoices/:id/cancel`
  - `POST /invoices/:id/payments`
- Add gated action buttons in invoice details by current status
- Add error mapping for invalid transitions

2. Web hard-delete visibility alignment
- Replace `NEXT_PUBLIC_ALLOW_COMPANY_HARD_DELETE` display logic in tenants UI with backend capabilities endpoint
- Keep UI hidden/disabled when capability is false

3. Mobile platform audit logs
- New screen in `(platform)` flow
- Integrate `GET /platform/audit-logs` + lookups
- Add filters and paginated list

4. Mobile platform settings (phase 1)
- Read-only platform settings screen using `GET /platform/settings` and `GET /platform/settings/feature-flags`
- Show explicit read-only note if mutation scope not approved in this sprint

### Why this sprint now
- These are high-severity parity and governance gaps.

### Dependencies/blockers
- Final backend contract confirmation for writable platform settings fields if write actions are included.

### Must NOT be expanded in this sprint
- No NEXT_CYCLE UI
- No billing/proration redesign
- No broad refactor of shared architecture

### Expected output
- Invoice lifecycle parity PR (web)
- Capability visibility parity PR (web)
- Mobile platform audit/settings PR
- Updated QA checklist for lifecycle/governance

---

## Sprint 2 (Company Completion Sprint)

### Sprint goal
Close remaining company operational parity gaps for daily use.

### Exact tasks

1. Web standalone payments module
- Add page + list/search + distribute payment action
- Integrate:
  - `POST /payments`
  - `POST /payments/distribute`
- Add refresh/invalidation with invoices and ledger

2. Mobile reports parity expansion
- Add report sections for:
  - `GET /reports/profit-loss`
  - `GET /reports/cash-flow`
  - `GET /reports/customers-aging`
  - `GET /reports/suppliers-aging`
  - `GET /reports/sales-detailed`
  - `GET /reports/collections-followup`
- Keep current summary/overdue/collection views intact

3. Company settings route truth (web)
- Resolve `/(admin)/settings` redirect behavior:
  - either implement real module against confirmed backend contract
  - or remove/hide route and nav entry until backend scope exists

4. Drift cleanup (targeted)
- Remove visible legacy Daftar/salon wording in user-facing web/mobile areas touched in this sprint
- Keep changes scoped to touched modules only

### Why this sprint now
- Directly affects daily merchant operations and product trust.

### Dependencies/blockers
- Product decision on company settings scope
- Product decision on statements/pricing inclusion (if attempted)

### Must NOT be expanded in this sprint
- No enterprise-only transformations
- No unrelated UI redesign
- No platform billing redesign

### Expected output
- Web payments module PR
- Mobile reports expansion PR
- Settings route truth PR
- Updated parity matrix and release QA script

---

## Done criteria after sprint 2

1. Web and mobile both support business-critical invoice/payment lifecycle paths
2. Super-admin governance visibility is available on both channels (at minimum audit + settings read)
3. No misleading settings routes
4. Parity gaps are reduced to agreed deferred items only

---

## Sprint 3 hardening status (executed)

Status:
- Sprint 2 final status: `Close with caveats`
- Sprint 3 executed as hardening-only scope (no new feature scope)

Delivered:
- Web:
  - retired legacy active `settings.ts` usage surface
  - added `smoke:invoice:lifecycle`
  - added `smoke:platform:governance`
- Mobile:
  - hardened error mapping in high-impact forms (invoice/deferred/installments)
  - reports state-consistency hardening (normalized params + memoized preset params)
  - added `test:reports-contract-smoke`

Deferred as non-blocking follow-ups (outside Sprint 3):
- QA-DATA-WEB-PAY-01
- QA-MOB-REP-DEVICE-01
