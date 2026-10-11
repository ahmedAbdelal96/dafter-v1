# B07 — Financial Reports, Aging, Statements and Finance Closure

B07 exposes read-only financial reporting under `/financial-reports`. Financial statements use only posted `JournalEntry` and `JournalLine` rows scoped to the authenticated company. Reversed originals remain in the report and their posted reversal is included, so an entry of 100 followed by its reversal has a net effect of zero.

## Definitions

- `postingDate` is the recognition date for GL, trial balance, P&L and balance sheet.
- Base-currency statements use `JournalLine.debit` and `JournalLine.credit`.
- Account sections use `AccountingAccountType`, never account-code prefixes.
- P&L presents income as credit-positive and expenses as debit-positive.
- Balance sheet includes current earnings when the period has not been closed into equity and returns an explicit integrity flag and difference.
- Aging uses due dates and keeps transaction currencies grouped; base-currency carrying amounts remain separate.
- Statements require a business partner and support one currency at a time; no mixed-currency running balance is created.

## APIs

`GET /financial-reports/general-ledger`

`GET /financial-reports/trial-balance`

`GET /financial-reports/profit-loss`

`GET /financial-reports/balance-sheet`

`GET /financial-reports/ar-aging`

`GET /financial-reports/ap-aging`

`GET /financial-reports/customer-statement`

`GET /financial-reports/supplier-statement`

`GET /financial-reports/period-close-readiness`

All queries obtain `companyId` from tenant authentication. Financial report reads require `viewFinancialReports`; legacy `viewReports` remains accepted for backward-compatible staff permissions. Period mutation continues to use the existing accounting-period rules; `CLOSED` remains non-reopenable where the accounting service prohibits reopening.

## Frontend

The dashboard provides locale-aware routes for `/reports/general-ledger`, `/reports/trial-balance`, `/reports/profit-loss`, `/reports/balance-sheet`, `/reports/ar-aging`, `/reports/ap-aging`, `/reports/customer-statements`, `/reports/supplier-statements`, and `/reports/finance-closure`. Each route supports loading, retry, empty state, refresh, browser print, and raw decimal CSV export.

## Performance and test expectations

GL and statements are paginated at the API boundary. Report queries are tenant-scoped and use the accounting indexes on company, posting date, account, journal, partner and source type. Regression coverage must preserve debit/credit equality, the balance-sheet equation, reversal netting, date semantics, decimal strings, multi-currency grouping and tenant isolation.
