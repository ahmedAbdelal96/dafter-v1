# خطة التنفيذ — Daftar Enhancement Plan
> آخر تحديث: 2026-03-13
> الهدف: تحويل النظام إلى أسرع وأوضح تجربة بيع وتحصيل للتاجر/الموظف

---

## القاعدة: كيف نقرأ هذه القائمة

- `[ ]` = لم يُبدأ بعد
- `[~]` = قيد التنفيذ
- `[x]` = مكتمل ومُختبر

---

---

# 🟥 PRIORITY 1 — الأهم والأعجل

---

## P1-BE-1 — Invoice Workflow (حالات الفاتورة + الأثر المالي)

> الفاتورة DRAFT/PENDING لا تؤثر ماليًا — الأثر فقط عند APPROVED

- [x] **B1.1** إضافة Enum الحالات على موديل Invoice في Prisma schema:
  `DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | CANCELLED`
- [x] **B1.2** migration قاعدة البيانات — defaultValue: `DRAFT`
- [x] **B1.3** منع AuditLog / LedgerEntry من التسجيل إلا عند انتقال → `APPROVED`
- [x] **B1.4** endpoint: `PATCH /invoices/:id/approve` → يُنفذ الأثر المالي
- [x] **B1.5** endpoint: `PATCH /invoices/:id/reject` → بدون أثر مالي
- [x] **B1.6** endpoint: `PATCH /invoices/:id/cancel` → يعكس الأثر لو كانت APPROVED
- [x] **B1.7** validation rules: منع approve/reject على CANCELLED/REJECTED
- [x] **B1.8** تحديث CreateInvoice ليبدأ بحالة DRAFT تلقائيًا
- [x] **B1.9** تحديث القيود المالية: فقط APPROVED تدخل ledger/balances
- [x] **B1.bonus** endpoint: `PATCH /invoices/:id/submit` → DRAFT→PENDING_APPROVAL

---

## P1-BE-2 — Customer Snapshot Endpoint

> endpoint سريع يُرجع ملخص العميل أثناء البيع

- [x] **B2.1** `GET /customers/:id/snapshot` يُرجع:
  - `currentBalance` (رصيد من ledger)
  - `overdueAmount` (مجموع الفواتير المتأخرة)
  - `lastInvoiceDate`
  - `lastPaymentDate`
  - `openInvoicesCount`
  - `defaultPaymentType`
- [x] **B2.2** index على `customerId + status` في جدول Invoice
- [x] **B2.3** index على `customerId + dueDate` للـoverdue calculation (+ dueDate field added)
- [x] **B2.4** cache 2 دقيقة للـsnapshot (invalidate عند أي حركة)

---

## P1-BE-3 — Product Quick Search API

- [x] **B3.1** `GET /products/search?q=&limit=10` — بحث بالاسم/SKU/code (debounced-ready)
- [x] **B3.2** `GET /customers/:id/frequent-products?limit=8` — المنتجات الأكثر تكرارًا لعميل معين
- [x] **B3.3** `GET /products/recent?limit=10` — المستخدمة حديثًا للشركة
- [x] **B3.4** `GET /products/:id/last-price?customerId=` — آخر سعر بيع لمنتج لعميل
- [x] **B3.5** index فهرسة على `product.name` + `product.sku`

---

## P1-BE-4 — Repeat Last Invoice API

- [x] **B4.1** `POST /invoices/duplicate/:invoiceId` — استنساخ فاتورة كـDRAFT جديدة
- [x] **B4.2** `GET /invoices/customer/:id/last?limit=3` — آخر 3 فواتير للعميل
- [x] **B4.3** الـDuplicate لا يستنسخ الحالة (يبدأ DRAFT دائمًا)
- [x] **B4.4** الـDuplicate لا يستنسخ التواريخ (يأخذ today كـinvoiceDate)

---

## P1-BE-5 — Fast Payment Recording

- [x] **B5.1** `POST /payments` — تسجيل دفعة مستقلة عن الفاتورة (على العميل)
- [x] **B5.2** `POST /invoices/:id/payments` — دفعة مباشرة على فاتورة بعينها
- [x] **B5.3** `POST /payments/distribute` — توزيع دفعة على عدة فواتير:
  - تقبل `{ customerId, amount, invoiceIds[] }` أو auto-distribute على الأقدم
- [x] **B5.4** validation: منع دفعة أكبر من المتبقي إلا بـpermission
- [x] **B5.5** $transaction يشمل: Payment record + Ledger entry + balance update

---

## P1-FE-1 — شاشة إنشاء الفاتورة (Mobile)

> هدف: أقل عدد خطوات ممكن

- [x] **F1.1** Customer picker → عند الاختيار يظهر Customer Snapshot card فورًا
- [x] **F1.2** Snapshot card يعرض: رصيد / متأخرات / آخر عملية / تحذير إن وجد
- [x] **F1.3** Product search — typeahead مع debounce 300ms — يبحث بالاسم/SKU
- [x] **F1.4** قسم "المنتجات المتكررة لهذا العميل" (top 6) تحت search bar
- [x] **F1.5** inline edit الكمية + السعر + الخصم بدون navigation
- [x] **F1.6** sticky total bar في أسفل الشاشة
- [x] **F1.7** زر "حفظ مسودة" → يحفظ كـDRAFT بدون أثر مالي
- [x] **F1.8** زر "اعتماد" → يرسل للـapprove (PATCH approve) مع confirm modal
- [x] **F1.9** زر "تكرار آخر فاتورة" → يفتح modal فيه آخر 3 فواتير للاختيار

