# Modular Seed System

This folder contains a full modular seed pipeline for the Daftar backend.

## Run

```bash
npm run db:seed
```

## Order

The master runner is `prisma/seeds/index.ts` and executes modules in this order:

1. reset
2. platform + tenants + users
3. parties + balances
4. products
5. ledger activity
6. deferred sales + installments
7. expenses
8. invoices + invoice items
9. notifications + audit logs

## Accounts

- superadmin@daftar.com / superadmin123
- owner@daftar.com / owner123
- owner2@daftar.com / owner123

## Encoding rule (important)

Keep all seed files in UTF-8. The project now has `.editorconfig` with `charset = utf-8` to avoid Arabic text corruption (`???`).
