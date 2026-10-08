# خطة الإنتاج الشاملة — Daftar v1
> Senior Software Engineer Plan — Production Readiness
> تاريخ الإنشاء: 2026-03-19
> المرجع: الباك اند هو مصدر الحقيقة الوحيد

---

## 1. ملخص الوضع الحالي

### 1.1 ما هو مكتمل
| المشروع | الحالة العامة |
|---------|---------------|
| `dafter-api-v1` (Backend) | ✅ 23 موديول — مكتمل 100% |
| `dafter-dashboard` (Web) | 🟡 ~70% — ناقصه lifecycle actions + modules |
| `dafter-dashboard-mobile` (Mobile) | 🟡 ~75% — أقوى من الويب في بعض النقاط |

### 1.2 الفجوات الحرجة (Launch Blockers)
1. **الويب**: دورة حياة الفاتورة (submit/approve/reject/cancel/record-payment) غير موجودة في UI
2. **الويب**: موديول Payments غائب كليًا
3. **الويب**: صفحة Settings ترجع redirect وهمية
4. **الموبايل**: Platform Audit Logs غائب
5. **الموبايل**: Platform Settings غائب
6. **الويب + الموبايل**: 13 تقرير من 16 غير معروض

---

## 2. الافتراضات

- الباك اند مكتمل ومستقر — لا تغييرات جوهرية فيه
- المستخدم يريد إطلاق الإنتاج في أقرب وقت ممكن
- الأولوية: الاكتمال الوظيفي أولًا ثم الـ UX polish
- لا توجد متطلبات WhatsApp/CRM/AI في هذه الخطة (out of scope مؤكد)
- اسم المنتج: **Daftar** (توحيد الاسم في كل مكان)

---

## 3. الهيكل المعماري — للمرجع

```
dafter-api-v1          → NestJS + Prisma + PostgreSQL
  └── Controller → Service → UseCase → Repository → Prisma

dafter-dashboard       → Next.js 14 + Tailwind + TanStack Query
  └── app/(admin)/     → شاشات الشركة (tenant)
  └── app/super-admin/ → شاشات الإدارة (platform)

dafter-dashboard-mobile → Expo 54 + NativeWind + TanStack Query + Zustand
  └── app/(client)/    → شاشات الشركة
  └── app/(platform)/  → شاشات الإدارة
```

---

## 4. خطة التنفيذ — مقسمة على Phases

---

## 🔴 PHASE 1 — Launch Blockers (P0)
> الهدف: لا شيء في الباك اند يكسر التجربة بسبب غياب UI

### [WEB-P0-1] Invoice Lifecycle UI — الويب
**الأهمية**: تاجر لا يستطيع الموافقة/رفض/إلغاء فاتورة = النظام لا يعمل

**التطبيق**:
- إضافة زر **Submit** في صفحة تفاصيل الفاتورة (حالة DRAFT)
- إضافة زر **Approve / Reject** (حالة PENDING_APPROVAL) — للـ Owner فقط
- إضافة زر **Cancel** (حالات DRAFT/PENDING_APPROVAL/APPROVED)
- إضافة **Record Payment** في تفاصيل الفاتورة المعتمدة
- مزامنة state badges مع الـ backend enum (DRAFT→PENDING_APPROVAL→APPROVED→REJECTED→CANCELLED)
- تحديث الـ API service لاستدعاء endpoints الموجودة

**الملفات المتأثرة**:
- `dafter-dashboard/src/app/(admin)/invoices/[id]/page.tsx`
- `dafter-dashboard/src/lib/api/invoices.ts`
- Badge component لعرض الحالات بألوان مختلفة

**تقدير**: 2-3 أيام

---

### [WEB-P0-2] Payments Module — الويب
**الأهمية**: لا توجد طريقة لتسجيل دفعة مستقلة على الويب

**التطبيق**:
- صفحة `/payments` جديدة: نموذج لتسجيل دفعة مع اختيار العميل/المورد
- دعم `/payments/distribute` لتوزيع دفعة على أكثر من فاتورة
- ربط مع الـ API endpoints الموجودة

**الملفات الجديدة**:
- `dafter-dashboard/src/app/(admin)/payments/page.tsx`
- `dafter-dashboard/src/lib/api/payments.ts`
- `dafter-dashboard/src/components/payments/PaymentForm.tsx`
- `dafter-dashboard/src/components/payments/DistributePaymentModal.tsx`

