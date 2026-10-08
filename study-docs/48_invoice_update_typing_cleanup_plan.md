# 48 - Invoice Update Typing Cleanup Plan

Date: 2026-04-01
Scope: narrow typing/structure cleanup for invoice update flow

## 1) Exact files proposed for change
- `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.ts`
- `study-docs/49_invoice_update_typing_cleanup_verification.md` (new)
- `study-docs/50_invoice_update_typing_cleanup_change_log.md` (new)

## 2) Exact typing/structure improvements
1. Add local types for:
- existing invoice shape (inferred from repository return)
- update payload shape
- diff source and diff item shapes

2. Extract payload-building logic into a dedicated typed private method:
- explicit handling for `items-present` branch
- explicit handling for `tax-only` branch
- explicit issueDate normalization branch

3. Replace `any`-based `fieldsChanged` construction with tracked typed field list.
4. Replace mixed diff mapping with a typed formatter helper.

## 3) Intended behavioral impact
- No intended business behavior change.
- Same branch outcomes, same repository calls, same audit intent.

## 4) Risk assessment
- Low risk: internal refactor in one use-case file.
- Main risk: accidental payload shape drift.
- Mitigation: run existing invoice unit tests and backend build.

## 5) Rollback notes
- Revert `update-invoice.use-case.ts` to previous version.
- No schema/config/dependency change required.

## 6) Verification plan
- Run targeted invoice use-case + util tests.
- Run backend build.
- Confirm no additional production file changes were required.