---

## P1-FE-2 — Invoice Status Workflow (Frontend)

- [x] **F2.1** Invoice card تعرض status badge بألوان واضحة:
  - DRAFT = grey, PENDING = amber, APPROVED = green, REJECTED = red, CANCELLED = muted
- [x] **F2.2** Quick action buttons حسب الحالة:
  - DRAFT → [اعتماد] [رفض] [حذف]
  - PENDING → [موافقة] [رفض]
  - APPROVED → [تسجيل دفعة] [إلغاء]
- [x] **F2.3** منع ظهور زر "اعتماد" لمن ليس لديه permission
- [x] **F2.4** Confirm dialog قبل Approve/Reject/Cancel

---

---

# 🟧 PRIORITY 2 — مهم ويُنفذ بعد P1

---

## P2-BE-1 — Customer-Specific Pricing

- [x] **B6.1** جدول `CustomerProductPrice { customerId, productId, price, updatedAt }`
- [x] **B6.2** migration + Prisma schema
- [x] **B6.3** `GET /pricing/customer/:customerId/product/:productId` — سعر خاص أو last sold price
- [x] **B6.4** `PUT /pricing/customer/:customerId/product/:productId` — حفظ سعر خاص
- [x] **B6.5** invoice create يقترح CustomerProductPrice إن وجد (PricingRepository.resolveSuggestedPrice)

---

## P2-BE-2 — Overdue & Receivables Dashboard API

- [x] **B7.1** `GET /dashboard/receivables` يُرجع:
  - `totalReceivables`
  - `overdueAmount`
  - `dueToday`
  - `dueThisWeek`
  - `overdueCustomersCount`
- [x] **B7.2** `GET /customers/overdue?sort=amount|age&limit=20` — قائمة المتأخرين
- [x] **B7.3** overdue classification: `< 7 days | 7-30 | 30-90 | > 90`

---

## P2-BE-3 — Account Statement (تحسين كشف الحساب)

- [x] **B8.1** `GET /statements/:customerId` يُرجع:
  - رصيد افتتاحي
  - transactions مرتبة chronologically
  - رصيد ختامي
  - overdue flag لكل entry
- [x] **B8.2** دعم date range filter
- [x] **B8.3** تنسيق قابل للمشاركة (JSON كافٍ، الـShare على الموبايل يعرضه)

---

## P2-BE-4 — Invoice List Filters تحسين

- [x] **B9.1** filter بـ: `status[]`, `customerId`, `dateFrom`, `dateTo`, `paymentStatus`, `deferredOnly`
- [x] **B9.2** default sort: `invoiceDate DESC`
- [x] **B9.3** pagination بـ cursor أو page/limit

---

## P2-FE-1 — Customer Detail Screen تحسين

- [x] **F3.1** Summary card تعرض: total purchases / outstanding / overdue / last invoice
- [x] **F3.2** Tabs: فواتير | دفعات | كشف حساب | آجل
- [x] **F3.3** زر سريع "إنشاء فاتورة" يفتح CreateInvoice مع العميل محدد مسبقًا
- [x] **F3.4** زر سريع "تسجيل دفعة"
- [x] **F3.5** payment behavior indicator

---

## P2-FE-2 — شاشة التحصيل / الدفعات

- [x] **F4.1** شاشة مستقلة "تسجيل دفعة"
- [x] **F4.2** اختيار العميل → يظهر الفواتير المفتوحة مع المبالغ
- [x] **F4.3** اقتراح توزيع تلقائي (FIFO — الأقدم أولًا)
- [x] **F4.4** إمكانية التعديل اليدوي لكل فاتورة
- [x] **F4.5** "المتبقي بعد التوزيع" يظهر live
- [x] **F4.6** تأكيد وحفظ → invalidate قائمة الفواتير + رصيد العميل

---

## P2-FE-3 — Invoice List Filters (Mobile)

- [x] **F5.1** Filter chips: كل | مسودة | معلقة | معتمدة | غير مدفوعة | جزئية | مدفوعة
- [x] **F5.2** Date range filter (dateFrom / dateTo text inputs)
- [x] **F5.3** Customer search filter

---

---

# 🟨 PRIORITY 3 — تحسينات إضافية

---

## P3-BE-1 — Audit Trail تحسين

- [x] **B10.1** AuditLog يحتوي على: `actorId, action, entity, entityId, diff(JSON), timestamp`
- [x] **B10.2** تسجيل diff للسعر والخصم عند التعديل
- [x] **B10.3** `GET /audit?entity=Invoice&entityId=:id` — لو أراد صلاحية المشاهدة

---

## P3-BE-2 — Permissions Refinement

