هدف المرحلة الحالية:
تحويل السيستم من برنامج تسجيل حسابات فقط إلى نظام أسرع وأوضح للتاجر/الموظف بعد الاتفاق مع العميل، مع التركيز على:

1. سرعة إنشاء الفاتورة
2. وضوح حالة العميل أثناء البيع
3. قوة إدارة الآجل والتحصيل
4. تقليل عدد الخطوات
5. تحسين الاستخدام اليومي على الموبايل والويب
6. عدم إضافة واتساب أو Orders module منفصلة الآن
7. الحفاظ على نفس كيان الفاتورة الحالي مع تحسين الـworkflow

========================================
أولًا: ما نحتفظ به كما هو
========================================

- Customers
- Suppliers
- Products
- Invoices
- Deferred Sales
- Installments
- Ledger
- Reports
- Multi-tenant / plans / entitlements

========================================
ثانيًا: أهم تحسينات الـBackend المطلوبة
========================================

1. تحسين Workflow الفاتورة

- تأكيد أن الفاتورة لها حالات واضحة:
  - DRAFT
  - PENDING_APPROVAL
  - APPROVED
  - REJECTED
  - CANCELLED
- منع أي أثر مالي للفواتير DRAFT / PENDING
- تنفيذ القيود/الحركات المالية فقط عند APPROVED
- توضيح rules الإلغاء والرفض بعد الاعتماد

2. تحسين نموذج بيانات العميل داخل البيع

- إضافة حقول/منطق لعرض:
  - current balance
  - overdue amount
  - last invoice date
  - last selling price per product
  - default payment type
  - optional credit limit
- تجهيز endpoint سريع يعيد "ملخص العميل أثناء البيع"

3. تحسين تجربة المنتجات داخل الفاتورة

- دعم:
  - last sold price per customer/product
  - frequently sold products
  - recently used products
  - quick search by name / code / SKU / barcode إن وجد
- تجهيز API للبحث السريع جدًا في المنتجات
- تجهيز API لإرجاع منتجات العميل المتكررة

4. تسريع إنشاء الفاتورة

- API لإنشاء Draft Invoice بسرعة
- API لإضافة/تعديل البنود بدون refresh كامل
- API لتكرار آخر فاتورة للعميل
- API لتحويل Draft إلى Approved
- API لحفظ مسودة تلقائيًا
- API لاستخراج preview totals فورًا

5. تحسين البيع الآجل والتحصيل

- API واضح للـreceivables summary:
  - total receivables
  - overdue receivables
  - due today
  - due this week
- API لكشف حساب العميل
- API لتسجيل دفعة بسرعة
- API لتوزيع الدفعة على فاتورة أو أكثر
- API لحساب الرصيد المتبقي بعد الدفع
- دعم partial payments بشكل واضح
- تحسين overdue classification

6. تحسين الداشبورد اليومي

- API للوحة يومية فيها:
  - sales today
  - collections today
  - new deferred sales
  - overdue customers count
  - top customers
  - unpaid invoices
- فصل dashboard للتاجر عن dashboard للمحاسب لو أمكن

7. تحسين الصلاحيات

- تحديد صلاحيات واضحة:
  - create invoice
  - edit draft
  - approve invoice
  - reject invoice
  - record payment
  - view reports
  - view customer balances
- منع الموظفين غير المصرح لهم من اعتماد أو تعديل فواتير معتمدة

8. Audit Trail واضح

- تسجيل:
  - من أنشأ الفاتورة
  - من عدلها
  - من وافق عليها
  - من سجل دفعة
  - ماذا تغير ومتى
- Log واضح لتعديلات السعر والخصم

9. تحسين الأداء

- فهرسة قوية على:
  - customerId
  - invoice status
  - invoice date
  - due date
  - payment status
  - product name/code
- pagination في القوائم
- debounce/search optimization
- caching للبيانات المتكررة
- تجنب تحميل كل بيانات العميل/المنتجات دفعة واحدة

========================================
ثالثًا: أهم تحسينات الـFrontend المطلوبة
========================================

1. شاشة إنشاء الفاتورة
   لازم تبقى أسرع شاشة في السيستم كله
   المطلوب:

- اختيار عميل سريع
- إظهار ملخص العميل فورًا بعد الاختيار:
  - الرصيد الحالي
  - المتأخرات
  - آخر عملية
  - تنبيه لو عليه مشاكل
- بحث منتجات سريع جدًا
- إضافة منتج في أقل عدد ضغطات
- تعديل الكمية والسعر والخصم inline
- إظهار الإجماليات live
- زر حفظ Draft
- زر اعتماد/إرسال للموافقة
- زر تكرار آخر فاتورة

2. شاشة قائمة الفواتير

- Filters قوية:
  - date range
  - customer
  - status
  - payment status
  - deferred only
- Tabs واضحة:
  - Draft
  - Pending Approval
  - Approved
  - Unpaid
  - Overdue
- Quick actions:
  - open
  - approve
  - reject
  - cancel
  - record payment
  - duplicate

3. شاشة العميل

- Summary card واضحة:
  - total purchases
  - outstanding balance
  - overdue amount
  - last invoice
  - payment behavior
- Tabs:
  - invoices
  - payments
  - account statement
  - deferred sales
- زر سريع:
  - create invoice for this customer
  - record payment

4. شاشة التحصيل / الدفعات

