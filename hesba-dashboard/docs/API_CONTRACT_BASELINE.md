# API Contract Baseline (Daftar v1)

Source of truth backend: `dafter-api-v1`  
API prefix: `/api/v1`  
Base URL (local): `http://localhost:7000/api/v1`

This baseline is used to avoid frontend/backend drift while modules are implemented.

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/change-password`
- `GET /auth/me`
- `PATCH /auth/me`
- `GET /auth/sessions`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## Users
- `POST /users/staff`
- `GET /users/stats`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/permissions`
- `PATCH /users/:id/disable`
- `PATCH /users/:id/enable`

## Master Data
- Customers: `POST|GET /customers`, `GET|PATCH|DELETE /customers/:id`
- Suppliers: `POST|GET /suppliers`, `GET|PATCH|DELETE /suppliers/:id`
- Employees: `POST|GET /employees`, `GET|PATCH|DELETE /employees/:id`
- Products: `POST|GET /products`, `GET|PATCH|DELETE /products/:id`

## Transactions
- Expenses:
  - `POST /expenses`
  - `GET /expenses/summary`
  - `GET /expenses`
  - `GET|PATCH|DELETE /expenses/:id`
- Invoices:
  - `POST /invoices`
  - `POST /invoices/from-deferred-sale/:saleId`
  - `GET /invoices`
  - `GET /invoices/:id`
  - `DELETE /invoices/:id`
- Deferred Sales:
  - `POST /deferred-sales`
  - `GET /deferred-sales`
  - `GET /deferred-sales/:id`
  - `POST /deferred-sales/:id/payments`
  - `PATCH /deferred-sales/:id/cancel`
- Installments:
  - `POST /installments/contracts`
  - `GET /installments/contracts`
  - `GET /installments/schedule`
  - `GET /installments/contracts/:id`
  - `POST /installments/contracts/:id/payments`
  - `PATCH /installments/contracts/:id/cancel`
- Ledger:
  - `POST /ledger`
  - `DELETE /ledger/:id`
  - `GET /ledger/statement`

## Reports
- `GET /reports/summary`
- `GET /reports/overdue`
- `GET /reports/collection-schedule`

## Notifications
- `POST /notifications/device-token`
- `DELETE /notifications/device-token/:token`
- `GET /notifications/unread-count`
- `GET /notifications`
- `PATCH /notifications/read-all`
- `PATCH /notifications/:id/read`

## Platform (Super Admin)
- Companies:
  - `POST /platform/companies`
  - `GET /platform/companies`
  - `GET /platform/companies/:id`
  - `GET /platform/companies/:id/metrics`
- Plans:
  - `POST /platform/plans`
  - `GET /platform/plans`
  - `PATCH /platform/plans/:id`
- Subscriptions:
  - `POST /platform/subscriptions/activate`
  - `POST /platform/subscriptions/suspend`
  - `POST /platform/subscriptions/extend`

## Contract Rule
- Any backend route or response-shape change must be reflected in:
  - `src/lib/api/services/*`
  - `src/lib/api/types.ts` (or module types)
  - module page and hooks using that endpoint

