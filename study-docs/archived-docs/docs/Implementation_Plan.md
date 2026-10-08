# حساباتك — Implementation Plan (NestJS + PostgreSQL + Prisma + Expo)

هذه الخطة هي “خارطة طريق تنفيذ” من مستوى Senior Developer لبناء النظام بشكل منظم وقابل للتوسع والصيانة.

---

## 0) الهدف النهائي (Target Outcome)

- Backend (NestJS) جاهز Production:
  - Auth (JWT + Refresh)
  - Multi-tenant isolation (companyId)
  - Super Admin APIs (إنشاء شركة + Admin User + اشتراكات)
  - CRUD للأطراف (Customers / Suppliers / Employees)
  - Ledger Engine (دفتر أستاذ موحّد) بعمليات Atomic عبر Transactions
  - Balances لحظية
  - Statements بكشف حساب + Running Balance
  - Reports أساسية
  - Staff Management + صلاحيات بسيطة قابلة للتطوير
  - Audit Logs

- Mobile App (Expo):
  - Login + Session persistence
  - Dashboard
  - Modules: Customers / Suppliers / Employees
  - Add Transaction (Ledger Entry)
  - Statement screen
  - Reports
  - Staff Management (Owner فقط)

---

## 1) Architecture Overview

### 1.1 High-level

**React Native (Expo)** → **NestJS REST API** → **Prisma ORM** → **PostgreSQL**

- **Tenant isolation**: يعتمد على `companyId` في JWT ويتم فرضه في كل Service/Repository.
- **Ledger operations**: تتم داخل `prisma.$transaction()` لضمان الاتساق.
- **RBAC بسيط**: Owner/Staff + StaffPermission flags (قابل لتطويره لاحقًا إلى RBAC كامل).
- **Subscription enforcement**: Guard/Interceptor يمنع أي عمليات كتابة إذا الاشتراك منتهي أو تجاوز limits.

### 1.2 Backend folder structure (Recommended)

- `src/modules/auth`
- `src/modules/superadmin`
- `src/modules/companies`
- `src/modules/users`
- `src/modules/parties`
  - `customers`
  - `suppliers`
  - `employees`
- `src/modules/ledger`
- `src/modules/reports`
- `src/modules/audit`
- `src/common`
  - `guards`
  - `decorators`
  - `interceptors`
  - `filters`
  - `pipes`
  - `utils`
- `src/prisma`
  - `prisma.service.ts`
  - `prisma.middleware.ts` (اختياري)
  - `prisma.extensions.ts` (اختياري)

### 1.3 Mobile folder structure (Recommended)

- `src/api` (API client + auth header + error handling)
- `src/auth` (login/session)
- `src/navigation` (stacks/tabs)
- `src/screens`
  - `dashboard`
  - `customers`
  - `suppliers`
  - `employees`
  - `ledger`
  - `reports`
  - `settings`
  - `staff`
- `src/components` (Reusable UI)
- `src/state` (Zustand أو Redux Toolkit)
- `src/utils` (validation/date/format)

---

## 2) Key Data Structures & Algorithms

### 2.1 Multi-tenant model

- كل كيان tenant-owned يحتوي `companyId`
- JWT payload يحتوي:
  - `sub` = userId
  - `companyId`
  - `role` (OWNER/STAFF/SUPER_ADMIN)

**Tenant Enforcement Algorithm**

1. `JwtAuthGuard` يتحقق من صحة التوكن.
2. `TenantGuard`:
   - لو user.role != SUPER_ADMIN → لازم companyId موجود.
3. كل Service تستخدم `companyId` من `req.user.companyId` في كل queries.

> قاعدة ذهبية: لا يوجد Query بدون companyId في where clause.

---

### 2.2 Ledger engine (Unified)

- `LedgerEntry`:
  - `partyType + partyId`
  - `signedAmount` (+/-)
  - `entryDate` و `dueDate`
- `Balance`:
  - `(companyId, partyType, partyId)` PK
  - `balance` = openingBalance + SUM(signedAmount)

