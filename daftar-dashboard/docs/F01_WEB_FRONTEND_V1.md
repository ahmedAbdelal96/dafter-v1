# F01 web frontend delivery

## Scope

This delivery is the F01 web frontend implementation for the `daftar-dashboard`
application in the `daftar-v1` repository. It uses the existing Next.js,
TanStack Query, Axios, RBAC, locale routing, shared primitives and backend
contracts. `daftar-dashboard-mobile` and `todir-erp` are outside this change.

## Operational routes

- `/business-partners` — one authoritative customer/supplier party registry.
- `/sales/invoices` and `/invoices` — sales invoice draft, edit, inspect, post
  and draft deletion flows.
- `/sales/credit-notes` — partial/full sales corrections against posted
  invoices, with draft and posting states.
- `/payments` and `/ar-open-items` — customer payments, allocations, on-account
  drafts, posting, editing and reversal, plus explicit AR reconciliation.
- `/purchases/orders` — purchase-order draft, approval and conversion.
- `/purchases/invoices` — supplier-invoice draft and posting.
- `/purchases/credit-notes` — supplier corrections against posted invoices.
- `/supplier-payments` and `/ap-open-items` — supplier payments, allocations,
  on-account drafts, posting, editing and reversal, plus explicit AP
  reconciliation.
- `/settings/accounting` — backend accounting readiness and chart-of-accounts
  visibility.

Reports, inventory, payroll, HR, POS and mobile work were not expanded.

## API and ownership

The frontend adds typed services, query keys and hooks for Business Partners,
Sales, Purchases, Customer Payments, Supplier Payments and Accounting Setup.
The backend remains authoritative for tenant scope, permissions, tax
calculation, account eligibility, open-item ownership, posting, reversal,
immutability and reconciliation validity. No frontend table is used as a source
of accounting truth.

The payment and credit-note forms expose only backend-supported fields. Posted
documents render as read-only; mutation actions are permission-gated and the
server guards the corresponding routes.

## Roles and localization

Navigation and page guards use the backend permission names for partner, sales,
purchase, payment, reconciliation and accounting setup capabilities. English
and Arabic operation messages are provided, with RTL-safe document numbers,
dates and monetary values.

Development quick-login buttons are enabled only in development and read
passwords from the ignored local `.env.local`. No development password is
stored in tracked frontend source.

## Verification

Required frontend checks completed on the F01 branch:

- TypeScript: PASS (`npx tsc --noEmit`)
- i18n validation: PASS
- platform subscription contracts: PASS
- role contracts: PASS
- ESLint: PASS — 0 errors, 16 existing compatibility warnings
- production build: PASS (`next build`)
- API smoke: PASS — seeded Owner login and `200` responses for business
  partners, sales invoices, purchase orders, customer payments, supplier
  payments and accounting readiness.
- browser smoke: PARTIAL — the seeded Super Admin quick-login reached the
  platform dashboard in the live browser. The final operational-route browser
  interaction pass was blocked by the local browser-automation kernel failing
  before state initialization; direct HTTP route checks returned `200` for all
  F01 routes, but that is not reported as an interaction-flow PASS.

The build required a machine-local SWC cache directory because the Windows
user cache ACL rejected native binding materialization. This is an environment
condition only; no dependency or tracked build configuration was changed for
it.
