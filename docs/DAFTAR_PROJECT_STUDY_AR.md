# دراسة مشروع Daftar

تاريخ إعداد الملف: 2026-03-12

## 1. ما هو المشروع؟

`Daftar` هو نظام SaaS متعدد الشركات لإدارة الحسابات والتشغيل المالي للشركات الصغيرة والمتوسطة.

الفكرة الأساسية:
- كل شركة تملك مساحة عمل مستقلة داخل نفس المنصة.
- المنصة تقدم لوحة تحكم تشغيلية للشركة نفسها.
- يوجد مستوى أعلى لإدارة المنصة بالكامل عبر `Super Admin`.
- يوجد تطبيق موبايل مخصص للمهام اليومية السريعة أثناء الحركة.

المشروع الحالي يتكون من 3 تطبيقات رئيسية:
- `dafter-api-v1`: الباك إند المركزي.
- `dafter-dashboard`: لوحة التحكم الويب.
- `dafter-dashboard-mobile`: تطبيق الموبايل.

## 2. المشروع موجّه لمين؟

الجمهور الأساسي:
- أصحاب الشركات الصغيرة والمتوسطة.
- مدراء التشغيل أو الحسابات داخل الشركة.
- الموظفون الذين يحتاجون صلاحيات تشغيل محددة.

الجمهور الداخلي للمنصة:
- `SUPER_ADMIN` لإدارة الشركات والعملاء والخطط والاشتراكات وسجلات الحوكمة.

نوع الشركات المستهدفة من الكود الحالي:
- نظام عام للشركات وليس مخصصًا لنشاط واحد فقط.
- الكيانات الأساسية في الداتا موديل تشير إلى شركات لديها عملاء وموردون وموظفون ودفتر حسابات وفواتير ومبيعات آجلة وتقسيط ومصروفات ومنتجات.

ملاحظة مهمة:
- توجد بعض ملفات توثيق قديمة داخل `dafter-dashboard` تتحدث عن صالونات وحجوزات.
- هذا لا يطابق الكود الحالي ولا قاعدة البيانات الحالية.
- المرجع الصحيح الآن هو الكود الفعلي في `dafter-api-v1` + الموديولات المنفذة في الويب والموبايل.

## 3. القيمة التي يقدمها المشروع

المنتج يحل للشركة هذه المشاكل:
- متابعة الذمم المدينة والدائنة.
- إدارة العملاء والموردين والموظفين.
- تسجيل قيود الدفتر والحركة المالية.
- إدارة الفواتير.
- إدارة البيع الآجل.
- إدارة البيع بالتقسيط وجداول السداد.
- تحليل المصروفات والتقارير.
- إدارة المستخدمين الداخليين والصلاحيات.
- ربط كل ذلك بخطة اشتراك وحدود استخدام لكل شركة.

## 4. المعمارية العامة

### 4.1 الباك إند

المشروع `dafter-api-v1` مبني على:
- `NestJS`
- `Prisma`
- `PostgreSQL`
- `Redis`
- `Bull`
- `JWT`
- `Swagger`

خصائص معمارية مهمة:
- Multi-tenant داخل قاعدة بيانات واحدة.
- كل البيانات التابعة لشركة مربوطة بـ `companyId`.
- العزل بين الشركات يتم على مستوى الخدمات والـ guards وليس عبر RLS.
- يوجد دعم i18n عربي/إنجليزي.
- يوجد Push Notifications عبر Expo.
- يوجد Logging و Sentry و Rate Limiting.

### 4.2 الويب

المشروع `dafter-dashboard` مبني على:
- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `React Query`
- `next-intl`
- `Zustand`

خصائصه:
- لوحة تشغيل للشركة.
- لوحة Super Admin لإدارة المنصة.
- يعتمد على API Services و Hooks منظمة لكل موديول.
- يوجد Feature-driven UI واضح في `src/features`.

### 4.3 الموبايل