**Create Ledger Entry (Atomic Transaction)**
داخل `prisma.$transaction`:

1. تحقق من الاشتراك active/trial وغير منتهي.
2. تحقق من صلاحية المستخدم (Owner أو staff.manageLedger).
3. تحقق من وجود الطرف (party) داخل نفس companyId.
4. Insert ledger entry.
5. Update balance: `balance += signedAmount` (upsert).
6. Insert audit log.
7. Commit.

**Delete Ledger Entry (Atomic Soft Delete)**
داخل `prisma.$transaction`:

1. permission check (manageLedger).
2. Find entry (company scoped) + ensure not deleted.
3. Soft delete `isDeleted=true`.
4. Reverse balance: `balance -= signedAmount`.
5. Audit log.

---

### 2.3 Party creation & opening balance

عند إنشاء Customer/Supplier/Employee:

- داخل Transaction:
  - create party
  - create balance row = openingBalance
  - audit log

---

### 2.4 Statements + Running Balance

أفضل حل للأداء:

- Prisma `$queryRaw` باستخدام window function:
  - `openingBalance + SUM(signedAmount) OVER (ORDER BY entryDate, createdAt)`

هذا يجعل كشف الحساب “زي البنك”.

---

### 2.5 Subscription enforcement

- يتم تنفيذها في Backend (لا تعتمد على mobile).

**Enforcement Strategy**

- Guard/Interceptor على كل write routes:
  - get latest subscription
  - verify status in (TRIAL, ACTIVE)
  - verify endDate >= today
  - enforce plan limits (counts) حسب العملية:
    - customers.create
    - suppliers.create
    - employees.create
    - users.create
    - ledger.create

> في المستقبل: يمكن إضافة `CompanyUsage` لتجنب count(\*) المتكرر.

---

## 3) Backend Implementation Plan (NestJS)

### Phase A — Foundation (Day 1–3) ✅ COMPLETED

**A1) Setup** ✅

- ✅ Repo init
- ✅ ESLint + Prettier
- ✅ ConfigModule + env validation
- ✅ PostgreSQL (localhost:5432/daftar_db)
- ✅ Prisma init + migrate (`init_daftar_schema`)

**A2) Infrastructure** ✅

- ✅ PrismaService (with connection logging)
- ✅ Global Exception Filter (موحد في شكل الرد)
- ✅ Logging (built-in LoggerService)
- ✅ Tenant middleware
- ✅ CacheModule (Redis-based)
- ✅ i18n (ar + en)
- ✅ Common types, guards, decorators, interceptors

**Deliverables** ✅

- ✅ Server runs on port 9000
- ✅ DB migrations stable
- ✅ Health endpoint: `GET /api/v1/health`
- ✅ Swagger docs: `GET /api/docs`

---

### Phase B — Auth & Tenant (Day 4–7) ✅ COMPLETED

**B1) Auth** ✅

- ✅ **Self-Registration** (POST `/auth/register`) — شركة جديدة + Owner + اشتراك تجريبي مجاني (14 يوم)
- ✅ Login (POST `/auth/login`) — مع account lockout (5 محاولات → 15 دقيقة حظر عبر Redis)
- ✅ Refresh token rotation (POST `/auth/refresh`) — مع كشف سرقة التوكن
- ✅ Logout (POST `/auth/logout`) — إلغاء refresh token واحد
- ✅ Logout All (POST `/auth/logout-all`) — إلغاء كل الجلسات
- ✅ Change Password (POST `/auth/change-password`) — مع إلغاء كل الجلسات تلقائياً
- ✅ Get Profile (GET `/auth/me`) — بيانات المستخدم + الشركة + الصلاحيات
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ JWT Access Token (15 min) + Refresh Token (SHA-256 hashed in DB)
- ✅ Rate limiting via @Throttle per endpoint

**B1.1) Self-Registration Business Rules** (جديد)

