# SUBSCRIPTION_ENTITLEMENTS_MASTER_PLAN.md

## الهدف
بناء نظام خطط واشتراكات وصلاحيات قابل للتوسع (Scalable SaaS Entitlements) يضمن:
- كل شركة تأخذ فقط ما تسمح به خطتها.
- كل مستخدم داخل الشركة يأخذ فقط ما تسمح به صلاحياته داخل حدود الخطة.
- إضافة أي موديول جديد مستقبلًا بدون كسر العملاء الحاليين.
- رسائل UX واضحة عند المنع أو تجاوز الحد.

## ملخص الحالة الحالية (Actual State)
تمت مراجعة الباك إند الحالي، والنتيجة:

1. الموجود حاليًا ويعمل:
- كيان `Plan` يحتوي حدود كمية: `maxUsers`, `maxCustomers`, `maxSuppliers`, `maxEmployees`, `maxLedgerEntries`.
- كيان `CompanySubscription` مع حالات: `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, `DISABLED`.
- Guard عام للاشتراك: `TenantSubscriptionGuard` يمنع الوصول حسب حالة الاشتراك (مع Grace Period).
- فحوص حدود موجودة بالفعل في بعض حالات الإنشاء (Users/Customers/Suppliers/Employees).
- Partial unique index يمنع أكثر من اشتراك حي واحد لنفس الشركة (قاعدة ممتازة).

2. الفجوات المهمة:
- لا يوجد Enforcer موحد على مستوى "ميزة/موديول" مربوط مباشرة بـ `plan.features`.
- فحوص الحدود ليست مركزية بالكامل (موزعة على Use Cases متعددة).
- لا يوجد Contract موحد لرسائل entitlement errors بين الباك والفرونت.
- لا يوجد Versioning واضح لتعريفات ميزات الخطة عند إضافة موديول جديد.
- لا يوجد Rollout Governance رسمي لمنع كسر العملاء عند إدخال ميزات جديدة.

## المتطلبات الأساسية (Requirements)

1. متطلبات وظيفية:
- إدارة الخطط: إنشاء/تعديل/تفعيل/إيقاف خطط.
- تعريف ميزات الخطة بشكل صريح (Feature Keys) وليس نصوص عشوائية.
- فرض حدود الكميات وقت التنفيذ (runtime enforcement).
- دعم Change Plan بدون فساد بيانات أو انقطاع غير مبرر.
- دعم grandfathering (عملاء قدامى يستمرون على صلاحياتهم المتفق عليها عند الحاجة).

2. متطلبات غير وظيفية:
- أمان عالي: لا اعتماد على الفرونت فقط، كل enforcement في الباك إند.
- أداء: checks خفيفة + caching مع invalidation واضح.
- قابلية التوسع: إضافة موديول جديد بإضافة Feature Key وقاعدة واحدة فقط.
- Observability: audit logs + metrics + alerting.

## النموذج الصحيح للصلاحيات (Authorization Model)
الموديل النهائي يجب أن يكون تقاطع 3 طبقات:

`Effective Access = Subscription Status AND Plan Entitlements AND User Permissions`

1. Subscription Status Gate:
- الشركة أصلاً مسموح لها تستخدم النظام الآن؟ (ACTIVE/TRIAL + grace rules).

2. Plan Entitlements Gate:
- هل الخطة تشمل الموديول/الميزة؟
- هل الشركة داخل الحدود العددية؟

3. User Permission Gate:
- هل المستخدم نفسه له الصلاحية داخل الموديول؟

هذا يمنع حالتين خطر:
- مستخدم عنده permission لكن الخطة لا تشمل الموديول.
- خطة تشمل الموديول لكن المستخدم ليس لديه permission.

## تصميم Feature Keys (الركن الأهم للتوسع)
اعتماد Feature Catalog ثابت ومُنسّق، مثال:

- `module.dashboard.read`
- `module.customers.read`
- `module.customers.manage`
- `module.installments.read`
- `module.installments.manage`
- `module.reports.read`
- `module.reports.export`

قواعد:
- Naming convention ثابت (`module.<domain>.<action>`).
- أي موديول جديد = إضافة Keys جديدة للكتالوج + تحديث سياسة افتراضية.
- منع استخدام نصوص features غير معرفة (strict validation).

## تصميم الحدود (Quotas)

1. ما يجب فرضه فورًا:
- `maxUsers` عند إنشاء/تفعيل مستخدم.
- `maxCustomers` عند إنشاء عميل.
- `maxSuppliers` عند إنشاء مورد.
- `maxEmployees` عند إنشاء موظف.
- `maxLedgerEntries` عند إنشاء قيد.

2. قواعد مهمة:
- `null` = غير محدود.
- التحقق يكون داخل transaction قبل العملية الفعلية.
- حماية race condition (طلبين متزامنين يكسروا الحد) باستخدام locking مناسب أو guard query موثوق داخل transaction.

3. UX Error Contract موحد:
شكل خطأ موحد من الباك:
- `code`: مثل `PLAN_LIMIT_REACHED`, `FEATURE_NOT_AVAILABLE`, `SUBSCRIPTION_INACTIVE`
- `entity`: `customers`, `users`, ...
- `limit`, `current`, `featureKey`
- `message` محلي قابل للعرض مباشرة

## أهم الحالات الطرفية (Edge Cases)

1. downgrade لخطة أقل من الاستخدام الحالي:
- مثال: الشركة عندها 120 عميل والخطة الجديدة حدها 100.
- السياسة: "منع إنشاء جديد" مع السماح بالقراءة والتعديل غير الموسّع.
- لا نحذف بيانات قديمة تلقائيًا.

2. التزامن:
- إنشاء مستخدمين أو عملاء بشكل متوازي قد يتجاوز الحد إذا check غير ذري.

3. timezone في start/end/grace:
- كل المقارنات على UTC وقواعد واضحة لنقطة انتهاء اليوم.

4. cache staleness:
- بعد تغيير الخطة لازم invalidate مباشر لكاش entitlements.

5. owner/system bypass:
- يجب عدم وجود bypass لصلاحيات الخطة حتى للـ OWNER داخل الشركة.
- فقط SUPER_ADMIN platform لديه bypass إداري مضبوط.

6. إيقاف feature بعد إطلاقها:
- التعامل عبر feature flags + migration policy.

## المخاطر (Pitfalls)

1. الاعتماد على الفرونت فقط لإخفاء الأزرار.
- الحل: backend enforcement mandatory.

2. تخزين `features` كنصوص بدون schema version.
- الحل: catalog version + validation.

3. منطق entitlement متكرر في كل موديول.
- الحل: central Entitlement Service + decorators/guards موحدة.

4. رسائل أخطاء غير موحدة.
- الحل: error codes ثابتة + ترجمة مركزية.

## الخطة التنفيذية المقترحة (Phased Plan)

### Phase 0 - تثبيت العقد (Contract First)
- تعريف Feature Catalog رسمي في ملف واحد (Backend).
- تعريف Error Codes موحدة للـ entitlement.
- تعريف سياسة downgrade/upgrade رسميًا.

### Phase 1 - Entitlement Core
- بناء `EntitlementService` مركزي:
  - `hasFeature(companyId, featureKey)`
  - `assertFeature(...)`
  - `assertQuota(...)`
  - `getEffectiveEntitlements(companyId)`
- إضافة caching + invalidation hooks بعد أي تعديل plan/subscription.

### Phase 2 - Guard/Decorator Layer
- Decorator جديد: `@RequireFeature('module.installments.manage')`
- Decorator جديد للحدود: `@EnforceQuota('customers')` أو استدعاء صريح داخل use case.
- دمج الترتيب الصحيح مع guards الحالية (JWT -> Roles -> Subscription -> Feature -> Permission).

### Phase 3 - Module-by-Module Hardening
- توحيد تطبيق checks في كل create/enable/write endpoint.
- إغلاق أي endpoint غير مغطى.
- إضافة اختبارات حدود لكل موديول.

### Phase 4 - Frontend UX Alignment
- استهلاك `code` وبيانات الحد لإظهار رسائل واضحة للمستخدم.
- إخفاء عناصر UI غير المسموحة (لتحسين التجربة فقط، وليس للأمان).
- صفحة "حدود الخطة الحالية" داخل الإعدادات.

### Phase 5 - Plan Evolution Workflow
- عند إضافة موديول جديد:
  - إضافة Feature Keys.
  - تحديد default policy لكل خطة (on/off).
  - migration script لتعبئة القيم للخطة القديمة.
  - rollout تدريجي + مراقبة.

### Phase 6 - Governance & Observability
- Audit logs لكل قرار entitlement مهم (deny/allow high-risk).
- Metrics:
  - `entitlement_denied_total`
  - `quota_denied_total`
  - `feature_usage_by_plan`
- Alerts عند ارتفاع deny غير طبيعي.

## تعريف سياسة إضافة موديول جديد (Runbook)
عند إدخال موديول جديد (مثال: Installments Pro):

1. إضافة keys:
- `module.installments.read`
- `module.installments.manage`

2. تحديث catalog version.
3. تحديث plan matrix لكل خطة.
4. تنفيذ migration default mapping.
5. حماية endpoints بـ decorators الجديدة.
6. تحديث navigation/ui حسب entitlements endpoint.
7. اختبار end-to-end على:
- خطة تملك الموديول
- خطة لا تملك الموديول
- downgrade scenario

## اختبار القبول (Acceptance Criteria)

1. أمان:
- أي محاولة API خارج صلاحيات الخطة = 403 بكود واضح.

2. الحدود:
- عند الوصول للحد بالضبط (boundary) يمنع الإنشاء التالي.

3. التوسع:
- إضافة feature جديدة لا تكسر خطط قديمة ولا تخفي بيانات قائمة.

4. UX:
- المستخدم يرى رسالة مفهومة تتضمن السبب والخطوة التالية.

5. الاستقرار:
- لا regression في الشركات الحالية بعد تطبيق النظام.

## Backlog عملي مقترح (مرتّب بالأولوية)

1. إنشاء `EntitlementService` مركزي + Error Contract.
2. إنشاء Feature Catalog ثابت + validator.
3. ربط `plan.features` بالـ guard الفعلي (ليس فقط تخزين).
4. توحيد quota checks في utility/service واحدة.
5. إضافة endpoint يعيد `effective entitlements + quotas` للفرونت.
6. تحديث الفرونت لعرض gating وquota UX.
7. إضافة integration tests شاملة لكل موديول أساسي.
8. إضافة observability + dashboards للمنع والاستخدام.

## قرار هندسي مهم
لا يتم إطلاق أي موديول جديد قبل توفر 4 عناصر:
- Feature keys معتمدة.
- Backend enforcement مكتمل.
- UI gating/UX messages مكتملة.
- اختبارات قبول + rollback plan.

## What We Should Do Next (الخطوة التالية مباشرة)
الخطوة التالية الصحيحة قبل أي توسع جديد:
- تنفيذ **Phase 0 + Phase 1** أولًا كـ foundation.
- بعدها نبدأ التطبيق التدريجي على الموديولات الحالية واحدًا واحدًا.

---
هذا الملف هو المرجع التنفيذي الرسمي لتطوير نظام الخطط والصلاحيات والحدود بدون كسر العملاء الحاليين.
