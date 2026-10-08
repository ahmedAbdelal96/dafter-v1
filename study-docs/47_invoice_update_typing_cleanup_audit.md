# 47 - Invoice Update Typing Cleanup Audit

Date: 2026-04-01
Scope: `hesba-api-v1/src/modules/invoices/use-cases/update-invoice.use-case.ts`
Product: Hesba

## 1) Current update flow summary
- Loads invoice by id + company and enforces `DRAFT` status.
- Validates product ownership for incoming `dto.items`.
- Loads existing items for audit diff snapshot.
- Executes transaction:
  - computes update payload (items/tax/total/issueDate)
  - calls `repo.updateDraft(...)`
  - writes audit log with `fieldsChanged` and item before/after diff

## 2) Where typing was weak/unclear (before this pass)
- `diff.after` mapping used conditional checks and `any` cast.
- `fieldsChanged` used `Object.keys(dto)` with `(dto as any)[k]`.
- Payload computation variables were spread in one large block with broad optional variables.

## 3) Where payload construction was hard to reason about
- Branches (`items present` vs `tax-only`) were intertwined with transaction body.
- Data-shaping + audit formatting lived together, making intent less explicit.

## 4) `any` / broad shape usage observed
- `any` cast in after-diff mapping.
- `any` cast while computing changed fields from dto keys.

## 5) Top cleanup opportunities
1. Introduce explicit local types for payload and diff source item.
2. Extract update payload building into a small typed helper method.
3. Replace `Object.keys + any` with explicit tracked-field list.
4. Replace mixed diff mapping with a typed formatter function.

## 6) Recommended narrow scope for this pass
- Touch only `update-invoice.use-case.ts`.
- Keep business logic and repo contracts unchanged.
- Focus on typing/readability and ambiguity reduction.

## 7) Confidence level
- High confidence for narrow, behavior-safe typing cleanup.