**تقدير**: 2 أيام

---

### [WEB-P0-3] Company Settings Route Fix — الويب
**الأهمية**: المستخدم يضغط على Settings ويُعاد توجيهه — محير وغير احترافي

**الخيارات**:
- Option A (مستحسن): إخفاء الـ nav item لحين تنفيذ صفحة Settings حقيقية
- Option B: عرض صفحة profile/account كـ placeholder حقيقي
- **القرار**: Option A — إزالة الـ nav item المضلل

**الملفات المتأثرة**:
- Sidebar component في `dafter-dashboard`
- إزالة redirect route في `app/(admin)/settings/`

**تقدير**: 30 دقيقة

---

### [MOB-P0-1] Platform Audit Logs Screen — الموبايل
**الأهمية**: المدير لا يستطيع مراقبة العمليات من الموبايل

**التطبيق**:
- شاشة `/platform/audit-logs` مع:
  - قائمة مرقمة بالأحداث
  - filter chips: entity type, action
  - date range selector
  - pagination (load more)
- استخدام endpoint `GET /platform/audit-logs`

**الملفات الجديدة**:
- `dafter-dashboard-mobile/src/app/(platform)/audit-logs.tsx`
- `dafter-dashboard-mobile/src/features/platform-audit/`
- إضافة العنصر في platform nav/menu

**تقدير**: 2 أيام

---

### [MOB-P0-2] Platform Settings Screen — الموبايل
**الأهمية**: المدير لا يستطيع تعديل إعدادات النظام من الموبايل

**التطبيق**:
- شاشة `/platform/settings` مع:
  - Feature flags (toggle switches)
  - Platform policies (JSON values)
  - تحذير confirmation قبل أي تغيير
- Read + Update endpoints

**الملفات الجديدة**:
- `dafter-dashboard-mobile/src/app/(platform)/settings.tsx`
- `dafter-dashboard-mobile/src/features/platform-settings/`

**تقدير**: 2 أيام

---

## 🟠 PHASE 2 — High Value Features (P1)
> الهدف: اكتمال المنظومة الوظيفية للتاجر والمدير

### [WEB-P1-1] Delete Capability → Backend Contract
**المشكلة**: الويب يستخدم `NEXT_PUBLIC_SHOW_HARD_DELETE` env toggle بدل backend
**الحل**: جلب `/platform/capabilities` وعرض زر الحذف بناءً على `canHardDeleteTenant`
**الأثر**: أمان أعلى — السياسة في مكان واحد (الباك اند)

**تقدير**: 4 ساعات

---

### [WEB-P1-2] Statements Module — الويب
**التطبيق**:
- صفحة `/customers/[id]/statement` (أو tab داخل تفاصيل العميل)
- عرض كشف الحساب مع: رصيد افتتاحي + حركات + رصيد ختامي + running balance
- date range filter + export (print)
- endpoint: `GET /statements/:customerId`

**تقدير**: 2 أيام

---

### [WEB-P1-3] Entitlements/Subscription Page — الويب
**التطبيق**:
- صفحة `/settings/subscription` (company-facing)
- عرض: الخطة الحالية، الكوتة المستهلكة، الـ features المتاحة
- endpoint: `GET /my/entitlements`

**تقدير**: 1 يوم

---

### [MOB-P1-1] Reports Expansion — الموبايل
**الهدف**: رفع التقارير من 3 tabs إلى كاملة

**التقارير المضافة** (مرتبة بالأهمية):
1. `profit-loss` — الأرباح والخسائر
2. `cash-flow` — التدفق النقدي
3. `customers-aging` — تقادم الديون (عملاء)
4. `suppliers-aging` — تقادم الديون (موردون)
5. `sales-detailed` — تفاصيل المبيعات
6. `collections-followup` — متابعة التحصيل
7. `expenses-analytics` — تحليل المصروفات
8. `debts-summary` — ملخص الديون
9. `products-performance` — أداء المنتجات
10. `operational-performance` — الأداء التشغيلي
11. `critical-alerts` — التنبيهات الحرجة
12. `staff-activity` — نشاط الموظفين
13. `ledger-statement` — كشف دفتر الأستاذ