المشروع `dafter-dashboard-mobile` مبني على:
- `Expo 54`
- `React Native 0.81`
- `Expo Router`
- `React Query`
- `Zustand`
- `i18next`

خصائصه:
- مصمم كنسخة تشغيلية سريعة للمستخدم اليومي.
- يدعم العربية أولًا و RTL.
- يفصل بين مساحة `client` ومساحة `platform` للسوبر أدمن.
- يستخدم Secure Store للتوكنات بدل الكوكيز.

## 5. التطبيقات الثلاثة ووظيفة كل واحد

### 5.1 `dafter-api-v1`

هو قلب النظام، ومسؤول عن:
- المصادقة والجلسات.
- إدارة الشركات والخطط والاشتراكات.
- فرض الصلاحيات وحدود الخطط.
- العمليات المحاسبية الأساسية.
- التقارير ولوحات المتابعة.
- الإشعارات.

الموديولات الموجودة فعليًا:
- `auth`
- `platform`
- `platform-dashboard`
- `platform-audit`
- `entitlements`
- `users`
- `customers`
- `suppliers`
- `employees`
- `ledger`
- `expenses`
- `products`
- `invoices`
- `deferred-sales`
- `installments`
- `reports`
- `dashboard`
- `notifications`

### 5.2 `dafter-dashboard`

هو واجهة الويب الرئيسية، ويغطي حاليًا:
- Dashboard للشركة.
- Customers
- Suppliers
- Employees
- Products
- Invoices
- Deferred Sales
- Installments
- Expenses
- Ledger
- Reports
- Notifications
- Users
- Settings
- Super Admin Dashboard
- Tenants / Companies
- Subscriptions
- Plans
- Platform Users
- Audit Logs
- Platform Settings

### 5.3 `dafter-dashboard-mobile`

هو تطبيق تشغيل يومي للموبايل، ويغطي حاليًا:
- Auth
- Shell / Navigation
- Customers
- Suppliers
- Employees
- Ledger
- Expenses
- Products
- Invoices

وموجود له أساس أو مسارات جاهزة أيضًا لـ:
- Dashboard
- Deferred Sales
- Installments
- Reports
- Notifications
- Profile / Settings
- Users
- Platform area for Super Admin

## 6. نموذج المستخدمين والصلاحيات

الأدوار الأساسية في الباك إند:
- `SUPER_ADMIN`
- `OWNER`
- `STAFF`

في الويب توجد أيضًا بعض المسميات القديمة في ملفات route access مثل:
- `ACCOUNTANT`
- `RECEPTION`

لكن نموذج البيانات الفعلي الحالي في قاعدة البيانات يعتمد أساسًا على:
- `SUPER_ADMIN`
- `OWNER`
- `STAFF`

آلية التحكم في الوصول مبنية على 3 طبقات:
- حالة الاشتراك.
- صلاحيات الخطة والميزات `Plan Entitlements`.
- صلاحيات المستخدم داخل الشركة `StaffPermission`.

المعادلة الفعلية:

`Effective Access = Subscription Status AND Plan Entitlements AND User Permissions`

صلاحيات الموظف داخل الشركة مخزنة كـ JSON flags، مثل:
- `manageUsers`
- `viewParties`
- `manageParties`
- `viewLedger`
- `manageLedger`
- `viewReports`

## 7. نظام الاشتراكات والخطط

### 7.1 الكيانات الأساسية

نظام الاشتراكات في قاعدة البيانات مبني على:
- `Plan`
- `CompanySubscription`
- `SubscriptionPayment`

### 7.2 حالات الاشتراك

الحالات الموجودة:
- `TRIAL`
- `ACTIVE`
- `EXPIRED`
- `SUSPENDED`
- `DISABLED`

مهم:
- الوصول الفعلي للميزات يعتمد فقط على الاشتراكات ذات الحالة `ACTIVE` أو `TRIAL`.
- `SUSPENDED` تعتبر اشتراكًا حيًا في بعض منطق الحوكمة، لكنها ليست entitled داخل خدمة الـ entitlements.

### 7.3 دورة الاشتراك

