# 43 - Invoice Utility Test Change Log

Date: 2026-04-01
Scope: narrow unit test pass for invoice draft preparation utility

## Test files created/updated
1. `hesba-api-v1/src/modules/invoices/use-cases/invoice-draft-preparation.util.spec.ts` (new)
- Added focused unit tests for:
  - product validation flow (skip/validate/fail)
  - computed line totals
  - subtotal aggregation
  - UTC issueDate normalization
  - shared compute+sum composition consistency

## Production files changed
- None.

## Behaviors now protected
- Utility product validation contract and NotFoundException path.
- Decimal-based item total and subtotal calculations.
- UTC start-of-day normalization behavior.
- Consistent shared arithmetic path used by both create/update use-cases.

## What remains untested
- Full use-case transaction orchestration.
- DB/repository integration behavior.
- Broader invoice module API-level behavior.

## Recommended follow-up
1. Add a narrow use-case-level unit test set for `CreateInvoiceUseCase` and `UpdateInvoiceUseCase` with mocked repository methods.
2. Optionally add one focused integration test for invoice creation in CI environment with controlled test DB.
