# Daftar (دفتر) — Implementation Tracking Plan

> نظام SaaS لإدارة الحسابات التجارية — NestJS + PostgreSQL + Prisma + Expo
> آخر تحديث: 2026-02-21

---

## Architecture Pattern

```
Controller → [Swagger Docs] → Service → Use Cases → Repository → Prisma
```

**كل Module بيتكون من:**

```
src/modules/{module-name}/
├── {name}.module.ts
├── {name}.controller.ts
├── {name}.service.ts
├── {name}.repository.ts
├── swagger/
│   └── {name}.swagger.ts
├── dto/
│   ├── create-{name}.dto.ts
│   ├── update-{name}.dto.ts
│   └── index.ts
├── use-cases/
│   ├── {operation}.use-case.ts
│   └── index.ts
└── interfaces/
    └── {name}.interfaces.ts
```

**Security Chain (لكل API):**

```
Request → JwtAuthGuard → TenantGuard → RolesGuard → PermissionsGuard → SubscriptionGuard → Controller
```

**API Response Format (موحد):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "تم بنجاح",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

## Phase 0 — Foundation Setup

> تنظيف الكود القديم + إعداد البنية التحتية

### 0.1 — Clean Old Code

- [x] مسح `src/modules/` بالكامل (auth, tenants, users, settings, notifications)
- [x] مسح `src/common/types/` (salon types)
- [x] مسح i18n الخاطئ (bookings, clients, services, staff, loyalty, reviews)
- [x] مسح `src/database/database.module.ts` (salon repositories)

### 0.2 — Adapt Existing Infrastructure (7 files)

- [x] `tenant-subscription.guard.ts` — "الصالون" → "المنشأة"
- [x] `public-tenant-subscription.guard.ts` — نفس التعديلات
- [x] `subscription.decorator.ts` — حذف `ReceptionWrite()`
- [x] `tenant.middleware.ts` — "Salon not found" → "Company not found"
- [x] `feature-flags.service.ts` — حذف salon flags
- [x] `prisma.service.ts` — `dafter-backend` → `daftar-backend`
- [x] Config: `app.config.ts` + `email.config.ts` — تحديث references

### 0.3 — Setup main.ts (Professional)

- [x] CORS configuration
- [x] Helmet security headers
- [x] Global ValidationPipe (whitelist + transform)
- [x] Swagger setup (`/api/docs`)
- [x] API prefix (`/api/v1`)
- [x] Global Exception Filter
- [x] Global Logging Interceptor
- [x] Rate limiting (Throttler)

### 0.4 — Setup app.module.ts

- [x] ConfigModule (env validation + global)
- [x] PrismaModule (global)
- [x] LoggerModule (global)
- [x] CacheModule (global)
- [x] ThrottlerModule (global)
- [x] TranslationModule (global)
- [x] Global guards registration (JWT, Roles, Permissions)

### 0.5 — i18n (Accounting Domain)

- [x] `ar/common.json` — رسائل عامة (تحديث)
- [x] `ar/auth.json` — رسائل تسجيل الدخول
- [x] `ar/companies.json` — رسائل الشركات
- [x] `ar/customers.json` — رسائل العملاء
- [x] `ar/suppliers.json` — رسائل الموردين
- [x] `ar/employees.json` — رسائل الموظفين
- [x] `ar/ledger.json` — رسائل الحركات المالية
- [x] `ar/reports.json` — رسائل التقارير
- [x] `ar/users.json` — رسائل المستخدمين
- [x] `ar/platform.json` — رسائل إدارة المنصة
- [x] `en/` — نفس الملفات بالإنجليزي

### 0.6 — Common Types (Accounting Domain)

- [x] `src/common/types/index.ts` — re-exports
- [x] `src/common/types/common.types.ts` — PaginatedResult, ApiResponse, Money, DateRange
- [x] `src/common/types/enums.types.ts` — re-export Prisma enums
- [x] `src/common/types/auth.types.ts` — AuthenticatedUser, JwtPayload, AuthTokens

### 0.7 — Database Layer

- [x] تشغيل `prisma migrate dev` (migration أولي)
- [x] `src/database/database.module.ts` — module جديد (clean)

### 0.8 — Health Endpoint