السوبر أدمن يستطيع من الـ API:
- إنشاء خطة.
- تعديل خطة.
- تفعيل اشتراك.
- تعليق اشتراك.
- تمديد اشتراك.
- تعطيل شركة أو إعادة تفعيلها.

### 7.4 حدود الخطة Quotas

الخطة تدعم حدودًا كمية على:
- عدد المستخدمين `maxUsers`
- عدد العملاء `maxCustomers`
- عدد الموردين `maxSuppliers`
- عدد الموظفين `maxEmployees`
- عدد قيود الدفتر `maxLedgerEntries`

دلالة `null`:
- تعني غير محدود.

### 7.5 ميزات الخطة Feature Catalog

يوجد كتالوج رسمي للميزات داخل:
- `dafter-api-v1/src/common/entitlements/feature-catalog.ts`

أمثلة على المفاتيح:
- `module.dashboard.read`
- `module.customers.read`
- `module.customers.manage`
- `module.ledger.read`
- `module.ledger.manage`
- `module.invoices.read`
- `module.invoices.manage`
- `module.installments.read`
- `module.installments.manage`
- `module.reports.export`

### 7.6 مستويات الخطط المرجعية

من الكود الحالي توجد 3 حزم مرجعية:

`Basic`
- Dashboard
- Customers
- Suppliers
- Ledger

`Pro`
- كل ما في Basic
- Employees
- Expenses
- Products
- Invoices
- Deferred Sales
- Reports read

`Enterprise`
- كل ما في Pro
- Installments
- Reports export

### 7.7 الخطة المزروعة في Seed حاليًا

الـ seed الحالي ينشئ خطة واحدة باسم:
- `Daftar Professional`

خصائصها:
- Billing cycle: `MONTHLY`
- Price: `299 EGP`
- Features: مجموعة `DEFAULT_ENTERPRISE_FEATURES`
- Limits:
- `maxUsers = 25`
- `maxCustomers = 4000`
- `maxSuppliers = 2000`
- `maxEmployees = 1000`
- `maxLedgerEntries = 750000`

هذا يعني أن بيئة البيانات التجريبية الحالية تعمل عمليًا بخطة عالية الصلاحيات.

## 8. الموديولات الوظيفية الأساسية

### 8.1 إدارة الأطراف

يشمل:
- Customers
- Suppliers
- Employees

لكل طرف:
- بيانات تعريفية
- Opening Balance
- حالة تفعيل
- حذف منطقي

### 8.2 Ledger

هذا هو قلب المحاسبة في النظام.

وظيفته:
- إنشاء قيود مالية على الأطراف.
- استخراج Statement مع Running Balance.
- حفظ Balance الحالية لكل طرف.

أنواع القيود:
- `INVOICE`
- `PAYMENT`
- `RETURN`
- `ADJUSTMENT`
- `ADVANCE`
- `SALARY_PAYMENT`
- `DEDUCTION`
- `SETTLEMENT`

### 8.3 Expenses

إدارة المصروفات مع تصنيفها حسب:
- إيجار
- رواتب
- مرافق
- مستلزمات
- نقل
- صيانة
- تسويق
- ضرائب
- أخرى

### 8.4 Products

كتالوج منتجات/خدمات للشركة.

يدعم:
- اسم
- SKU
- Category
- Unit
- Unit Price
- Active / Inactive

### 8.5 Invoices

الفواتير تدعم:
- Snapshot لبيانات الطرف وقت إنشاء الفاتورة.
- Line Items.
- ضرائب.
- رقم فاتورة فريد لكل شركة.
- إنشاء يدوي.
- إنشاء من Deferred Sale.

### 8.6 Deferred Sales

البيع الآجل يدعم:
- تسجيل دين على العميل.
- تاريخ استحقاق.
- دفعات جزئية.
- حالات:
- `PENDING`
- `PARTIAL`
- `PAID`
- `OVERDUE`

### 8.7 Installments

