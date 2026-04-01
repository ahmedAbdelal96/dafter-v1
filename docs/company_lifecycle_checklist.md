# Company Lifecycle Checklist

## P0 (Must Fix Now)

### Backend Tasks
- [ ] Reinstate DB invariant: one live subscription per company.
  - Add migration to create partial unique index on `CompanySubscription(companyId)` for statuses `TRIAL|ACTIVE|SUSPENDED`.
  - Add migration guard script to fail deploy if index is missing.
- [ ] Add explicit `change-plan` workflow endpoint (do not overload `activate`).
  - Endpoint: `POST /platform/subscriptions/change-plan`.
  - Input: `companyId`, `targetPlanId`, `effectiveMode` (`IMMEDIATE`|`NEXT_CYCLE`), `reason`, `idempotencyKey`.
  - Output: old subscription state, new state, effective date, audit id.
- [ ] Add idempotency for subscription mutations.
  - Apply to: activate, extend, suspend, change-plan.
  - Persist by `(companyId, operationType, idempotencyKey)` with TTL and response replay.
- [ ] Enforce transaction-safe lifecycle transitions for subscriptions.
  - Validate allowed transitions in one transaction and log previous/new status.
  - Reject impossible transitions explicitly (409).
- [ ] Convert company hard-delete to archival-only in production.
  - Keep `DELETE /platform/companies/:id` disabled by default with feature flag (`ALLOW_HARD_DELETE=false`).
  - Return 409 with instruction to archive instead.
- [ ] Harden financial-data safety policy.
  - Block hard delete when company has invoices, ledger entries, expenses, deferred sales, installments, subscription payments, or audit logs.
  - Keep archival as reversible path.

### DB / Invariant Tasks
- [ ] `CompanySubscription` partial unique index for one-live-subscription invariant.
- [ ] Check constraint: `endDate > startDate` in `CompanySubscription`.
- [ ] Optional check constraint for allowed payment statuses per subscription status (or enforce in service with strict transition map).
- [ ] Add migration test to assert index/constraints exist after schema changes.

### Mobile Tasks
- [ ] Add company lifecycle parity APIs in mobile platform module:
  - `PATCH /platform/companies/:id` (update)
  - `PATCH /platform/companies/:id/archive`
  - `PATCH /platform/companies/:id/restore`
  - `DELETE /platform/companies/:id` (respect backend archival policy)
- [ ] Add UI actions in company detail screen for archive/restore (and delete only if policy allows).
- [ ] Add clear destructive action confirmations with business-safe wording.

### Notes
- This is the minimum safe baseline for an accounting SaaS before scale.

## P1 (Important Next)

### Backend Tasks
- [ ] Add subscription timeline endpoint.
  - `GET /platform/companies/:id/subscriptions/timeline` with normalized events.
- [ ] Add plan assignment preview endpoint.
  - `POST /platform/subscriptions/preview-change` returns resulting entitlements and quotas before commit.
- [ ] Add plan deactivation safety.
  - Prevent deactivating plan if it is currently assigned unless replacement policy is provided.
- [ ] Add owner consistency policy.
  - Enforce either one active OWNER per company or formal multi-owner policy (explicit decision + invariant).

### Web Tasks
- [ ] Refactor super-admin subscription UI to use explicit `change-plan` workflow instead of mixing activate/extend semantics.
- [ ] Add preflight/preview UX before applying plan changes.
- [ ] Show timeline of subscription and lifecycle actions in company details page.

### Mobile Tasks
- [ ] Add same change-plan flow and preview as web.
- [ ] Add subscription timeline view (read-only first).

### DB / Invariant Tasks
- [ ] Add index for timeline queries: `(companyId, createdAt DESC)` on subscription-related logs/events.

## P2 (Later / Advanced)

### Backend Tasks
- [ ] Tenant impersonation with strict security controls (MFA, reason, TTL session, full audit trail).
- [ ] Scheduled future-dated plan changes beyond next-cycle simple mode.
- [ ] Automated proration engine and billing reconciliation.

### Mobile/Web Tasks
- [ ] Deep analytics dashboards for lifecycle operations and plan migration cohorts.

### Defer Explicitly
- [ ] Company merge/split/restructuring operations.
- [ ] Cross-tenant data migration tooling.
- [ ] Multi-entity enterprise contract orchestration.

## Execution Order
1. Restore DB subscription invariant and protect it in migrations.
2. Ship explicit change-plan workflow + idempotency keys.
3. Disable hard delete by default and enforce archival policy.
4. Complete mobile lifecycle parity for already supported backend actions.
5. Add timeline + preview UX and APIs.
6. Defer enterprise transformations until proven business need.