**الهيكل المقترح**:
- قائمة categorized بدلًا من flat tabs
- كل تقرير: date range picker + display + export

**تقدير**: 3-4 أيام

---

### [WEB-P1-4] Reports Parity — الويب
نفس التقارير 13 المتبقية — تطبيق مماثل للويب
**تقدير**: 3 أيام (بعض التقارير موجودة جزئيًا)

---

### [BOTH-P1-1] Statements + Pricing — الموبايل
- Statements screen: tab في تفاصيل العميل
- Pricing: في تفاصيل العميل — عرض وتعديل السعر الخاص
**تقدير**: 1-2 يوم

---

## 🟡 PHASE 3 — UX Polish & Production Hardening (P2/P3)
> الهدف: جاهزية كاملة للإنتاج

### [WEB-P2-1] UI Refresh — الويب
حسب `docs/ux_prompt.md`:
- تحديث نظام الألوان (Neutral Finance UI)
- تحسين Light mode و Dark mode
- تحسين الجداول والـ sidebar
- تحسين الـ stat cards والـ charts
**تقدير**: 3-4 أيام

---

### [BOTH-P2-1] Naming Cleanup
- توحيد الاسم: **Daftar** في كل الكود والتعليقات والـ i18n
- إزالة: Hasba / Hesabatak / salon من التعليقات القديمة
**تقدير**: 1 يوم

---

### [BOTH-P2-2] Form Validation Hardening
- ربط رسائل خطأ الباك اند بالحقول مباشرة (field-level errors)
- تحسين حالات Loading / Empty / Error بشكل موحد
- منع submit أثناء loading
**تقدير**: 2 أيام

---

### [WEB-P2-2] Company Settings Page (Real)
- صفحة `/settings` حقيقية للشركة:
  - بيانات الشركة (اسم، شعار، عملة، timezone)
  - إعدادات التنبيهات
  - بيانات المستخدم الحالي
**تقدير**: 2 أيام

---

## 🚀 PHASE 4 — Production Infrastructure
> الهدف: نظام يعمل بثقة في الإنتاج

### [INFRA-1] Error Monitoring
- تكامل **Sentry** في الباك اند + الويب + الموبايل
- Capture unhandled exceptions + API errors
- Alert on error spike

---

### [INFRA-2] Performance Monitoring
- APM للباك اند (Sentry Performance أو Datadog)
- مراقبة slow queries في Prisma
- P95 latency tracking لكل endpoint

---

### [INFRA-3] Database Backup Strategy
- Daily automated backup لـ PostgreSQL
- Point-in-time recovery capability
- Backup retention: 30 يوم

---

### [INFRA-4] Rate Limiting Review
- تأكد أن rate limiting فعال على:
  - Login endpoint (brute force protection)
  - API endpoints الحساسة
  - Platform endpoints

---

### [INFRA-5] Security Headers
- HTTPS enforced (redirect HTTP→HTTPS)
- HSTS header
- CSP header على الويب
- CORS strict في الباك اند

---

### [INFRA-6] CI/CD Pipeline
```yaml
# المطلوب لكل مشروع:
Backend:
  - lint + type-check
  - prisma validate
  - test suite
  - build check
  - docker build + push
  - deploy to staging → prod (manual gate)

Web:
  - lint + type-check
  - build check
  - deploy to Vercel/staging

Mobile:
  - lint + type-check
  - expo export check
  - OTA update via EAS
```

---

### [INFRA-7] Environment Configuration
```
المطلوب في كل environment:
- DATABASE_URL (prod = different DB)
- JWT_SECRET (strong, rotatable)
- REDIS_URL (للـ cache)
- SMTP config (للـ notifications)
- Firebase config (للـ push notifications)
- Sentry DSN
- APP_URL (per environment)
```

---

### [INFRA-8] Load Testing
- اختبار الـ load على endpoints الأكثر استخداماً:
  - POST /invoices
  - GET /dashboard
  - GET /customers
- Target: 100 concurrent users / endpoint

---

## 5. جدول التنفيذ

