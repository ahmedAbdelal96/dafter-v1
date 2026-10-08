# 46 - Invoice Use-Case Test Change Log

Date: 2026-04-01
Scope: focused mock-based unit tests for invoice create/update use-cases

## Test files created
1. `hesba-api-v1/src/modules/invoices/use-cases/create-invoice.use-case.spec.ts`
- Added tests for create orchestration success path and key early-failure branches.
- Validates helper invocation, transaction orchestration, repo payload mapping, and validation-error propagation.

2. `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.spec.ts`
- Added tests for update orchestration success/failure branches.
- Covers not-found, non-draft rejection, items-present branch, and tax-only branch behavior.

## Production files changed
- None.

## Behaviors now protected
- create use-case orchestration interactions with repository and shared draft-preparation helper layer
- update use-case branch decisions and payload transformations without DB dependency
- key guardrails (party not found, non-draft update rejection, invalid-product propagation path)

## Remaining untested
- real Prisma transaction behavior and persistence correctness
- broader invoice lifecycle integrations and API-level responses
- detailed diff payload invariants under many item mutation patterns

## Recommended follow-up
1. Add a narrow integration test (CI test DB) for one create + one update draft scenario.
2. Add one dedicated test for diff payload structure under item reorder/change cases.