التقسيط يدعم:
- Contract Header
- Schedule Rows
- Payments
- أنواع جدول:
- `FIXED`
- `CUSTOM`

الحالات:
- `ACTIVE`
- `COMPLETED`
- `CANCELLED`
- `DEFAULTED`

### 8.8 Reports

يوجد في الباك إند والويب تقارير تشمل:
- Summary
- Cash Flow
- Profit & Loss
- Debts Summary
- Expenses Analytics
- Customer Aging
- Supplier Aging
- Overdue
- Collection Schedule
- Collections Follow-up
- Product Performance
- Operational Performance
- Critical Alerts
- Staff Activity
- Ledger Reports

### 8.9 Notifications

النظام يدعم:
- Device tokens
- Push notifications عبر Expo
- In-app notifications
- unread count
- mark read / mark all read

### 8.10 Platform / Super Admin

يشمل:
- إدارة الشركات
- إدارة الخطط
- إدارة الاشتراكات
- إدارة مستخدمي الشركات من مستوى المنصة
- Platform Dashboard
- Audit Logs
- Platform Settings
- Feature Flags

## 9. أين وصل المشروع الآن؟

## 9.1 حالة الباك إند

الباك إند متقدم ومتكامل نسبيًا.

الواضح من الكود:
- الهيكل الأساسي مستقر.
- الموديولات الرئيسية موجودة.
- يوجد فصل Use Cases / Repositories / Services في أغلب الموديولات.
- يوجد Swagger و DTOs و i18n.
- يوجد Entitlement System فعلي وليس مجرد تخطيط.
- يوجد Platform Governance و Audit Logs.

الخلاصة:
- الباك إند في مرحلة متقدمة جدًا وقابل لدعم الويب والموبايل فعليًا.

## 9.2 حالة الويب

الويب أيضًا متقدم جدًا.

الواضح من الكود:
- معظم صفحات الشركة موجودة.
- معظم صفحات Super Admin موجودة.
- يوجد ربط API وخدمات وhooks ومكونات feature-based.
- يوجد توثيق إغلاق Sprint 4 و Sprint 5 للسوبر أدمن، ما يؤكد أن أجزاء المنصة دخلت مرحلة تشغيل فعلية.

أبرز ما تم إنجازه مؤخرًا في السوبر أدمن:
- Audit logs كاملة.
- فلاتر حوكمة متقدمة.
- إدارة الشركات: تعديل وتفعيل وتعطيل.
- إدارة الخطط والاشتراكات.

الخلاصة:
- لوحة الويب هي الواجهة الأكثر اكتمالًا حاليًا.

## 9.3 حالة الموبايل

الموبايل ليس مجرد بداية، بل وصل لمرحلة جيدة جدًا في جزء التشغيل اليومي.

بحسب `MOBILE_PARITY_MATRIX.md`:
- Complete:
- Foundation / Auth / Shell
- Customers
- Suppliers
- Employees
- Ledger
- Expenses
- Products
- Invoices

- Partial:
- Dashboard
- Settings / Profile

- Placeholder:
- Deferred Sales
- Installments
- Reports
- Notifications
- Users

إذًا:
- الموبايل صالح بالفعل لتشغيل عدد مهم من الموديولات الأساسية.
- لكنه لم يصل بعد إلى parity كامل مع الويب.

## 10. ما الذي يقرأه شخص جديد عن المشروع ويفهمه فورًا؟

إذا دخل مطور جديد على المشروع، فالصورة الصحيحة هي:

- أنت تعمل على منصة SaaS محاسبية متعددة الشركات.
- الباك إند هو المصدر المركزي للحقيقة.
- الويب هو الواجهة الأكثر اكتمالًا الآن.
- الموبايل يركز على workflow الاستخدام اليومي السريع، وهو متقدم لكنه لم يكتمل بعد.
- يوجد نظام اشتراكات حقيقي مع حدود وfeature gating.
- يوجد فصل واضح بين:
- إدارة الشركة نفسها
- إدارة المنصة من قبل السوبر أدمن