- [x] `GET /api/v1/health` — server + DB status
- [x] Swagger documentation للـ health endpoint

### 0.9 — Verify Foundation

- [x] السيرفر يشتغل بدون أخطاء
- [x] Swagger يفتح على `/api/docs`
- [x] Health endpoint يرجع 200
- [x] Database connected

---

## Phase A — Auth Module ✅ COMPLETED

> تسجيل حساب + تسجيل دخول + JWT + Refresh Token Rotation + Account Lockout

### A.1 — Module Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts
├── swagger/auth.swagger.ts
├── strategies/jwt.strategy.ts
├── services/token.service.ts
├── dto/
│   ├── register.dto.ts         ← جديد: تسجيل الحساب
│   ├── login.dto.ts
│   ├── refresh-token.dto.ts
│   ├── change-password.dto.ts
│   └── index.ts
└── use-cases/
    ├── register.use-case.ts    ← جديد: تسجيل شركة + Owner + اشتراك تجريبي
    ├── login.use-case.ts
    ├── refresh-token.use-case.ts
    ├── logout.use-case.ts
    ├── logout-all.use-case.ts
    ├── change-password.use-case.ts
    ├── get-profile.use-case.ts
    └── index.ts
```

### A.2 — APIs

- [x] `POST /api/v1/auth/register` — تسجيل حساب شركة جديدة (+ Owner + اشتراك تجريبي 14 يوم)
- [x] `POST /api/v1/auth/login` — تسجيل دخول (JWT + Refresh Token)
- [x] `POST /api/v1/auth/refresh` — تجديد التوكن (rotation + token theft detection)
- [x] `POST /api/v1/auth/logout` — إلغاء session واحدة
- [x] `POST /api/v1/auth/logout-all` — إلغاء كل الـ sessions
- [x] `POST /api/v1/auth/change-password` — تغيير كلمة المرور (+ إلغاء كل الجلسات)
- [x] `GET /api/v1/auth/me` — بيانات المستخدم الحالي + الشركة + الصلاحيات

### A.3 — Security Features

- [x] bcrypt password hashing (12 salt rounds)
- [x] Refresh token rotation (revoke old on use)
- [x] Token theft detection (reuse of revoked token → revoke ALL sessions)
- [x] Device tracking (userAgent, IP)
- [x] Account lockout via Redis (5 failed attempts → 15 min lock)
- [x] Rate limiting: register (5/min), login (10/min)
- [x] SHA-256 hashed refresh tokens in DB (never stored raw)

### A.4 — Self-Registration (جديد)

- [x] شركة تسجل نفسها وتحصل على فترة تجريبية مجانية (TRIAL_DAYS=14)
- [x] المسجِّل يصبح Owner/Admin للشركة
- [x] إنشاء خطة FREE_TRIAL تلقائياً (3 users, 50 customers, 20 suppliers, 10 employees, 500 entries)
- [x] كل العمليات atomic داخل `prisma.$transaction()`

### A.5 — Testing & Verification

- [x] Register ينشئ company + owner + subscription + tokens
- [x] Login يرجع access + refresh tokens
- [x] Refresh rotation يشتغل
- [x] Logout يلغي الـ token
- [x] Invalid credentials يرجع 401
- [x] Build passes (zero errors)
- [x] Server starts with all 7 routes mapped
- [x] Swagger documentation كاملة

---

## Phase B — Platform Module (إدارة المنصة)

> Super Admin: إنشاء شركات + خطط + اشتراكات

### B.1 — Module Structure

```
src/modules/platform/
├── platform.module.ts
├── platform.controller.ts
├── platform.service.ts
├── platform.repository.ts
├── swagger/platform.swagger.ts
├── dto/
│   ├── create-company.dto.ts
│   ├── create-plan.dto.ts
│   ├── activate-subscription.dto.ts
│   ├── suspend-subscription.dto.ts
│   ├── company-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-company.use-case.ts
    ├── list-companies.use-case.ts
    ├── get-company.use-case.ts
    ├── create-plan.use-case.ts
    ├── list-plans.use-case.ts
    ├── activate-subscription.use-case.ts
    ├── suspend-subscription.use-case.ts
    ├── get-company-metrics.use-case.ts
    └── index.ts
