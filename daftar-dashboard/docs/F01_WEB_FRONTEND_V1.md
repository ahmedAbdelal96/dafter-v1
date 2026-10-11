# F01 web frontend delivery

## Scope

This delivery is the F01 web frontend implementation for the `daftar-dashboard`
application in the `daftar-v1` repository. It uses the existing Next.js,
TanStack Query, Axios, RBAC, locale routing, shared primitives and backend
contracts. `daftar-dashboard-mobile` and `todir-erp` are outside this change.

## Operational routes

- `/business-partners` — one authoritative customer/supplier party registry.
- `/sales/invoices` and `/invoices` — sales invoice draft creation, inspection,
  posting and draft deletion. Complete draft editing is deferred.
- `/sales/credit-notes` — partial/full sales corrections against posted
  invoices, with draft and posting states.
- `/payments` and `/ar-open-items` — customer payments, one-item allocation or
  on-account drafts, posting, draft editing and reversal, plus explicit AR
  reconciliation.
- `/purchases/orders` — purchase-order draft creation, approval and conversion.
  Complete draft editing is deferred.
- `/purchases/invoices` — supplier-invoice draft creation and posting.
  Complete draft editing is deferred.
- `/purchases/credit-notes` — supplier corrections against posted invoices.
- `/supplier-payments` and `/ap-open-items` — supplier payments, one-item
  allocation or on-account drafts, posting, draft editing and reversal, plus
  explicit AP reconciliation.
- `/settings/accounting` — backend accounting readiness and chart-of-accounts
  visibility.

Reports, inventory, payroll, HR, POS and mobile work were not expanded.

## API and ownership

Open items use the backend contract directly: `id`, `type`, `maturityId`,
`invoiceId`, `dueDate`, `documentReference`, `sourceType`, `sourceId`,
`businessPartnerId`, `currencyCode`, `originalTransactionAmount`,
`originalBaseAmount`, `activeReconciledTransactionAmount`,
`activeReconciledBaseAmount`, `remainingTransactionAmount`,
`remainingBaseAmount`, `remainingAmount`, and the AR/AP account object. The
frontend uses `id` as the JournalLine identifier; there is no OpenItem
`journalLineId` contract. Payment allocation request DTOs still send that
backend identifier in their `journalLineId` field.

AR/AP tables display backend-provided original, actively reconciled and
remaining transaction amounts, currency, due date and document/source
reference. The browser does not calculate authoritative balances. Debit and
credit reconciliation selectors are split from the backend `type` value, and
the backend remains the final validation authority.

Payment drafts support one selected open item plus an optional on-account
remainder. For example, a payment of `1000` with an allocation of `600` sends
`amount: "1000"` and `allocations[0].amount: "600"`; no selected item sends an
empty allocation list for a full on-account payment. Allocation input must be
greater than zero and no greater than the payment amount.

Payment methods are `CASH`, `BANK_TRANSFER`, `CHEQUE`, `CARD` and `OTHER`.
Cash source selection shows only `ASSET_CASH`; bank transfer, cheque and card
show only `ASSET_BANK`; other shows cash and bank accounts. The account contract
uses the backend `accountType` field, and backend accounting validation remains
authoritative.

Supplier Payment permissions are mapped independently: create uses
`createSupplierPayment`, draft editing uses `editSupplierPayment`, posting uses
`postSupplierPayment`, reversal uses `reverseSupplierPayments`, and AP
reconciliation uses `reconcileSupplierAP`.

The backend remains authoritative for tenant scope, permissions, tax
calculation, account eligibility, open-item ownership, posting, reversal,
immutability and reconciliation validity. No frontend table is used as a
source of accounting truth. Posted documents render as read-only and mutation
actions are permission-gated.

## Roles and localization

Navigation and page guards use the backend permission names for partner, sales,
purchase, payment, reconciliation and accounting setup capabilities. English
and Arabic operation messages are provided, including the cheque method label,
with RTL-safe document numbers, dates and monetary values.

Development quick-login buttons are enabled only in development and read
passwords from the ignored local `.env.local`. No development password is
stored in tracked frontend source.

## Verification

- Focused frontend runtime-contract tests: PASS — 13 assertions covering the
  real open-item fields, display mapping, allocation payload, debit/credit
  split, supplier reversal permission and cash/bank account filtering.
- TypeScript: PASS (`npx tsc --noEmit`)
- i18n validation: PASS
- platform subscription contracts: PASS
- role contracts: PASS
- ESLint: PASS — 0 errors; existing React Compiler compatibility warnings are
  reported separately by lint.
- Production build: PASS (`next build`)
- API smoke: PASS when seeded backend data is available; Owner login and the
  AR/AP/payment/accounting endpoints were verified using real local API data.
- Browser smoke: PARTIAL — seeded Super Admin quick-login reached the platform
  dashboard. Final interactive Owner operational flows were not claimed as
  PASS because the local browser-automation kernel failed before state
  initialization. Direct HTTP route checks are not substituted for browser
  interaction claims.

The GitHub Web Dashboard CI uses Node.js 22 because the focused runtime
contract test uses Node's built-in TypeScript stripping support.

The build and local development verification required a machine-local SWC
cache directory. On this Windows environment, the dev server was run with the
Webpack mode when Turbopack's Google-font resolver failed; this changed no
tracked configuration or dependency.

