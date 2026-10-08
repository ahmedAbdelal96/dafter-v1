# 44 - Invoice Use-Case Test Plan

Date: 2026-04-01
Scope: unit tests for invoice create/update orchestration (mock-only)
Product: Hesba

## 1) Responsibility of each use-case
### CreateInvoiceUseCase
- validate party snapshot exists
- invoke shared draft-item validation/preparation helpers
- orchestrate transaction boundaries via `repo.withTransaction`
- generate invoice number
- persist invoice with computed payload
- write audit log metadata

### UpdateInvoiceUseCase
- ensure invoice exists and status is DRAFT
- invoke shared draft-item validation helper
- snapshot previous items for diff
- branch behavior:
  - if items provided: recompute items/subtotal/tax/total
  - if items omitted and tax provided: recompute total from existing invoice values
- persist draft update and write audit log with diff/fieldsChanged

## 2) Highest-priority orchestration behaviors to test
1. happy-path orchestration for create with expected repo interactions
2. create early failure when party does not exist
3. update early failure branches (not found / non-draft)
4. update happy path with items present
5. update branch when items omitted but tax provided
6. propagation behavior when shared validation helper rejects (create)

## 3) Mock/stub strategy
- instantiate use-cases directly (no Nest testing module)
- mock `InvoicesRepository` methods used by each use-case
- mock `TranslationService.translate`
- mock `invoice-draft-preparation.util` functions with `jest.mock(...)` to verify invocation and orchestration wiring
- use `Prisma.Decimal` for numeric assertions in repo-call payloads

## 4) Proposed test cases
### create-invoice.use-case.spec.ts
1. success path: validates helper calls and repository payload (invoice number, computed items, tax/total, issueDate)
2. throws NotFoundException when party snapshot missing
3. propagates validation-helper rejection and avoids transaction calls

### update-invoice.use-case.spec.ts
1. throws NotFoundException when invoice not found
2. throws BadRequestException when invoice status is not DRAFT
3. success path with items provided: compute/sum/normalize path used and update payload expected
4. success branch with tax-only update (items omitted): compute helpers not used and total recomputed from existing values

## 5) Exact files likely to be created/changed
- `hesba-api-v1/src/modules/invoices/use-cases/create-invoice.use-case.spec.ts` (new)
- `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.spec.ts` (new)
- `study-docs/45_invoice_usecase_test_verification.md` (new)
- `study-docs/46_invoice_usecase_test_change_log.md` (new)

## 6) Risks / non-goals
- Non-goal: DB integration, Prisma runtime I/O, controller API tests.
- Non-goal: refactoring production use-cases.
- Risk: over-coupling tests to helper internals; mitigated by focusing on orchestration interactions and key payload effects only.
