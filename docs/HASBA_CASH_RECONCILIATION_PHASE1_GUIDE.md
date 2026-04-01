# Hasba Cash Reconciliation — Phase 1 Operator Guide

## 1) Purpose
Cash Reconciliation in Phase 1 is an optional operational layer for end-of-day cash visibility.
It is designed to help companies record daily cash reality without changing official accounting flows.

Core Hasba value remains unchanged:
- Deferred sales
- Receivables tracking
- Customer balances
- Collections and finance follow-up

## 2) When to Use This Feature
Use Phase 1 cash reconciliation when a company wants lightweight day-end cash control without enforcing POS-style per-sale capture.

Typical use:
- Small traders who still process many cash sales outside the system
- Teams that need a daily cash snapshot (expected vs counted)
- Owner-led operational review at day close

Do not use it as:
- A replacement for invoices
- A replacement for official payments/ledger entries
- A POS workflow

## 3) Official vs Operational Numbers (Critical Separation)

### Official system-generated numbers
Generated from official transactions in Hasba:
- Invoices
- Payments
- Ledger entries
- Reports/dashboards based on official transaction data

These numbers are the source of truth for accounting behavior inside the system.

### Operational reconciliation numbers
Entered manually for day-end cash review:
- Opening cash
- Cash sales outside system
- Cash expenses outside system
- Actual counted cash
- Calculated expected cash and variance

These numbers are operational-only and must never be merged into official totals in Phase 1.

## 4) Phase 1 Modes
Company-level setting only (not per-user daily choice):

- `DISABLED`
  - No daily reconciliation workflow is active.
  - Cash reconciliation screens should show disabled guidance.

- `SIMPLE_DAILY`
  - Day-end reconciliation workflow is active.
  - Company can create/update one daily draft per business date, then close it.

## 5) SIMPLE_DAILY Scope (What Is Included)
Included in Phase 1:
- Company-level mode setting (`DISABLED` / `SIMPLE_DAILY`)
- Daily reconciliation record per `companyId + businessDate`
- Draft lifecycle: `DRAFT -> CLOSED`
- Backend-calculated:
  - `expectedCash = openingCash + cashSalesOutsideSystem - cashExpensesOutsideSystem`
  - `variance = actualCashCounted - expectedCash`
- Explicit existing-record behavior on same day:
  - Return existing draft if day already has `DRAFT`
  - Reject if day already has `CLOSED`

## 6) Out of Scope (Phase 1)
Not included:
- POS per-sale enforcement
- Shift/session/cashier workflows
- Multi-drawer support
- Approval chains
- Reopen workflow after close
- Ledger posting from reconciliation
- Merging reconciliation values into official totals/reports
- Mobile implementation
- `CASH-P1-WEB-03` (intentionally deferred)

## 7) Operational Rules and Safety Constraints
- Backend remains source of truth for calculations and lifecycle rules.
- One record per business day per company.
- Close is a terminal action in Phase 1.
- Editing after `CLOSED` is not allowed.
- Reconciliation is operational guidance, not official transaction replacement.

## 8) Operator Workflow (Web, Phase 1)
1. Go to Company Settings.
2. Set cash reconciliation mode:
   - `DISABLED` or `SIMPLE_DAILY`.
3. If `SIMPLE_DAILY`:
   - Open daily reconciliation page.
   - Select business date.
   - Enter day-end values.
   - Save draft.
4. Review expected cash and variance.
5. Close day when final.
6. After close:
   - Record is immutable in Phase 1.

## 9) UX Messaging Requirements
The UI must clearly state:
- Reconciliation is operational-only.
- It does not replace invoices, payments, or official accounting numbers.
- Disabled mode means no daily reconciliation flow is active.
- Closed day cannot be edited.

## 10) QA/Signoff Notes
Phase 1 verification focus:
- Mode behavior (`DISABLED` vs `SIMPLE_DAILY`)
- Owner/company-level control behavior
- Draft create/update behavior
- Unique daily record behavior
- Formula correctness (`expectedCash`, `variance`)
- Close transition and post-close immutability
- No ledger posting
- No official totals merge

Known non-blocking caveat:
- Arabic wording/encoding quality requires follow-up polish, but does not block behavior.