## 11. الفجوات والملاحظات المهمة

### 11.1 عدم اتساق قديم في التوثيق

بعض ملفات التوثيق القديمة في `dafter-dashboard` ما زالت تشير إلى:
- salons
- bookings
- clients portal

بينما الكود الحالي الفعلي مبني على:
- accounting
- ledger
- invoices
- deferred sales
- installments

هذا يعني:
- المنتج غيّر اتجاهه أو أعيد توظيفه.
- يجب عدم الاعتماد على هذه الملفات القديمة كمرجع عمل.

### 11.2 اختلاف جزئي في تعريف الأدوار بين الطبقات

بعض ملفات الويب ما زالت تستخدم مسميات إضافية مثل:
- `ACCOUNTANT`
- `RECEPTION`

بينما Prisma schema الحالية تعتمد:
- `OWNER`
- `STAFF`
- `SUPER_ADMIN`

وهذا يحتاج ضبط نهائي لاحقًا حتى لا يحدث تضارب بين الواجهة والباك إند.

### 11.3 الموبايل ما زال ناقصًا في الموديولات المتقدمة

أهم ما لم يكتمل بعد على الموبايل:
- Deferred Sales
- Installments
- Reports
- Notifications
- Users

## 12. ما الذي تم إنجازه مقارنة بما هو متبقٍ؟

### المنجز فعليًا

- بنية multi-tenant واضحة.
- Auth + refresh token + sessions.
- RBAC + staff permissions.
- Subscription governance.
- Entitlements + feature catalog + quotas.
- إدارة الشركات والخطط والاشتراكات من السوبر أدمن.
- CRUD وتشغيل فعلي لمعظم الموديولات الأساسية في الباك إند والويب.
- parity جيد جدًا للموديولات الأساسية على الموبايل.

### المتبقي أو الذي يحتاج تثبيت نهائي

- تنظيف التوثيق القديم.
- توحيد تعريف الأدوار بين الويب والباك إند.
- استكمال parity الموبايل مع الويب.
- استكمال بعض واجهات الإعدادات والـ profile على الموبايل.
- مواصلة hardening واختبارات القبول end-to-end.

## 13. الخلاصة التنفيذية

`Daftar` الآن هو مشروع منصة محاسبية SaaS متعددة الشركات، وليس مجرد Dashboard منفصل.

الوضع الحالي باختصار:
- `API` متقدم جدًا ويحتوي منطق المنتج الأساسي كاملًا تقريبًا.
- `Web Dashboard` هو الواجهة الأكثر نضجًا وتشمل الشركة + السوبر أدمن.
- `Mobile Dashboard` قطع شوطًا مهمًا في الموديولات اليومية، لكنه لم يكتمل بعد في الموديولات المتقدمة.
- نظام الاشتراكات والخطط موجود فعليًا ويؤثر على الوصول والحدود، وليس مجرد UI.

إذا أردت وصفًا مختصرًا جدًا للمشروع:

`Daftar = منصة لإدارة الحسابات والتشغيل المالي للشركات، مع لوحة شركة + لوحة Super Admin + تطبيق موبايل، ونظام خطط واشتراكات وصلاحيات قابل للتوسع.`

## 14. تحديث مارس 2026 (بعد إغلاق P0)

تاريخ التحديث: 2026-03-17

هذا التحديث يوثق ما تم تنفيذه فعليًا في مرحلة `P0 Closeout` بدون توسيع نطاق إلى P1/P2.

### 14.1 ما تم إغلاقه في الباك إند

- تم تثبيت قاعدة `اشتراك حي واحد فقط لكل شركة` على مستوى قاعدة البيانات:
  - Self-heal للبيانات القديمة (deterministic ranking).
  - Partial unique index على الحالات الحية (`ACTIVE`, `TRIAL`, `SUSPENDED`).
  - Constraint زمني: `endDate > startDate`.