```
Week 1 (أسبوع 1):
  Mon: [WEB-P0-1] Invoice Lifecycle UI (start)
  Tue: [WEB-P0-1] Invoice Lifecycle UI (finish)
  Wed: [WEB-P0-2] Payments Module (start)
  Thu: [WEB-P0-2] Payments Module (finish)
  Fri: [WEB-P0-3] Settings route fix | [MOB-P0-1] Audit Logs (start)

Week 2 (أسبوع 2):
  Mon: [MOB-P0-1] Audit Logs (finish) | [MOB-P0-2] Platform Settings (start)
  Tue: [MOB-P0-2] Platform Settings (finish)
  Wed: [WEB-P1-1] Delete Capability Contract | [WEB-P1-3] Entitlements page
  Thu: [WEB-P1-2] Statements Module (web)
  Fri: [BOTH-P1-1] Statements + Pricing (mobile)

Week 3 (أسبوع 3):
  Mon-Wed: [MOB-P1-1] Reports Expansion (mobile) — 13 reports
  Thu-Fri: [WEB-P1-4] Reports Parity (web)

Week 4 (أسبوع 4):
  Mon-Wed: [WEB-P2-1] UI Refresh
  Thu: [BOTH-P2-1] Naming Cleanup | [BOTH-P2-2] Form Validation
  Fri: [WEB-P2-2] Company Settings Page

Week 5 (أسبوع 5):
  Mon: [INFRA-1] Sentry setup (all 3 projects)
  Tue: [INFRA-2] Performance Monitoring
  Wed: [INFRA-3] DB Backup + [INFRA-4] Rate Limiting review
  Thu: [INFRA-5] Security Headers + [INFRA-6] CI/CD
  Fri: [INFRA-7] Env Config + [INFRA-8] Load Testing

Week 6 (أسبوع 6):
  Smoke testing + regression + final QA
  Production deployment preparation
  Monitoring dashboards setup
  Go-live checklist sign-off
```

---

## 6. Pre-Launch Checklist

### Backend ✅
- [ ] كل endpoint له `companyId` في الـ query
- [ ] كل write في `$transaction` مع AuditLog
- [ ] Rate limiting فعال على auth endpoints
- [ ] `isDeleted: false` في كل read
- [ ] Prisma schema لا تحتوي على index مفقود
- [ ] Environment variables محددة في `.env.production`
- [ ] Database migration مطبقة على Production
- [ ] Health check endpoint يعمل (`/health`)
- [ ] Sentry configured

### Web Dashboard ✅
- [ ] Invoice lifecycle actions تعمل كاملة
- [ ] Payments module يعمل
- [ ] لا توجد صفحة redirect وهمية
- [ ] Delete visibility من backend لا env variable
- [ ] Error boundaries موجودة
- [ ] Loading states في كل قائمة
- [ ] 404 / 500 pages موجودة
- [ ] HTTPS enforced
- [ ] Sentry configured

### Mobile Dashboard ✅
- [ ] Platform Audit Logs شاشة تعمل
- [ ] Platform Settings شاشة تعمل
- [ ] Invoice lifecycle actions تعمل
- [ ] Payments screen تعمل
- [ ] Push notifications تعمل (Firebase)
- [ ] Crash reporting (Sentry) configured
- [ ] OTA updates configured (EAS)
- [ ] App Store / Play Store submissions جاهزة

---

## 7. المخاطر والـ Trade-offs

### مخاطر تقنية
| الخطر | الاحتمالية | الأثر | التخفيف |
|-------|-----------|-------|---------|
| بطء في Reports الثقيلة | عالي | متوسط | pagination + caching + DB indexes |
| تعارض optimistic locking في Employees | متوسط | منخفض | رسالة خطأ واضحة + retry |
| JWT token expiry أثناء form fill | متوسط | متوسط | silent refresh + toast إعلام |
| Push notification failures | متوسط | منخفض | graceful fallback + retry queue |

### Trade-offs
- **Statements UI**: قررنا إضافته كـ tab في تفاصيل العميل لا صفحة مستقلة — أبسط وأسرع
- **Pricing UI**: في Phase 1 فقط read, الـ edit في Phase 2 — يقلل التعقيد الأولي
- **Reports المتقدمة**: الموبايل أولًا (أكثر استخداماً) ثم الويب
- **Platform Settings على الموبايل**: read-first، الـ write مع confirmation صارم

---

## 8. ملاحظات للتطوير