- [x] **B11.1** إضافة permissions جديدة في `StaffPermission` enum:
  `createInvoice | editDraft | approveInvoice | rejectInvoice | recordPayment | viewCustomerBalances`
- [x] **B11.2** ربط الـpermissions بالـendpoints الجديدة
- [x] **B11.3** OwnerGuard يبقى كما هو (OWNER يملك كل شيء)

---

## P3-BE-3 — Performance & Indexing

- [x] **B12.1** Index: `Invoice(companyId, status)`
- [x] **B12.2** Index: `Invoice(companyId, customerId, invoiceDate)`
- [x] **B12.3** Index: `Invoice(companyId, dueDate)` للـoverdue queries
- [x] **B12.4** Index: `InvoiceItem(productId)` للـfrequent products
- [x] **B12.5** مراجعة N+1 queries في invoice list endpoint

---

## P3-FE-1 — Dashboard تحسين (Mobile)

- [x] **F6.1** إضافة cards: مبيعات اليوم / تحصيل اليوم / فواتير معلقة / متأخرون
- [x] **F6.2** قائمة "أكثر العملاء تأخرًا" (top 5)
- [x] **F6.3** CTAs سريعة: [إنشاء فاتورة] [تسجيل دفعة] [عرض المتأخرات]

---

## P3-FE-2 — UX تحسينات عامة (Mobile)

- [x] **F7.1** auto-focus على أول field في كل form
- [x] **F7.2** تحذير عند اختيار عميل عليه متأخرات (Snapshot warning) — مُنفَّذ في CustomerSnapshotCard
- [x] **F7.3** تحذير عند إضافة منتج بسعر صفر
- [x] **F7.4** منع submit فاتورة بدون بنود — validate() يمنع الإرسال ويعرض الخطأ
- [x] **F7.5** sticky action bar في شاشة إنشاء الفاتورة

---

---

# 📊 ملخص العمل

| المرحلة | Backend Tasks | Frontend Tasks | الحالة |
|---------|--------------|----------------|--------|
| P1 | B1→B5 (24 بند) | F1→F2 (13 بند) | `[x]` مكتمل |
| P2 | B6→B9 (16 بند) | F3→F5 (15 بند) | `[x]` مكتمل |
| P3 | B10→B12 (11 بند) | F6→F7 (8 بند) | `[x]` مكتمل |

---

# 🚫 خارج النطاق (لا نلمسه الآن)

- WhatsApp integration
- Orders module منفصلة
- CRM / Inbox
- AI extraction
- أي workflow يغير كيان Invoice الأساسي

---

# ✅ تعريف النجاح

- [ ] التاجر ينشئ فاتورة بنصف الخطوات الحالية
- [ ] الموظف يرى رصيد العميل ومتأخراته قبل البيع فورًا
- [ ] تسجيل الدفعة في 3 خطوات أو أقل
- [ ] الفاتورة DRAFT لا تُدخل أي قيود في الحسابات
- [ ] الفاتورة APPROVED فقط تُنفذ الأثر المالي

---

## Execution Update � 2026-03-17 (Launch-Readiness Track)

### Completed tickets (current wave)
- [x] T1: added `API_ENDPOINTS.platform.changePlan`
- [x] T2: added `platformApi.changePlan()`
- [x] T3: added `useChangePlatformSubscriptionPlan()`
- [x] T4: rewired platform subscriptions UI to dedicated change-plan mutation
- [x] T5: removed legacy roles from `src/config/rbac.ts`
- [x] T6: removed legacy roles from `src/config/route-access.ts` and `src/stores/auth-store.ts`
- [x] T7: moved active platform user/audit flows to domain types file `src/lib/api/types/platform.ts`
- [x] T8: added role contract gate script `scripts/check-role-contracts.mjs`
- [x] T9: removed tenant settings placeholder exposure from active nav + route redirects to dashboard
- [x] T10: deprecated legacy settings surface from public exports
- [x] T11: added explicit controller policy manifest in backend
- [x] T12: added backend enforcement test + CI check script for policy manifest
- [x] T13: added launch gate CI checks for contract/role/policy (web + api workflows)

### Active launch gates
- Web contract gate: `npm run contracts:check` (dafter-dashboard)
- Web role gate: `npm run roles:check` (dafter-dashboard)
- API policy gate: `npm run ci:check:feature-policy` (dafter-api-v1)
- API invariant gate: `npm run ci:check:subscription-invariant` (dafter-api-v1)

### Verification commands
- Web:
  - `cd dafter-dashboard`
  - `npm run contracts:check`
  - `npm run roles:check`
  - `npm run lint`
  - `npm run build`
- API:
  - `cd dafter-api-v1`
  - `npm run ci:check:feature-policy`
  - `npm run ci:check:subscription-invariant`
  - `npm run test -- feature-policy.manifest.spec.ts`

### Known unrelated blocker (not part of these tickets)
- Web build/type is still partially blocked by pre-existing issue:
  - `src/features/platform-users/components/UserResetCredentialsModal.tsx:77`
  - `Property 'id' does not exist on type 'TextareaProps'`