- تم تثبيت سياسة `archival-first`:
  - الحذف النهائي `hard delete` محجوب افتراضيًا.
  - محجوب إجباريًا في بيئة `production`.
  - `archive/restore` هما المسار التشغيلي الأساسي.
  - مسار `DELETE` بقي موجودًا لكنه policy-gated مع logging لمحاولات الحذف المحجوبة.
- تم تنفيذ idempotency رسميًا لعمليات دورة حياة الاشتراك:
  - `activate`, `suspend`, `extend`, `change-plan`.
  - key scope النهائي: `(companyId, operationType, idempotencyKey)`.
  - دعم replay / hash mismatch / in-progress conflict.
  - دعم `accept mode` مع `strict mode` عبر feature flag.
- تم تنفيذ `change-plan` بنمط `IMMEDIATE only`:
  - بدون `NEXT_CYCLE`.
  - بدون scheduling table.
  - بدون proration logic.
  - يتم إنهاء الاشتراك الحالي إلى `EXPIRED` ثم إنشاء الجديد داخل نفس transaction.

### 14.2 ما تم إغلاقه في الويب والموبايل ضمن P0

- الويب: تفعيل سياسة إظهار/إخفاء hard delete بما يتماشى مع سياسة المنصة.
- الموبايل:
  - إضافة/تحديث استهلاك endpoints الخاصة بـ:
    - update company
    - archive company
    - restore company
    - delete company (visibility policy-aware)
    - change-plan immediate
  - إرسال `Idempotency-Key` تلقائيًا في عمليات:
    - activate
    - suspend
    - extend
    - change-plan
  - إضافة معالجة رسائل المستخدم للأخطاء الحرجة:
    - `HARD_DELETE_DISABLED`
    - `IDEMPOTENCY_HASH_MISMATCH`
    - `IDEMPOTENCY_IN_PROGRESS`
    - `LIVE_SUBSCRIPTION_CONFLICT`
  - استكمال cache invalidation لضمان تحديث list/detail بعد lifecycle mutations.

### 14.3 مخرجات الجودة بعد الإغلاق

- اختبارات P0 المستهدفة (migration + use-cases + idempotency + policy) تم تمريرها.
- لا يوجد إدخال مقصود لعناصر `P1/P2` داخل تنفيذ P0.
- لا يوجد تفعيل لسيناريوهات `NEXT_CYCLE` في change-plan حتى الآن.

### 14.4 ملاحظات حالة المشروع بعد التحديث

- مستوى حوكمة الاشتراكات في الباك إند أصبح Production-grade في نطاق P0.
- الأساس الخاص بإدارة دورة حياة الشركات والاشتراكات أصبح متسقًا عبر Backend + Web + Mobile.
- ما تبقى خارج هذا التحديث يظل ضمن roadmap التالية (P1/P2) بدون تغيير.

## 2026-03-17 Implementation Sync (Execution Track)

### Contract and lifecycle implementation updates
- Web now has a dedicated change-plan endpoint constant, service method, and mutation hook.
- Super Admin subscriptions UI no longer routes `changePlan` through activate mutation.
- Change-plan now uses its dedicated mutation path in web contract flow.

### Role model alignment updates
- Active web role contracts were narrowed to backend source of truth: `OWNER`, `STAFF`, `SUPER_ADMIN`.
- Legacy role literals were removed from RBAC and route-access active role checks.

### Shared type and settings drift updates
- Active platform user/audit flows now consume domain-specific platform types from `src/lib/api/types/platform.ts`.
- Tenant placeholder settings route is no longer exposed from active nav and redirects to dashboard.
- Legacy settings API/hook surface was deprecated from public export barrels.

### Enforcement and CI gates
- Web gates added:
  - `npm run contracts:check`
  - `npm run roles:check`
- Backend gates added:
  - `npm run ci:check:feature-policy`
  - `npm run ci:check:subscription-invariant`
- Backend explicit policy manifest + enforcement spec added for controllers.

### Open unrelated blocker
- Existing unrelated TS issue still blocks full web build confirmation:
  - `src/features/platform-users/components/UserResetCredentialsModal.tsx:77`