### قاعدة ثابتة لكل Ticket
```
Backend   → الـ endpoint موجود (لا تلمس)
Web/Mob   → قراءة الـ controller أولًا لفهم الـ contract
DTO       → الـ response shape من الباك اند هو المرجع
i18n      → أضف مفاتيح الترجمة لكل نص جديد
Test      → smoke test بعد أي lifecycle action جديد
```

### نمط موحد لكل شاشة جديدة
```
1. Types (من الـ response)
2. QUERY_KEY
3. API function (apiClient.get/post...)
4. Hook (useQuery/useMutation)
5. Component / Screen
6. i18n keys
7. Navigation (إضافة للـ menu/tab)
```

---

## 9. تعريف "مكتمل 100%"

### Backend: مكتمل ✅
### Web Dashboard: مكتمل عندما:
- جميع P0 + P1 مطبقة
- لا توجد صفحة redirect وهمية
- Delete policy من backend
- Reports كاملة
- Entitlements page موجودة
- UI Refresh مطبق

### Mobile Dashboard: مكتمل عندما:
- جميع P0 + P1 مطبقة
- Platform Audit + Settings موجودان
- Reports 13+ موجودة
- Crash reporting فعال
- EAS configured

### Production: مكتمل عندما:
- جميع ما سبق + Phase 4 Infrastructure
- Load test passed
- Pre-launch checklist 100%
- Monitoring dashboards تعمل

---

## 10. الترتيب التنفيذي الصارم

```
1.  [WEB-P0-1]  Invoice Lifecycle UI          (الأهم)
2.  [WEB-P0-2]  Payments Module (web)
3.  [WEB-P0-3]  Settings route fix
4.  [MOB-P0-1]  Platform Audit Logs (mobile)
5.  [MOB-P0-2]  Platform Settings (mobile)
6.  [WEB-P1-1]  Delete Capability Contract
7.  [WEB-P1-2]  Statements Module (web)
8.  [WEB-P1-3]  Entitlements Page (web)
9.  [BOTH-P1-1] Statements + Pricing (mobile)
10. [MOB-P1-1]  Reports Expansion (mobile) — 13 reports
11. [WEB-P1-4]  Reports Parity (web)
12. [WEB-P2-1]  UI Refresh
13. [BOTH-P2-1] Naming Cleanup
14. [BOTH-P2-2] Form Validation Hardening
15. [WEB-P2-2]  Company Settings Page
16. [INFRA-1]   Sentry (all projects)
17. [INFRA-2]   Performance Monitoring
18. [INFRA-3]   DB Backup
19. [INFRA-4]   Rate Limiting Review
20. [INFRA-5]   Security Headers
21. [INFRA-6]   CI/CD Pipeline
22. [INFRA-7]   Env Configuration
23. [INFRA-8]   Load Testing
24.             Final QA + Go-Live
```

---

## 11. Prompts التنفيذ — Copy-Paste جاهز

> استخدم كل prompt في بداية المحادثة المخصصة للـ phase.
> الباك اند مكتمل — لا تعدّل عليه إلا إذا نُص صراحةً.

---

### PROMPT 1 — [WEB-P0-1] Invoice Lifecycle UI

```
نفّذ [WEB-P0-1] من خطة PRODUCTION_PLAN.md

المطلوب: إضافة Invoice Lifecycle actions في Web Dashboard
الباك اند جاهز — الـ endpoints موجودة.

اقرأ أولًا:
- dafter-dashboard/src/app/(admin)/invoices/ (الصفحات الموجودة)
- dafter-api-v1/src/modules/invoices/invoices.controller.ts (الـ endpoints)

المطلوب تنفيذه:
1. زر Submit في تفاصيل الفاتورة (DRAFT فقط)
2. زر Approve + Reject (PENDING_APPROVAL — Owner فقط)
3. زر Cancel (DRAFT / PENDING_APPROVAL / APPROVED)
4. Record Payment form داخل تفاصيل الفاتورة المعتمدة
5. Status badge بألوان مختلفة لكل حالة

لا تغير الباك اند. لا تعيد تصميم الصفحة من الصفر.
```

---

### PROMPT 2 — [WEB-P0-2] Payments Module

