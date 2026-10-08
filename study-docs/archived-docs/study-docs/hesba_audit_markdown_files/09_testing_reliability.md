# Testing & Reliability Audit

## Biggest issue
The visible automated test surface is too small for the system complexity.

## Current visible state
Backend test folder appears to contain only:
- `app.e2e-spec.ts`
- `jest-e2e.json`

For a system with many financial/business modules, that is not enough.

## Risks
- regressions in tenant isolation
- accounting invariants breaking silently
- role/permission drift
- UI flows breaking due to contract changes
- stale CI passing without meaningful protection

## Recommended test strategy

## Backend
### Critical integration tests
- invoice create/update/cancel flows
- deferred sales lifecycle
- installment schedule creation + settlement
- ledger balancing rules
- cash reconciliation workflows
- role authorization matrix
- tenant isolation across all query patterns

### Contract tests
- auth payload shape
- validation error shape
- entitlement error shape
- pagination/filter DTOs

## Web
- route protection tests
- feature-level component tests
- form validation tests
- query error/loading state tests
- one smoke e2e path per major business area

## Mobile
- role-gated navigation tests
- critical platform screens smoke tests
- API error/loading state coverage

## Reliability/process recommendations
- make CI fail on missing/lax coverage for critical modules
- add migration verification
- add seed/test-fixture discipline
- create a release checklist tied to automated evidence