```

### B.2 — APIs

- [ ] `POST /api/v1/platform/companies` — إنشاء شركة + owner (transaction)
- [ ] `GET /api/v1/platform/companies` — عرض كل الشركات (pagination + search)
- [ ] `GET /api/v1/platform/companies/:id` — تفاصيل شركة
- [ ] `GET /api/v1/platform/companies/:id/metrics` — إحصائيات استخدام الشركة
- [ ] `POST /api/v1/platform/plans` — إنشاء خطة اشتراك
- [ ] `GET /api/v1/platform/plans` — عرض الخطط
- [ ] `PATCH /api/v1/platform/plans/:id` — تعديل خطة
- [ ] `POST /api/v1/platform/subscriptions/activate` — تفعيل اشتراك
- [ ] `POST /api/v1/platform/subscriptions/suspend` — إيقاف اشتراك
- [ ] `POST /api/v1/platform/subscriptions/extend` — تمديد اشتراك

### B.3 — Business Rules

- [ ] Super Admin فقط يقدر يوصل لكل الـ endpoints
- [ ] إنشاء شركة = إنشاء Owner User تلقائياً (atomic transaction)
- [ ] ✅ الشركات تقدر تسجل نفسها مع اشتراك تجريبي (تم في Phase A - Register)
- [ ] Super Admin يقدر يرقّي الاشتراك التجريبي لخطة مدفوعة
- [ ] كل شركة لازم يكون لها subscription قبل الاستخدام

### B.4 — Testing & Verification

- [ ] إنشاء شركة ينشئ owner + subscription
- [ ] Non-super-admin يرجع 403
- [ ] Plan limits تتطبق على الشركات
- [ ] Swagger documentation كاملة

---

## Phase C — Users Module (إدارة المستخدمين)

> Owner يدير الـ Staff داخل شركته

### C.1 — Module Structure

```
src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── swagger/users.swagger.ts
├── dto/
│   ├── create-staff.dto.ts
│   ├── update-user.dto.ts
│   ├── update-permissions.dto.ts
│   ├── user-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-staff.use-case.ts
    ├── list-users.use-case.ts
    ├── get-user.use-case.ts
    ├── update-user.use-case.ts
    ├── update-permissions.use-case.ts
    ├── disable-user.use-case.ts
    └── index.ts
```

### C.2 — APIs

- [ ] `POST /api/v1/users/staff` — إنشاء موظف (Staff)
- [ ] `GET /api/v1/users` — عرض مستخدمي الشركة (pagination + search)
- [ ] `GET /api/v1/users/:id` — تفاصيل مستخدم
- [ ] `PATCH /api/v1/users/:id` — تعديل بيانات مستخدم
- [ ] `PATCH /api/v1/users/:id/permissions` — تعديل صلاحيات Staff
- [ ] `PATCH /api/v1/users/:id/disable` — تعطيل مستخدم
- [ ] `GET /api/v1/users/stats` — إحصائيات المستخدمين

### C.3 — Business Rules

- [ ] Owner فقط يقدر يضيف/يعدل Staff
- [ ] مينفعش يحذف أو يعطل آخر Owner في الشركة
- [ ] كل Staff يتعمله StaffPermission row
- [ ] Tenant-scoped (companyId) — المستخدم يشوف بس ناس شركته
- [ ] Check plan limit (maxUsers) قبل الإنشاء

### C.4 — Testing & Verification

- [ ] Owner يقدر يعمل staff
- [ ] Staff مش يقدر يعمل staff تاني
- [ ] آخر owner مينفعش يتعطل
- [ ] Swagger documentation كاملة

---

## Phase D — Parties: Customers Module

> إدارة العملاء + الأرصدة الافتتاحية

### D.1 — Module Structure

```
src/modules/customers/
├── customers.module.ts
├── customers.controller.ts
├── customers.service.ts
├── customers.repository.ts
├── swagger/customers.swagger.ts
├── dto/
│   ├── create-customer.dto.ts
│   ├── update-customer.dto.ts
│   ├── customer-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-customer.use-case.ts
    ├── list-customers.use-case.ts
    ├── get-customer.use-case.ts
    ├── update-customer.use-case.ts
    ├── delete-customer.use-case.ts
    └── index.ts