```
نفّذ [WEB-P0-2] من خطة PRODUCTION_PLAN.md

المطلوب: إنشاء Payments Module في Web Dashboard
الباك اند جاهز — اقرأ:
- dafter-api-v1/src/modules/invoices/payments.controller.ts
- dafter-api-v1/src/modules/invoices/dto/ (الـ DTOs)

أنشئ:
1. صفحة /payments (standalone payment form — عميل + مبلغ + ملاحظة)
2. Distribute Payment Modal (توزيع دفعة على أكثر من فاتورة)
3. إضافة "المدفوعات" في الـ sidebar

اتبع نفس نمط الصفحات الموجودة في dafter-dashboard/src/app/(admin)/expenses/ كمرجع للهيكل.
```

---

### PROMPT 3 — [WEB-P0-3] + [MOB-P0-1] + [MOB-P0-2] Settings Fix + Platform Screens

```
نفّذ [WEB-P0-3] + [MOB-P0-1] + [MOB-P0-2] من خطة PRODUCTION_PLAN.md

المطلوب:
1. [WEB] إزالة redirect الوهمي من صفحة /settings في الويب — إخفاء الـ nav item
2. [MOB] إضافة شاشة Platform Audit Logs في الموبايل
3. [MOB] إضافة شاشة Platform Settings في الموبايل

للموبايل — اقرأ أولًا:
- dafter-api-v1/src/modules/platform/ (controllers: audit + settings)
- dafter-dashboard-mobile/src/app/(platform)/ (الشاشات الموجودة كمرجع)

اتبع نفس pattern الشاشات الموجودة في (platform).
لا تغير الباك اند.
```

---

### PROMPT 4 — [WEB-P1-1] + [WEB-P1-2] + [WEB-P1-3] Delete Contract + Statements + Entitlements

```
نفّذ [WEB-P1-1] + [WEB-P1-2] + [WEB-P1-3] من خطة PRODUCTION_PLAN.md

المطلوب:
1. Delete Capability: استبدل env toggle بـ backend response
   - اقرأ: dafter-api-v1/src/modules/platform/ (capabilities endpoint)
   - عدّل: صفحة Tenants في super-admin بحيث تجلب canHardDeleteTenant من الباك اند

2. Statements UI: tab داخل تفاصيل العميل
   - endpoint: GET /statements/:customerId
   - اعرض: opening balance + transactions + running balance + date range filter

3. Entitlements Page: صفحة /settings/subscription للشركة
   - endpoint: GET /my/entitlements
   - اعرض: الخطة الحالية + الكوتة المستهلكة + الـ features المتاحة (read-only)
```

---

### PROMPT 5 — [MOB-P1-1] Reports Expansion (الموبايل)

```
نفّذ [MOB-P1-1] من خطة PRODUCTION_PLAN.md

المطلوب: توسيع Reports screen في الموبايل من 3 tabs إلى 13+ تقرير

اقرأ أولًا:
- dafter-api-v1/src/modules/reports/reports.controller.ts (جميع الـ endpoints)
- dafter-dashboard-mobile/src/app/(client)/reports.tsx (الشاشة الحالية)
- dafter-dashboard-mobile/src/features/reports/ (الـ hooks + api الحالية)

المطلوب إضافته:
1. profit-loss, cash-flow, customers-aging, suppliers-aging
2. sales-detailed, collections-followup, expenses-analytics
3. debts-summary, products-performance, operational-performance
4. critical-alerts, staff-activity, ledger-statement

اعمل categorized list بدل flat tabs — فئات: مالية / تشغيلية / متابعة
كل تقرير: date range picker + display + مناسب للموبايل
```

---

### PROMPT 6 — [WEB-P1-4] Reports Parity (الويب)

```
نفّذ [WEB-P1-4] من خطة PRODUCTION_PLAN.md

المطلوب: مزامنة Reports page في الويب مع الباك اند الكامل

اقرأ أولًا:
- dafter-api-v1/src/modules/reports/reports.controller.ts
- dafter-dashboard/src/app/(admin)/reports/ (ما هو موجود)

أضف الـ reports الناقصة بنفس الـ design pattern الموجود.
التقارير الناقصة: profit-loss, cash-flow, customers-aging, suppliers-aging,
sales-detailed, collections-followup, expenses-analytics, debts-summary,
products-performance, operational-performance, critical-alerts, staff-activity, ledger-statement
```

---

