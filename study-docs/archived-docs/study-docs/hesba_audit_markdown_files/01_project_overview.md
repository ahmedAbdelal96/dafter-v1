# Project Overview

## What the project appears to be
The repository appears to be a multi-tenant accounting/business operations platform with:
- a NestJS backend API,
- a Next.js web dashboard,
- an Expo/React Native mobile dashboard,
- super-admin/platform management areas,
- load-test scripts,
- operational/documentation artifacts.

## Main business areas visible from code structure
Visible feature/module names strongly suggest the product supports:
- invoices
- customers
- suppliers
- employees
- installments
- deferred sales
- expenses
- ledger/accounting
- statements/reports
- notifications
- pricing/entitlements
- platform analytics / platform audit / platform management

## Major applications
### 1) Backend: `hesba-api-v1`
Tech direction suggests:
- NestJS
- Prisma
- Redis / Bull queues
- Swagger
- validation / throttling / logging / Sentry
- multi-tenant domain rules

### 2) Web dashboard: `hesba-dashboard`
Tech direction suggests:
- Next.js App Router
- React Query
- Zustand
- i18n / locale-aware routing
- protected role-based route handling
- feature-based frontend organization

### 3) Mobile dashboard: `hesba-dashboard-mobile`
Tech direction suggests:
- Expo / React Native / expo-router
- auth-aware navigation
- platform/super-admin views
- reusable feature modules
- secure storage and notification support

## Product identity issue
The repo naming and docs indicate identity drift across:
- Hesba / Hasba
- Daftar / dafter
- old beauty-center / salon / bookings concepts

This weakens team alignment and increases onboarding cost.

## Likely user roles
Visible code suggests at least:
- owner
- staff
- super admin / platform admin

## High-level architecture intent
A reasonable intended architecture seems to be:
- single backend API for multi-tenant accounting workflows
- web dashboard for tenant/admin operations
- mobile dashboard for platform or admin access
- common auth conventions and role-aware route access
- shared operational services (notifications, audit, platform analytics, etc.)

## Strengths
- Ambitious full-product scope
- Clear backend module decomposition
- Separate platform/super-admin concepts
- Multi-surface delivery (web + mobile)

## Weaknesses
- Architecture documentation is not trustworthy in its current form
- Naming consistency is weak
- Shared contracts and governance are not clearly enforced at repo level