```

### D.2 — APIs

- [ ] `POST /api/v1/customers` — إنشاء عميل (+ balance init)
- [ ] `GET /api/v1/customers` — عرض العملاء (pagination + search)
- [ ] `GET /api/v1/customers/:id` — تفاصيل عميل + رصيده
- [ ] `PATCH /api/v1/customers/:id` — تعديل بيانات عميل
- [ ] `DELETE /api/v1/customers/:id` — حذف عميل (soft delete)

### D.3 — Business Rules

- [ ] إنشاء عميل = `prisma.$transaction()`:
  - Create customer
  - Create Balance row (balance = openingBalance)
  - Create AuditLog
- [ ] مينفعش يتحذف عميل عليه حركات ledger
- [ ] تحذير عند تجاوز creditLimit
- [ ] Check plan limit (maxCustomers) قبل الإنشاء
- [ ] Tenant-scoped (companyId)

### D.4 — Testing & Verification

- [ ] إنشاء عميل ينشئ balance row
- [ ] Opening balance يتسجل صح
- [ ] عميل عليه حركات مينفعش يتحذف
- [ ] Swagger documentation كاملة

---

## Phase D+ — Parties: Suppliers Module

> نفس pattern العملاء — بعكس اتجاه الديون

### D+.1 — Module Structure

```
src/modules/suppliers/
├── (same structure as customers)
```

### D+.2 — APIs

- [ ] `POST /api/v1/suppliers` — إنشاء مورد (+ balance init)
- [ ] `GET /api/v1/suppliers` — عرض الموردين (pagination + search)
- [ ] `GET /api/v1/suppliers/:id` — تفاصيل مورد + رصيده
- [ ] `PATCH /api/v1/suppliers/:id` — تعديل بيانات مورد
- [ ] `DELETE /api/v1/suppliers/:id` — حذف مورد (soft delete)

### D+.3 — Business Rules

- [ ] نفس rules العملاء + عكس اتجاه الديون
- [ ] Check plan limit (maxSuppliers)
- [ ] Tenant-scoped (companyId)

### D+.4 — Testing & Verification

- [ ] نفس اختبارات العملاء
- [ ] Swagger documentation كاملة

---

## Phase D++ — Parties: Employees Module

> موظفين كأطراف حسابية (سلف + رواتب + خصومات)

### D++.1 — Module Structure

```
src/modules/employees/
├── (same structure as customers)
```

### D++.2 — APIs

- [ ] `POST /api/v1/employees` — إنشاء موظف حسابي (+ balance init)
- [ ] `GET /api/v1/employees` — عرض الموظفين (pagination + search)
- [ ] `GET /api/v1/employees/:id` — تفاصيل موظف + رصيده
- [ ] `PATCH /api/v1/employees/:id` — تعديل بيانات موظف
- [ ] `DELETE /api/v1/employees/:id` — حذف موظف (soft delete)

### D++.3 — Business Rules

- [ ] نفس الـ pattern + LedgerEntryType خاص (ADVANCE, SALARY_PAYMENT, DEDUCTION)
- [ ] Check plan limit (maxEmployees)
- [ ] Tenant-scoped (companyId)

### D++.4 — Testing & Verification

- [ ] نفس اختبارات العملاء
- [ ] Swagger documentation كاملة

---

## Phase E — Ledger Engine (القلب)

> الحركات المالية + الأرصدة اللحظية + كشف الحساب

### E.1 — Module Structure

```
src/modules/ledger/
├── ledger.module.ts
├── ledger.controller.ts
├── ledger.service.ts
├── ledger.repository.ts
├── swagger/ledger.swagger.ts
├── dto/
│   ├── create-entry.dto.ts
│   ├── statement-query.dto.ts
│   ├── entry-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-entry.use-case.ts
    ├── delete-entry.use-case.ts
    ├── get-statement.use-case.ts
    ├── list-entries.use-case.ts
    └── index.ts
