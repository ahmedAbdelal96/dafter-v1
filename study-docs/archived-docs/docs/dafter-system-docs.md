# حساباتك – Product Documentation (NestJS Architecture)

---

# 1. Overview

**حساباتك** هو نظام SaaS لإدارة الحسابات التجارية مبني باستخدام:

- Backend: NestJS
- Database: PostgreSQL + Prisma
- Frontend: React Native (Expo)

النظام يركز على:

- إدارة العملاء
- إدارة الموردين
- إدارة حسابات الموظفين (كطرف حسابي)
- تسجيل الحركات المالية (كاش / آجل)
- تتبع الأرصدة لحظيًا
- إدارة المستخدمين بصلاحيات بسيطة
- إدارة الاشتراكات من خلال Super Admin

النظام Multi-tenant:

- قاعدة بيانات واحدة
- كل شركة معزولة عبر `companyId`

---

# 2. System Architecture

React Native (Expo App)
↓
NestJS REST API
↓
Prisma ORM
↓
PostgreSQL

---

# 3. Core Concepts

## 3.1 Super Admin

هو مالك المنظومة بالكامل.

له صلاحية:

- إنشاء شركة جديدة
- إنشاء Admin User للشركة
- إدارة الاشتراكات
- تفعيل / إيقاف الشركات
- إدارة الخطط
- مراقبة النظام بالكامل

لا يوجد أكثر من Super Admin إلا بقرار منك.

---

## 3.2 Company

تمثل عميل SaaS.

كل شركة لها:

- بيانات خاصة بها
- مستخدمين خاصين بها
- اشتراك مرتبط بخطة

لا يمكن لأي شركة الوصول لبيانات شركة أخرى.

---

## 3.3 User

مستخدم داخل شركة.

أنواعه:

- Owner (Admin الشركة)
- Staff (موظف)

كل User ينتمي إلى Company واحدة فقط.

---

## 3.4 Party (طرف حسابي)

كيان له فلوس أو عليه فلوس.

أنواعه:

- Customer
- Supplier
- Employee

---

## 3.5 Ledger Entry

أي حركة مالية تسجل داخل جدول موحد للحركات.

---

# 4. Roles & Permissions System (Simple & Extendable)

## الهدف

نظام صلاحيات بسيط جدًا قابل للتوسع.

---

## Roles الأساسية

### 1️⃣ Owner

- كامل الصلاحيات داخل الشركة
- إدارة المستخدمين
- إدارة البيانات
- عرض التقارير

### 2️⃣ Staff

- صلاحيات محددة حسب الإعداد

---

## Permissions الأساسية (مبسطة)

بدل نظام معقد، هنستخدم مجموعات صلاحيات:

- manage_users
- manage_parties
- manage_ledger
- view_reports

كل Role يحتوي على مجموعة من هذه الصلاحيات.

مستقبلاً يمكن إضافة permissions دقيقة.

---

## Business Rules

1. Super Admin فقط ينشئ شركة.
2. عند إنشاء شركة:
   - يتم إنشاء Owner User تلقائيًا.
3. Owner يمكنه:
   - إنشاء مستخدمين
   - تعيين Role لهم
4. لا يمكن حذف آخر Owner داخل الشركة.
5. جميع العمليات تسجل في Audit Logs.

---

# 5. Module: Super Admin

## 5.1 Companies Management

Super Admin يمكنه:

- إنشاء شركة جديدة
- إنشاء Owner User
- تعطيل شركة
- عرض تفاصيل الشركة
- رؤية إحصائيات الاستخدام

---

## 5.2 Subscription Management

كل شركة لها Subscription.

### Plans تحتوي على:

- name
- price
- billingCycle (monthly / yearly)
- maxUsers
- maxCustomers
- maxSuppliers
- maxEmployees
- maxLedgerEntries

---

## Subscription Status

- Trial
- Active
- Expired
- Suspended
- Disabled

---

## Business Rules

1. لا يمكن للشركة استخدام النظام بدون Subscription.
2. عند انتهاء الاشتراك:
   - يمنع إنشاء بيانات جديدة.
3. Super Admin فقط يمكنه تفعيل الاشتراك.

---

# 6. Module: Companies (Tenant Layer)

## البيانات

- name
- phone
- address
- currency
- createdAt

## Business Rules

1. كل جدول داخل النظام يحتوي على companyId.
2. كل Query في Backend يتم حقنه بـ companyId من JWT.
3. لا يعتمد النظام على Frontend في العزل.

---

# 7. Module: Users

## البيانات

- id
- companyId
- name
- email
- password (hashed)
- role
- isActive

## Business Rules

1. User ينتمي لشركة واحدة فقط.
2. لا يمكن للمستخدم رؤية بيانات خارج شركته.
3. Owner يمكنه:
   - إنشاء Staff
   - تعديل Role
   - تعطيل مستخدم
4. لا يمكن حذف آخر Owner.

---

# 8. Module: Customers

## البيانات

- id
- companyId
- name
- phone
- address
- openingBalance
- creditLimit
- isActive

## العمليات

- إنشاء
- تعديل
- تعطيل
- عرض كشف حساب
- تسجيل تحصيل

## Business Rules

1. لا يمكن حذف عميل له حركات.
2. الرصيد = openingBalance + SUM(ledgerEntries).
3. لا يمكن تجاوز creditLimit بدون تحذير.

---

# 9. Module: Suppliers

نفس منطق العملاء لكن بعكس اتجاه الديون.

---

# 10. Module: Employees (Financial Accounts)

موظف يمكن أن يكون:

- User (يدخل النظام)
- Party (له حساب مالي)

يمكن أن يكون الاثنين معًا.

---

# 11. Module: Ledger Engine (Core)

## جدول ledger_entries

الحقول الأساسية:

- id
- companyId
- partyType
- partyId
- entryType
- signedAmount
- entryDate
- dueDate
- note
- createdBy
- createdAt
- isDeleted

---

## Ledger Rules

1. كل عملية Ledger تتم داخل Transaction واحدة.
2. عند إنشاء Ledger:
   - يتم تحديث balance.
   - يتم تسجيل audit log.
3. signedAmount:
   - موجب = زيادة مديونية
   - سالب = سداد

---

# 12. Module: Balances

## الهدف

تسريع قراءة الأرصدة.

## القاعدة

balance = openingBalance + SUM(signedAmount)

يتم تحديثه داخل Transaction عند كل عملية Ledger.

---

# 13. Module: Reports

- كشف حساب
- تقرير المتأخرات
- إجمالي العملاء
- إجمالي الموردين
- ملخص (ليك / عليك)

---

# 14. Security Architecture

- JWT Authentication
- Company Isolation via Middleware
- Prisma transactions لكل العمليات الحساسة
- Permission Guards في NestJS
- Password hashing باستخدام bcrypt
- Audit Logging لكل العمليات الحساسة

---

# 15. Non-Functional Requirements

## الأداء

- كل عمليات Ledger تتم خلال < 200ms
- Pagination إلزامي

## القابلية للتوسع

- إضافة Inventory مستقبلاً
- إضافة Multi-branch
- إضافة Web dashboard
- إضافة Payment Gateway

---

# 16. Future Roadmap

## Phase 2

- Inventory
- Branches
- WhatsApp Integration
- Salary cycles

## Phase 3

- Loyalty System
- Advanced Reports
- Cashflow forecasting
- Full ERP Expansion

---

# 17. Target Audience

- تجار الجملة
- صيدليات
- موزعين
- عيادات
- ورش
- أي نشاط يعمل بنظام آجل وكاش

---