- الشركة تسجل نفسها وتحصل على فترة تجريبية مجانية (TRIAL_DAYS=14)
- المسجِّل يصبح Owner/Admin للشركة
- يتم إنشاء خطة FREE_TRIAL تلقائياً مع حدود:
  - 3 مستخدمين، 50 عميل، 20 مورد، 10 موظف، 500 قيد
- كل العمليات atomic داخل `prisma.$transaction()`
- التسجيل مقيد بـ 5 طلبات/دقيقة

**B2) Guards** ✅

- ✅ `JwtAuthGuard` (passport-jwt strategy)
- ✅ `TenantGuard` (from Phase A common)
- ✅ `RolesGuard` (from Phase A common)
- ✅ `PermissionsGuard` (StaffPermission flags, from Phase A common)

**Architecture Pattern:**

```
Controller → Service → Use Cases → Repository → Prisma
```

- كل use case في ملف منفصل (Single Responsibility)
- Swagger decorators في ملف منفصل
- Token Service مركزي لإدارة JWT + Refresh Tokens

**Deliverables** ✅

- ✅ Auth working end-to-end (7 endpoints)
- ✅ req.user contains { userId, companyId, role, permissionsFlags }
- ✅ Full Swagger documentation for all endpoints

---

### Phase C — Super Admin Core (Week 2)

**C1) SuperAdmin endpoints**

- Create company + create owner user (single transaction)
- Create plan
- Activate subscription / suspend / extend
- List companies + status + usage metrics

**Business Rules**

- super admin can create companies + assign plans
- ✅ companies CAN self-register with FREE_TRIAL plan (14 days trial)
- الترقية للخطط المدفوعة عبر Super Admin

**Deliverables**

- APIs جاهزة (حتى بدون UI)

---

### Phase D — Parties CRUD (Week 2–3) ✅ Done

**D1) Customers** ✅ Done

- Create/list/update/disable/soft-delete
- On create: init balance = openingBalance
- 5 endpoints + balance init + optimistic locking

**D2) Suppliers** ✅ Done

- نفس pattern — 5 endpoints + balance init + optimistic locking
- No creditLimit (unlike Customers)
- Plan limit: maxSuppliers

**D3) Employees** ✅ Done

- نفس pattern — 5 endpoints + balance init + optimistic locking
- No creditLimit — حقل خاص: `jobTitle?`
- PartyType: EMPLOYEE، Plan limit: maxEmployees

**Deliverables**

- Customers ✅, Suppliers ✅, Employees ✅
- Pagination + search ✅

---

### Phase E — Ledger Engine (Week 3) ✅ DONE

**E1) Ledger endpoints**

- POST `/ledger` (create) ✅
- DELETE `/ledger/:id` (soft delete + balance reversal) ✅
- GET `/ledger/statement` (running balance per row) ✅

**E2) Validation & consistency**

- All ledger writes inside `$transaction` (atomic) ✅
- Prevent zero amount (`@NotEquals(0)` + use-case guard) ✅
- `dueDate >= entryDate` rule enforced ✅
- Audit logging for create + delete ✅
- Balance updates via DB-level `increment`/`decrement` — no JS float arithmetic ✅
- Running balance uses `Prisma.Decimal` — arbitrary precision, no rounding error ✅
- Party validation directly in repository (no circular imports) ✅

**Deliverables**

- Core accounting works reliably ✅
- 10 files created: repository, 3 use-cases, service, swagger, controller, module, 2 DTOs ✅

---

### Phase F — Reports (Week 4)

**Reports**

- Summary:
  - total customer balances
  - total supplier balances
  - total employee balances
- Overdue:
  - dueDate < today and entries still unpaid (حسب تعريفك)
- Export later (PDF)

**Deliverables**

- Dashboard-ready APIs

---

### Phase G — Staff management (Week 4–5)

**Owner features**

- Create staff user
- Update permissions flags
- Disable staff

**Deliverables**

- Team usage ready داخل الشركة

---

### Phase H — Hardening (Ongoing)