- إدخال دفعة بسرعة
- اختيار العميل أولًا
- عرض الفواتير المفتوحة
- اقتراح توزيع تلقائي للدفعة
- إمكانية التعديل اليدوي
- إظهار المتبقي بعد التوزيع
- حفظ سهل وواضح

5. Dashboard رئيسية

- Cards سريعة:
  - مبيعات اليوم
  - تحصيل اليوم
  - فواتير غير مدفوعة
  - عملاء متأخرون
  - آجلة جديدة
- جداول مختصرة:
  - آخر فواتير
  - العملاء الأكثر تأخرًا
  - التحصيلات الأخيرة
- CTA واضح:
  - إنشاء فاتورة
  - تسجيل دفعة
  - عرض المتأخرات

========================================
رابعًا: تحسينات UX المطلوبة
========================================

1. تقليل الخطوات

- أي عملية متكررة لازم لا تزيد عن أقل عدد نقرات ممكن
- إنشاء الفاتورة لازم يكون مختصر
- تسجيل دفعة لازم يكون مختصر

2. تحسين القراءة البصرية

- إبراز:
  - الرصيد
  - المتأخر
  - حالة الفاتورة
  - المدفوع والمتبقي
- استخدام ألوان واضحة للحالات:
  - draft
  - approved
  - unpaid
  - overdue

3. منع الأخطاء

- تحذير لو العميل عليه متأخرات
- تحذير لو الفاتورة ناقصة
- تحذير لو السعر صفر أو الخصم مبالغ فيه
- منع اعتماد فاتورة بدون بنود
- منع تسجيل دفعة أكبر من المسموح إلا بصلاحية

4. السرعة في الاستخدام

- shortcuts
- auto-focus
- keyboard-first interactions على الويب
- sticky totals
- sticky action bar
- auto-save draft

5. التجربة على الموبايل

- لو فيه mobile app أو responsive screens:
  - العميل أولًا
  - المنتجات بشكل سهل
  - الإجماليات واضحة
  - أزرار كبيرة
  - أقل كتابة ممكنة

========================================
خامسًا: Features مهمة جدًا أضيفها الآن
========================================

1. Repeat Last Invoice

- اختيار عميل
- استنساخ آخر فاتورة أو آخر 3 فواتير
- تعديل بسيط ثم حفظ

2. Customer-Specific Pricing

- حفظ سعر خاص لكل عميل/منتج
- اقتراح آخر سعر باع له

3. Favorite / Frequent Products

- منتجات مفضلة لكل عميل
- منتجات أكثر استخدامًا لكل شركة

4. Customer Account Snapshot

- يظهر داخل شاشة البيع فورًا

5. Faster Payment Recording

- من شاشة الفاتورة نفسها
- ومن شاشة العميل
- ومن شاشة مستقلة

6. Better Account Statement

- كشف حساب واضح وقابل للطباعة/المشاركة

7. Overdue Follow-up View

- شاشة للعملاء المتأخرين فقط
- مرتبة حسب المبلغ أو مدة التأخير

========================================
سادسًا: ما لا ننفذه الآن
========================================

- WhatsApp auto-ordering
- WhatsApp parsing
- Orders module منفصلة
- CRM عام
- Inbox محادثات
- AI extraction
- تعقيد قنوات البيع
- أي workflow يغير كيان الفاتورة الأساسي

========================================
سابعًا: الأولويات التنفيذية
========================================

Priority 1

- تحسين شاشة إنشاء الفاتورة
- customer snapshot داخل البيع
- product quick search
- repeat last invoice
- draft/approval flow واضح
- payment recording سريع

Priority 2

- customer-specific pricing
- overdue dashboard
- account statement improvements
- invoice list filters/actions
- audit trail improvements

Priority 3

- role permissions refinement
- performance tuning
- mobile UX improvements
- dashboard specialization by role

========================================
ثامنًا: تقسيم الموديولات عمليًا للفريق
========================================

Backend Modules

- invoices
- invoice-approvals
- customers
- customer-balances
- products
- pricing
- payments
- receivables
- statements
- dashboard
- audit
- permissions

Frontend Modules

- invoice-create
- invoice-list
- invoice-details
- customer-details
- customer-statement
- payment-entry
- receivables-dashboard
- reports-dashboard

========================================
تاسعًا: تعريف النجاح في المرحلة دي
========================================
نعتبر المرحلة نجحت لو:

- التاجر يقدر ينشئ فاتورة أسرع من النظام الحالي بوضوح
- الموظف يعرف رصيد العميل ومتأخراته قبل البيع فورًا
- تسجيل الدفعة يتم في خطوات أقل
- المتأخرات تبقى أوضح وأسهل متابعة
- الفاتورة Draft لا تؤثر ماليًا
- الفاتورة Approved فقط هي التي تدخل الحسابات
- المستخدم اليومي يحس أن السيستم أسرع وأسهل وليس أعقد

========================================
عاشرًا: الجملة النهائية للفريق
========================================
نحن لا نبني نظام واتساب أو Order management جديد الآن.
نحن نحسن النظام الحالي ليصبح أسرع وأقوى في:

- تسجيل البيع بعد الاتفاق
- إدارة حساب العميل أثناء البيع
- متابعة الآجل والتحصيل
- تحسين تجربة المستخدم اليومية للتاجر والموظف
