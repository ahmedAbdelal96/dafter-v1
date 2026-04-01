# RBAC Matrix (Frontend)

Source config: `src/config/rbac.ts`

## Roles
- `SUPER_ADMIN`
- `OWNER`
- `ACCOUNTANT`
- `RECEPTION`
- `STAFF`

## Notes
- `SUPER_ADMIN` has wildcard `*`.
- Matrix below is for dashboard behavior and UI action guards.
- Backend authorization remains the final authority.

## Module Permissions (high-level)

### Master Data
- Customers: `customers:view|create|update|delete`
- Suppliers: `suppliers:view|create|update|delete`
- Employees: `employees:view|create|update|delete`
- Products: `products:view|create|update|delete`

### Transactions
- Invoices: `invoices:view|create|delete`
- Expenses: `expenses:view|create|update|delete`
- Deferred Sales: `deferredSales:view|create|update`
- Installments: `installments:view|create|update`
- Ledger: `ledger:view|create|delete`

### Operations
- Reports: `reports:view|export`
- Notifications: `notifications:view|update`
- Users: `users:view|create|update|disable|permissions`
- Settings: `settings:view|update`

## Quick Matrix

| Role | Scope |
|---|---|
| SUPER_ADMIN | Full platform access |
| OWNER | Full tenant dashboard access |
| ACCOUNTANT | Financial + reporting operations |
| RECEPTION | Operational front-office flows |
| STAFF | Read-mostly limited operational access |