### PROMPT 7 — [WEB-P2-1] UI Refresh

```
نفّذ [WEB-P2-1] من خطة PRODUCTION_PLAN.md

المطلوب: UI Refresh كامل للـ Web Dashboard

اقرأ أولًا:
- docs/ux_prompt.md (المواصفات الكاملة)
- dafter-dashboard/src/app/globals.css
- dafter-dashboard/tailwind.config.ts

نفّذ حسب ux_prompt.md بالكامل:
- تحديث CSS variables / color tokens
- Light mode و Dark mode
- Sidebar + Tables + Cards + Forms

لا تغير business logic. لا تغير routing. فقط styling.
```

---

### PROMPT 8 — [BOTH-P2-1] + [BOTH-P2-2] Naming Cleanup + Form Validation

```
نفّذ [BOTH-P2-1] + [BOTH-P2-2] من خطة PRODUCTION_PLAN.md

المطلوب:
1. Naming Cleanup في المشروعين (ويب + موبايل):
   - ابحث عن: "Hasba", "Hesabatak", "salon" في كل الكود
   - استبدل بـ: "Daftar" في التعليقات والـ i18n strings والـ docs
   - لا تغير أسماء المتغيرات أو الـ classes في الكود

2. Form Validation Hardening:
   - ربط backend error messages بالحقول مباشرة في الـ heavy forms
     (invoices, deferred sales, installments)
   - منع double-submit (disable button أثناء loading)
   - توحيد empty/error states في الـ lists الكبيرة
```

---

### PROMPT 9 — [WEB-P2-2] Company Settings Page

```
نفّذ [WEB-P2-2] من خطة PRODUCTION_PLAN.md

المطلوب: صفحة Company Settings حقيقية في الويب

اقرأ أولًا:
- dafter-api-v1/src/modules/platform/ (company update endpoints)
- dafter-dashboard/src/app/(admin)/ (الهيكل الحالي)

أنشئ صفحة /settings تحتوي:
1. بيانات الشركة (اسم، عملة، timezone) — قابلة للتعديل
2. بيانات المستخدم الحالي (اسم، إيميل، تغيير كلمة المرور)
3. إعدادات التنبيهات (toggle switches)

استخدم نفس نمط الصفحات الموجودة. لا تغير الباك اند.
```

---

### PROMPT 10 — [INFRA-1] + [INFRA-2] Sentry + Monitoring

```
نفّذ [INFRA-1] + [INFRA-2] من خطة PRODUCTION_PLAN.md

المطلوب: إضافة Sentry للـ 3 مشاريع

1. Backend (NestJS):
   - npm install @sentry/node
   - تهيئة في main.ts + exception filter

2. Web (Next.js):
   - npm install @sentry/nextjs
   - sentry.client.config.ts + sentry.server.config.ts

3. Mobile (Expo):
   - npm install @sentry/react-native
   - تهيئة في app/_layout.tsx

أضف SENTRY_DSN في .env.example للـ 3 مشاريع.
لا تضع DSN حقيقي في الكود — env variable فقط.
```

---

### PROMPT 11 — [INFRA-4] + [INFRA-5] + [INFRA-6] Security + CI/CD

```
نفّذ [INFRA-4] + [INFRA-5] + [INFRA-6] من خطة PRODUCTION_PLAN.md

المطلوب:
1. GitHub Actions workflow للباك اند:
   - lint → type-check → prisma validate → test → build
   - deploy on merge to main

2. GitHub Actions workflow للويب:
   - lint → type-check → build
   - deploy to Vercel on merge to main

3. Security headers في الويب (next.config.ts):
   - HSTS, CSP, X-Frame-Options, X-Content-Type-Options

4. Rate limiting check في الباك اند:
   - تأكد من وجود throttling على /auth/* endpoints

اقرأ الـ package.json في كل مشروع أولًا لمعرفة الـ scripts الموجودة.
```

---

### ملاحظة الاستخدام

- كل prompt يُستخدم في **محادثة جديدة**
- بعد انتهاء كل phase قل: **"مكتمل، انتقل للـ prompt التالي"**
- إذا انقطعت المحادثة في منتصف phase أضف:
  ```
  استكمل [اسم الـ task] — اللي اتعمل: [X]، المتبقي: [Y]
  ```