```

### E.2 — APIs

- [ ] `POST /api/v1/ledger` — إنشاء حركة مالية (atomic transaction)
- [ ] `DELETE /api/v1/ledger/:id` — حذف حركة (soft delete + reverse balance)
- [ ] `GET /api/v1/ledger/statement` — كشف حساب (running balance)
- [ ] `GET /api/v1/ledger` — عرض الحركات (pagination + filters)

### E.3 — Create Entry Algorithm (Atomic)

```
prisma.$transaction():
  1. ✅ Verify subscription (active/trial + not expired)
  2. ✅ Verify user permission (Owner or manageLedger)
  3. ✅ Verify party exists (same companyId, not deleted)
  4. ✅ Validate: amount ≠ 0, dueDate >= entryDate
  5. ✅ Check plan limit (maxLedgerEntries)
  6. INSERT ledger_entry
  7. UPSERT balance: balance += signedAmount
  8. INSERT audit_log
  9. COMMIT
```

### E.4 — Delete Entry Algorithm (Atomic)

```
prisma.$transaction():
  1. ✅ Verify permission (manageLedger)
  2. Find entry (company-scoped, not already deleted)
  3. Soft delete: isDeleted = true, deletedAt = now()
  4. Reverse balance: balance -= signedAmount
  5. INSERT audit_log
  6. COMMIT
```

### E.5 — Statement Query (Running Balance)

```sql
SELECT *,
  openingBalance + SUM(signedAmount)
    OVER (ORDER BY entryDate, createdAt) AS runningBalance
FROM ledger_entries
WHERE companyId = $1 AND partyType = $2 AND partyId = $3
  AND isDeleted = false
  AND entryDate BETWEEN $from AND $to
```

### E.6 — Business Rules

- [ ] كل عملية Ledger في Transaction واحدة
- [ ] منع مبلغ = 0
- [ ] dueDate >= entryDate (لو موجود)
- [ ] signedAmount: موجب = زيادة مديونية، سالب = سداد
- [ ] Audit logging لكل عملية

### E.7 — Testing & Verification

- [ ] إنشاء حركة يحدث balance
- [ ] حذف حركة يعكس balance
- [ ] Statement يظهر running balance صح
- [ ] Concurrent transactions لا تسبب race condition
- [ ] Swagger documentation كاملة

---

## Phase F — Reports Module

> ملخصات + متأخرات + Dashboard

### F.1 — Module Structure

```
src/modules/reports/
├── reports.module.ts
├── reports.controller.ts
├── reports.service.ts
├── reports.repository.ts
├── swagger/reports.swagger.ts
├── dto/
│   ├── report-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── get-summary.use-case.ts
    ├── get-overdue.use-case.ts
    ├── get-party-report.use-case.ts
    └── index.ts
```

### F.2 — APIs

- [ ] `GET /api/v1/reports/summary` — إجمالي أرصدة (عملاء + موردين + موظفين)
- [ ] `GET /api/v1/reports/overdue` — حركات متأخرة (dueDate < today)
- [ ] `GET /api/v1/reports/party/:partyType` — تقرير تفصيلي حسب نوع الطرف

### F.3 — Business Rules

- [ ] Tenant-scoped
- [ ] فلترة بالتاريخ (from, to)
- [ ] Permission: viewReports
- [ ] أداء عالي (indexed queries)

### F.4 — Testing & Verification

- [ ] Summary يرجع أرقام صحيحة
- [ ] Overdue يرجع الحركات المتأخرة فعلاً
- [ ] Swagger documentation كاملة

---

## Phase G — Audit Module

> سجل العمليات الحساسة

### G.1 — Module Structure

```
src/modules/audit/
├── audit.module.ts
├── audit.controller.ts
├── audit.service.ts
├── audit.repository.ts
├── swagger/audit.swagger.ts
├── dto/
│   ├── audit-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── list-audit-logs.use-case.ts
    ├── get-audit-log.use-case.ts
    └── index.ts