- Pagination on all list endpoints
- Rate limiting
- Input validation everywhere (DTOs)
- Integration tests (ledger transaction tests)
- Security reviews (token rotation, password policies)
- Observability (logs, metrics)

---

## 4) Mobile App Implementation Plan (Expo)

### Phase M1 — Foundation (Day 1–2)

- Expo init
- Navigation
- API client wrapper
- Secure token storage (expo-secure-store)
- Session restore

**Deliverables**

- Login + logout + persistent session

---

### Phase M2 — Core UX (Week 2)

**Screens**

- Dashboard
- Customers list + search
- Customer details:
  - balance
  - recent entries
  - statement
- Add transaction form

**UX Rules**

- Add Transaction in minimal taps
- Default dates, quick presets

**Deliverables**

- Customers + ledger end-to-end

---

### Phase M3 — Suppliers & Employees (Week 3)

- Same flows as customers
- Module-based tabs

**Deliverables**

- 3 party modules complete

---

### Phase M4 — Reports (Week 4)

- Summary cards
- Overdue list
- Filters (date)

**Deliverables**

- Reports usable by owner

---

### Phase M5 — Staff Management (Week 4–5)

- Owner adds staff
- Toggle permission flags
- Disable staff

**Deliverables**

- Company can operate with multiple users

---

## 5) API Endpoint Map (MVP)

### Auth ✅

- ✅ POST `/auth/register` (self-registration with trial)
- ✅ POST `/auth/login` (with lockout protection)
- ✅ POST `/auth/refresh` (token rotation + theft detection)
- ✅ POST `/auth/logout` (single device)
- ✅ POST `/auth/logout-all` (all devices)
- ✅ POST `/auth/change-password` (with session invalidation)
- ✅ GET `/auth/me` (profile + company + permissions)

### SuperAdmin (only SUPER_ADMIN)

- POST `/superadmin/companies` (create company + owner)
- GET `/superadmin/companies`
- POST `/superadmin/plans`
- GET `/superadmin/plans`
- POST `/superadmin/subscriptions/activate`
- POST `/superadmin/subscriptions/suspend`

### Users (Owner)

- POST `/users/staff`
- PATCH `/users/:id/permissions`
- PATCH `/users/:id/disable`

### Parties

- CRUD `/customers`
- CRUD `/suppliers`
- CRUD `/employees`

### Ledger

- POST `/ledger`
- DELETE `/ledger/:id`
- GET `/ledger/statement?partyType=&partyId=&from=&to=&limit=&offset=`

### Reports

- GET `/reports/summary`
- GET `/reports/overdue`

---

## 6) Performance & Scalability Notes

### Database

- Ensure indexes (from schema.prisma migrations):
  - ledger: `(companyId, partyType, partyId, entryDate)`
  - due: `(companyId, dueDate)`
  - list: `(companyId, createdAt)`
- Avoid N+1 patterns; use includes carefully.
- Prefer SQL window function for statements.

### API

- Use transactions for ledger and party creation
- Validation at DTO layer
- Clean error model to reduce debugging time

### Mobile

- Pagination always
- Don’t load huge statements by default
- Add “Load more” and date filters

---

## 7) Recommended Build Order (Lowest risk → fastest MVP)

1. Backend foundation + Prisma migrations
2. SuperAdmin create company + create owner
3. Auth + tenant enforcement
4. Customers + balances init
5. Ledger create/delete + statement
6. Dashboard summary
7. Staff management + permissions flags
8. Suppliers/Employees
9. Reports + overdue
10. Hardening + logging + tests

---

## 8) Definition of Done (MVP)

- Any company can:
  - self-register and get 14-day free trial ✅
- Super Admin can:
  - create company + owner
  - activate/upgrade subscription
- Owner can:
  - add staff + set permission flags
  - manage customers/suppliers/employees
  - create ledger entries
  - view statements with running balance
  - view summary + overdue reports
- Staff can do only what flags allow.
- Ledger operations are consistent and audited.
- No cross-company data leakage (companyId enforced everywhere).

---
