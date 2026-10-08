# 51 - Invoice Audit Behavior Test Plan

Date: 2026-04-01
Scope: audit/diff stabilization tests for `UpdateInvoiceUseCase`
Product: Hesba

## 1) Current audit/diff behavior
Inside `UpdateInvoiceUseCase.execute(...)`, after `updateDraft(...)` succeeds:
- `createAuditLog(...)` is called with:
  - `action: 'invoice.update'`
  - `entityType: 'Invoice'`
  - `metadata.invoiceNumber`
  - `metadata.fieldsChanged` derived from tracked dto fields in this order:
    - `items`, `issueDate`, `taxAmount`, `notes`
- `diff.before` is mapped from `beforeItems`
- `diff.after` is mapped from:
  - computed items when `dto.items` is provided
  - otherwise fallback to `beforeItems`
- each diff row shape is stringified:
  - `{ description, unitPrice, quantity }`

## 2) Highest-priority parts to stabilize
1. deterministic `fieldsChanged` content and ordering.
2. deterministic `diff.before`/`diff.after` shape and value stringification.
3. explicit difference between:
- items-present update (after should come from computed items)
- tax-only update (after should match beforeItems fallback)

## 3) Proposed test cases
1. Extend items-present test to assert `createAuditLog` payload contains:
- `fieldsChanged: ['items', 'issueDate', 'taxAmount', 'notes']`
- `diff.before` from old items
- `diff.after` from computed items

2. Extend tax-only test to assert:
- `fieldsChanged: ['taxAmount']`
- `diff.before` and `diff.after` both reflect same old items
- no false positives for omitted fields (`items`, `issueDate`, `notes`)

## 4) Tiny testability adjustment needed?
- No production-code change expected.
- Existing use-case structure already exposes behavior through repository call mocks.

## 5) Exact files likely to be changed
- `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.spec.ts`
- `study-docs/52_invoice_audit_behavior_test_verification.md`
- `study-docs/53_invoice_audit_behavior_test_change_log.md`

## 6) Risks / non-goals
- Non-goal: changing audit semantics or business behavior.
- Non-goal: DB/integration verification.
- Risk: brittle tests if asserting too much payload detail; mitigation: assert only high-value deterministic fields.