```

### G.2 — APIs

- [ ] `GET /api/v1/audit` — عرض سجل العمليات (pagination + filters)
- [ ] `GET /api/v1/audit/:id` — تفاصيل عملية

### G.3 — Business Rules

- [ ] Owner فقط يشوف الـ audit logs
- [ ] Tenant-scoped
- [ ] فلترة بـ: action, entityType, actorUserId, dateRange
- [ ] Read-only (لا يمكن حذف أو تعديل)

### G.4 — Testing & Verification

- [ ] كل عمليات الـ ledger تسجل audit log
- [ ] كل عمليات الـ parties تسجل audit log
- [ ] Staff مش يقدر يشوف audit logs
- [ ] Swagger documentation كاملة

---

## Phase H — Hardening & Quality

> تأمين + تحسين أداء + اختبارات

### H.1 — Security

- [ ] Rate limiting على كل الـ endpoints
- [ ] Input validation شامل (كل DTO)
- [ ] Password policy (minimum 8 chars, mixed)
- [ ] Token expiry configuration
- [ ] CORS whitelist
- [ ] Helmet headers

### H.2 — Performance

- [ ] Database indexes verification
- [ ] Query optimization (N+1 prevention)
- [ ] Connection pooling tuning
- [ ] Response compression

### H.3 — Testing

- [ ] Unit tests — Use Cases
- [ ] Integration tests — Ledger atomic transactions
- [ ] E2E tests — Auth flow
- [ ] E2E tests — Ledger flow
- [ ] E2E tests — Cross-tenant isolation

### H.4 — Observability

- [ ] Structured logging (JSON)
- [ ] Request correlation IDs
- [ ] Slow query alerts
- [ ] Health check endpoint (DB + Redis)
- [ ] Error tracking (Sentry)

---

## Progress Summary

| Phase         | الوصف               | الحالة         | ملاحظات                                                       |
| ------------- | ------------------- | -------------- | ------------------------------------------------------------- |
| **Phase 0**   | Foundation Setup    | ✅ Done        | 2026-02-21                                                    |
| **Phase A**   | Auth Module         | ✅ Done        | 2026-02-21 — 7 endpoints + self-registration                  |
| **Phase B**   | Platform Module     | ✅ Done        | 2026-02-21 — 10 endpoints (companies + plans + subscriptions) |
| **Phase C**   | Users Module        | ✅ Done        | 2026-02-21 — 7 endpoints + JSON permissions (scalable RBAC)   |
| **Phase D**   | Customers Module    | ✅ Done        | 2026-02-22 — 5 endpoints + balance init + optimistic locking  |
| **Phase D+**  | Suppliers Module    | ⬜ Not Started |                                                               |
| **Phase D++** | Employees Module    | ⬜ Not Started |                                                               |
| **Phase E**   | Ledger Engine       | ⬜ Not Started |                                                               |
| **Phase F**   | Reports Module      | ⬜ Not Started |                                                               |
| **Phase G**   | Audit Module        | ⬜ Not Started |                                                               |
| **Phase H**   | Hardening & Quality | ⬜ Not Started |                                                               |

### Status Legend

- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- 🔴 Blocked

---

## Build Order (Lowest Risk → Fastest MVP)

```
1.  Phase 0   → Foundation + DB migration           (يوم 1)
2.  Phase A   → Auth (login, JWT, refresh)           (يوم 2-3)
3.  Phase B   → Platform (companies + plans)         (يوم 4-5)
4.  Phase C   → Users & Staff                        (يوم 6-7)
5.  Phase D   → Customers + Balances                 (أسبوع 2)
6.  Phase E   → Ledger Engine + Statement            (أسبوع 2-3)
7.  Phase D+  → Suppliers (same pattern)             (أسبوع 3)
8.  Phase D++ → Employees (same pattern)             (أسبوع 3)
9.  Phase F   → Reports                              (أسبوع 3-4)
10. Phase G   → Audit                                (أسبوع 4)
11. Phase H   → Hardening + Tests                    (مستمر)
```

---

## Definition of Done (MVP)

- [x] أي شركة تقدر تسجل وتجرب مجاناً 14 يوم (self-registration)
- [ ] Super Admin يقدر:
  - إنشاء شركة + owner
  - إنشاء خطة اشتراك
  - تفعيل / إيقاف اشتراك
- [ ] Owner يقدر:
  - إضافة staff + تحديد صلاحيات
  - إدارة عملاء / موردين / موظفين
  - إنشاء حركات مالية
  - عرض كشف حساب مع running balance
  - عرض ملخص + تقرير متأخرات
- [ ] Staff يقدر يعمل بس اللي الـ flags تسمح بيه
- [ ] عمليات الـ Ledger consistent و atomic و audited
- [ ] لا يوجد تسريب بيانات بين الشركات (companyId enforced)
- [ ] كل الـ APIs documented في Swagger
- [ ] كل الرسائل مترجمة (عربي + إنجليزي)
