# Daftar (دفتر) — Phase 2 Growth Plan

> الخطة الثانية لتطوير المنصة — إضافة موديولات تزيد المبيعات وتحسن تجربة التاجر
> تاريخ الإنشاء: 2026-02-23

---

## الهدف من Phase 2

الـ Phase 1 بنى الأساس (حسابات + أطراف + دفتر الحركات + أقساط + بيع آجل).
الـ Phase 2 يحول التطبيق من **"دفتر ديون"** إلى **"نظام محاسبة متكامل"** يستحق اشتراك شهري.

```
Phase 1: من أين الديون؟
Phase 2: ما هي المصروفات؟ + إرسال فواتير + تحصيل أسرع + تحليلات
```

---

## Architecture Pattern (نفس Phase 1)

```
Controller → [Swagger Docs] → Service → Use Cases → Repository → Prisma
```

**Security Chain:**
```
Request → JwtAuthGuard → TenantGuard → PermissionsGuard → SubscriptionGuard → Controller
```

**i18n Pattern:**
- Backend: `this.t.translate('module.key')`
- Frontend: `useAppTranslation('module')`

**Atomic Operations:**
- كل عملية write داخل `prisma.$transaction()`
- AuditLog داخل نفس الـ transaction دائماً

---

## Prisma Schema Additions

> الجداول الجديدة المطلوبة في Phase 2

```prisma
// ── Expenses (المصروفات) ───────────────────────────────────────────────────

model Expense {
  id              String          @id @default(uuid())
  companyId       String
  company         Company         @relation(fields: [companyId], references: [id])

  amount          Decimal         @db.Decimal(12, 2)
  description     String
  category        ExpenseCategory
  expenseDate     DateTime        @db.Date
  referenceNumber String?         // رقم إيصال أو فاتورة مورد
  notes           String?

  // ربط اختياري بمورد
  supplierId      String?
  supplier        Supplier?       @relation(fields: [supplierId], references: [id])

  createdById     String
  createdBy       User            @relation(fields: [createdById], references: [id])

  isDeleted       Boolean         @default(false)
  deletedAt       DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([companyId, expenseDate])
  @@index([companyId, category])
  @@index([companyId, supplierId])
}

enum ExpenseCategory {
  RENT            // إيجار
  SALARIES        // رواتب موظفين
  UTILITIES       // فواتير كهرباء / مياه / إنترنت
  SUPPLIES        // مستلزمات وخامات
  TRANSPORTATION  // مواصلات ونقل
  MAINTENANCE     // صيانة
  MARKETING       // تسويق وإعلان
  TAXES           // ضرائب ورسوم حكومية
  OTHER           // متنوع
}

// ── Products / Services Catalog (كتالوج المنتجات) ─────────────────────────

model Product {
  id          String   @id @default(uuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  name        String
  description String?
  sku         String?  // كود المنتج (اختياري)
  category    String?  // تصنيف حر
  unit        String?  // قطعة / كيلو / متر / خدمة / etc.
  unitPrice   Decimal  @db.Decimal(12, 2)

  isActive    Boolean  @default(true)
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ربط بعناصر الفاتورة
  invoiceItems InvoiceItem[]

  @@index([companyId])
  @@unique([companyId, sku])
}

// ── Invoices (الفواتير) ────────────────────────────────────────────────────

model Invoice {
  id            String      @id @default(uuid())
  companyId     String
  company       Company     @relation(fields: [companyId], references: [id])
  invoiceNumber String      // INV-YYYY-NNNN (server-assigned)

  // المصدر: بيع آجل أو يدوي
  deferredSaleId String?    @unique
  deferredSale   DeferredSale? @relation(fields: [deferredSaleId], references: [id])

  // snapshot بيانات الطرف وقت الفاتورة
  partyType     PartyType
  partyId       String
  partyName     String
  partyPhone    String?
  partyAddress  String?

  items         InvoiceItem[]
  totalAmount   Decimal     @db.Decimal(12, 2)
  taxAmount     Decimal     @db.Decimal(12, 2) @default(0)
  notes         String?
  issueDate     DateTime    @db.Date

  createdById   String
  createdBy     User        @relation(fields: [createdById], references: [id])

  isDeleted     Boolean     @default(false)
  deletedAt     DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([companyId, issueDate])
  @@index([companyId, partyType, partyId])
}

model InvoiceItem {
  id          String   @id @default(uuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])

  // اختياري: من الكتالوج
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])

  description String
  quantity    Decimal  @db.Decimal(10, 3)
  unitPrice   Decimal  @db.Decimal(12, 2)
  total       Decimal  @db.Decimal(12, 2) // quantity * unitPrice

  @@index([invoiceId])
}

// ── Payment Reminders (تذكيرات السداد) ────────────────────────────────────
// إضافة حقل على الجداول الموجودة:
// DeferredSale   += lastRemindedAt  DateTime?
// InstallmentSchedule += lastRemindedAt DateTime?

// ── Future: Multi-Branch ───────────────────────────────────────────────────
// Phase O فقط — لا يُبنى الآن
// Branch يكون كيان تحت Company بـ branchId في كل جدول
```

---

## Phase I — Expenses Module (المصروفات) ✅ COMPLETED — 2026-02-23 (Backend + Frontend)

> أهم موديول — بيكمل الصورة المالية ويبرر رفع سعر الاشتراك

### I.1 — لماذا هذا الموديول أولاً؟

```
الآن: التاجر يشوف بس → ما على الناس له (المديونيات)
بعده: التاجر يشوف → مديونيات - مصروفات = صافي ربح تقريبي
```

### I.2 — Module Structure (Backend)

```
src/modules/expenses/
├── expenses.module.ts
├── expenses.controller.ts
├── expenses.service.ts
├── expenses.repository.ts
├── swagger/expenses.swagger.ts
├── dto/
│   ├── create-expense.dto.ts
│   ├── update-expense.dto.ts
│   ├── expense-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-expense.use-case.ts
    ├── list-expenses.use-case.ts
    ├── get-expense.use-case.ts
    ├── update-expense.use-case.ts
    ├── delete-expense.use-case.ts
    ├── get-expenses-summary.use-case.ts
    └── index.ts
```

### I.3 — APIs

| Method | Endpoint | الوصف | Permission |
|--------|----------|-------|------------|
| `POST` | `/expenses` | تسجيل مصروف جديد | `manageLedger` |
| `GET` | `/expenses` | قائمة المصروفات (pagination + فلتر) | `viewLedger` |
| `GET` | `/expenses/:id` | تفاصيل مصروف | `viewLedger` |
| `PATCH` | `/expenses/:id` | تعديل مصروف | `manageLedger` |
| `DELETE` | `/expenses/:id` | حذف مصروف (soft delete) | `manageLedger` |
| `GET` | `/expenses/summary` | ملخص المصروفات بالفئة + الشهر | `viewLedger` |

### I.4 — DTOs

```typescript
// create-expense.dto.ts
class CreateExpenseDto {
  @IsNumber()  @IsPositive()
  amount: number;

  @IsString()  @MaxLength(500)
  description: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsDateString()
  expenseDate: string; // YYYY-MM-DD

  @IsOptional() @IsString()
  referenceNumber?: string;

  @IsOptional() @IsUUID()
  supplierId?: string;

  @IsOptional() @IsString()
  notes?: string;
}

// expense-query.dto.ts (extends PaginationQueryDto)
class ExpenseQueryDto {
  category?: ExpenseCategory;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string; // يبحث في description + referenceNumber
}
```

### I.5 — Business Rules

- [ ] `prisma.$transaction()` لكل create/update/delete
- [ ] AuditLog مع كل عملية write
- [ ] مينفعش حذف مصروف بتاع شهر مقفول (Future: لو ضفنا period locking)
- [ ] Summary يحسب: إجمالي مصروفات + تفصيل بالفئة + مقارنة بالشهر السابق
- [ ] فلتر بالتاريخ، الفئة، المورد
- [ ] Tenant-scoped (companyId في كل استعلام)
- [ ] Permission: `viewLedger` للعرض، `manageLedger` للكتابة

### I.6 — Summary Response Shape

```typescript
interface ExpensesSummary {
  totalAmount: string;              // إجمالي المصروفات في الفترة
  previousPeriodAmount: string;     // الفترة السابقة للمقارنة
  changePercent: number;            // نسبة التغيير
  byCategory: {
    category: ExpenseCategory;
    amount: string;
    count: number;
    percentage: number;
  }[];
  byMonth: {
    month: string;                  // "YYYY-MM"
    amount: string;
  }[];
}
```

### I.7 — Frontend Tasks

```
src/types/expense.types.ts
src/api/endpoints/expenses.ts
src/hooks/useExpenses.ts
src/i18n/ar/expenses.json
src/i18n/en/expenses.json
src/components/expenses/ExpenseCard.tsx
src/components/expenses/ExpenseCategoryBadge.tsx
src/components/expenses/CreateExpenseForm.tsx
app/(app)/expenses.tsx                    ← شاشة رئيسية (قائمة + إضافة)
```

**شاشة Expenses:**
- Header: إجمالي المصروفات هذا الشهر (بطاقة حمراء)
- فلتر بالفئة (chip لكل category)
- قائمة مصروفات chronologically
- FAB: إضافة مصروف جديد
- Pull-to-refresh

### I.8 — Testing & Verification

- [ ] إنشاء مصروف يسجل في DB ويرجع البيانات صح
- [ ] Summary يحسب إجماليات صحيحة
- [ ] فلتر التاريخ والفئة يشتغل
- [ ] Soft delete يخفي المصروف من القوائم
- [ ] Staff بدون `manageLedger` يرجع 403 عند الإنشاء
- [ ] Swagger documentation كاملة

---

## Phase J — Products / Services Catalog (كتالوج المنتجات) ✅ COMPLETED — 2026-02-23 (Backend + Frontend)

> يسبق الفواتير لأن الفواتير بتستخدم المنتجات

### J.1 — لماذا هذا الموديول؟

```
الآن: التاجر بيكتب وصف البيع يدوياً في كل مرة
بعده: يختار من الكتالوج → السعر يتملأ تلقائياً → سرعة + دقة
```

### J.2 — Module Structure (Backend)

```
src/modules/products/
├── products.module.ts
├── products.controller.ts
├── products.service.ts
├── products.repository.ts
├── swagger/products.swagger.ts
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   ├── product-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-product.use-case.ts
    ├── list-products.use-case.ts
    ├── get-product.use-case.ts
    ├── update-product.use-case.ts
    ├── delete-product.use-case.ts
    └── index.ts
```

### J.3 — APIs

| Method | Endpoint | الوصف | Permission |
|--------|----------|-------|------------|
| `POST` | `/products` | إضافة منتج/خدمة | `manageParties` |
| `GET` | `/products` | قائمة المنتجات (search + category) | `viewParties` |
| `GET` | `/products/:id` | تفاصيل منتج | `viewParties` |
| `PATCH` | `/products/:id` | تعديل منتج | `manageParties` |
| `DELETE` | `/products/:id` | حذف منتج (soft delete) | `manageParties` |

### J.4 — DTOs

```typescript
// create-product.dto.ts
class CreateProductDto {
  @IsString() @MaxLength(200)
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString() @MaxLength(50)
  sku?: string; // كود المنتج

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString() @MaxLength(20)
  unit?: string; // قطعة / كيلو / متر

  @IsNumber() @IsPositive()
  unitPrice: number;
}
```

### J.5 — Business Rules

- [ ] SKU يجب أن يكون unique داخل نفس الـ company
- [ ] حذف المنتج لا يؤثر على الفواتير الموجودة (snapshot في InvoiceItem)
- [ ] تعطيل منتج (`isActive = false`) يخفيه من الكتالوج لكن لا يحذفه
- [ ] Tenant-scoped
- [ ] Check plan limit (maxProducts — للخطط المتقدمة)

### J.6 — Frontend Tasks

```
src/types/product.types.ts
src/api/endpoints/products.ts
src/hooks/useProducts.ts
src/i18n/ar/products.json
src/i18n/en/products.json
src/components/products/ProductCard.tsx
src/components/products/ProductPickerModal.tsx  ← مهم جداً للفواتير
app/(app)/products.tsx
```

**ProductPickerModal:**
- يُستخدم في شاشة إنشاء الفاتورة
- بحث live في الكتالوج
- عند الاختيار: يملأ الوصف + السعر تلقائياً

### J.7 — Testing & Verification

- [ ] SKU مكرر يرجع 409
- [ ] البحث بالاسم يعمل
- [ ] حذف منتج لا يكسر الفواتير القديمة
- [ ] Swagger documentation كاملة

---

## Phase K — Invoices Module (الفواتير) ⬅️ UP NEXT — BACKEND 🔴 TIER 1

> الموديول الذي يحول التطبيق إلى أداة تسويق مجانية

### K.1 — لماذا هذا الموديول؟

```
كل فاتورة بتتشير على WhatsApp = إعلان مجاني عن دفتر
التاجر بيعطي العميل إيصال رسمي = يبان احترافي
```

### K.2 — Module Structure (Backend)

```
src/modules/invoices/
├── invoices.module.ts
├── invoices.controller.ts
├── invoices.service.ts
├── invoices.repository.ts
├── swagger/invoices.swagger.ts
├── dto/
│   ├── create-invoice.dto.ts
│   ├── invoice-query.dto.ts
│   └── index.ts
└── use-cases/
    ├── create-invoice.use-case.ts
    ├── create-from-deferred-sale.use-case.ts  ← مهم
    ├── list-invoices.use-case.ts
    ├── get-invoice.use-case.ts
    ├── delete-invoice.use-case.ts
    └── index.ts
```

### K.3 — APIs

| Method | Endpoint | الوصف | Permission |
|--------|----------|-------|------------|
| `POST` | `/invoices` | إنشاء فاتورة يدوياً | `manageLedger` |
| `POST` | `/invoices/from-deferred-sale/:saleId` | توليد فاتورة من بيع آجل | `manageLedger` |
| `GET` | `/invoices` | قائمة الفواتير | `viewLedger` |
| `GET` | `/invoices/:id` | تفاصيل الفاتورة (مع بنود) | `viewLedger` |
| `DELETE` | `/invoices/:id` | إلغاء فاتورة (soft delete) | `manageLedger` |

### K.4 — Invoice Number Auto-Generation

```
INV-{YYYY}-{NNNN}
مثال: INV-2026-0001, INV-2026-0042

خوارزمية:
  SELECT MAX(sequence) FROM invoices WHERE companyId = $1 AND year = YEAR(NOW())
  invoiceNumber = `INV-${year}-${(max + 1).toString().padStart(4, '0')}`
  (داخل transaction لمنع race condition)
```

### K.5 — DTOs

```typescript
// create-invoice.dto.ts
class CreateInvoiceDto {
  @IsEnum(PartyType)
  partyType: PartyType;

  @IsUUID()
  partyId: string;

  @IsOptional() @IsString()
  partyAddress?: string;

  @IsArray() @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional() @IsNumber() @Min(0)
  taxAmount?: number; // ضريبة القيمة المضافة

  @IsOptional() @IsString()
  notes?: string;

  @IsDateString()
  issueDate: string;
}

class InvoiceItemDto {
  // ── الخيار الأول: اختيار من الكتالوج ──────────────────────────────────
  // المستخدم يختار منتج موجود → description + unitPrice يتملأوا تلقائياً
  // لكن ممكن يعدّلهم بعدين (السعر في الفاتورة مستقل عن سعر الكتالوج)
  @IsOptional() @IsUUID()
  productId?: string;

  // ── الخيار الثاني: كتابة يدوية (صنف مش موجود في الكتالوج) ─────────────
  // productId = null/undefined + description يُكتب يدوياً
  // مثال: "نقل بضاعة خارج المنطقة" — ما في داعي يسجله منتجاً دائماً
  @IsString() @MinLength(1) @MaxLength(500)
  description: string;

  @IsNumber() @IsPositive()
  quantity: number;

  @IsNumber() @Min(0)
  unitPrice: number;
}

// ── ملاحظة UX (Frontend): طريقتا إدخال البند ─────────────────────────────
//
//  [A] اختر من الكتالوج  ←  ProductPickerModal
//      • يملأ description + unitPrice تلقائياً
//      • يحفظ productId للربط التاريخي
//      • السعر قابل للتعديل (عرض خاص، خصم، إلخ)
//
//  [B] أدخل يدوياً
//      • description: حقل نصي حر
//      • unitPrice: حقل رقمي
//      • productId: لا يُرسَل
//
//  الـ Backend يقبل الاثنين — القرار كله في الـ Frontend
```

### K.6 — Business Rules

- [ ] `from-deferred-sale` يأخذ snapshot من البيع (لو الأسعار اتغيرت لاحقاً تفضل الفاتورة صح)
- [ ] InvoiceItem.total = quantity × unitPrice (مع validation server-side)
- [ ] Invoice.totalAmount = SUM(items[].total) + taxAmount
- [ ] إلغاء الفاتورة لا يؤثر على البيع الآجل نفسه
- [ ] **البند يقبل نوعين: (A) productId من الكتالوج أو (B) وصف يدوي — كلاهما صالح**
- [ ] لو productId موجود: التحقق من وجوده في نفس الـ company (tenant isolation)
- [ ] لو productId موجود: description + unitPrice في الـ DTO هي الـ snapshot المُرسَلة (لا يُجبَر على سعر الكتالوج)
- [ ] Tenant-scoped
- [ ] Auto-increment invoiceNumber داخل transaction

### K.7 — Frontend Tasks

```
src/types/invoice.types.ts
src/api/endpoints/invoices.ts
src/hooks/useInvoices.ts
src/i18n/ar/invoices.json
src/i18n/en/invoices.json
src/components/invoices/InvoiceCard.tsx
src/components/invoices/InvoiceItemRow.tsx    ← صف بند واحد (اختيار / يدوي)
src/components/invoices/InvoicePreview.tsx    ← عرض الفاتورة كاملة
src/components/invoices/CreateInvoiceForm.tsx
app/(app)/invoices.tsx
app/(app)/invoices/[id].tsx                   ← تفاصيل + Share
```

**InvoiceItemRow — بند الفاتورة (مهم):**

الـ UX بسيط ومباشر — حقل نصي واحد للوصف:
- المستخدم يكتب بحرية تامة (أي نص)
- أثناء الكتابة تظهر اقتراحات من الكتالوج تحت الحقل (typeahead)
- لو ضغط على اقتراح: الوصف + السعر يتملأوا تلقائياً ويُحفَظ productId
- لو كمّل يكتب بدون ما يختار: يبعت بدون productId (فري تكست عادي)
- مفيش toggle، مفيش خيار مستقل — نفس الحقل لكل الحالتين

```
┌─────────────────────────────────────────────────────┐
│  البند #1                               [حذف ✕]     │
│                                                     │
│  الوصف: [كيس أرز 50 كيلو____________]              │
│          ┌──────────────────────────┐               │
│          │ كيس أرز 50 كيلو          │  ← اقتراح    │
│          │    350.00 ج.م / كيلو    │    من الكتالوج │
│          ├──────────────────────────┤               │
│          │ كيس أرز 25 كيلو          │               │
│          └──────────────────────────┘               │
│                                                     │
│  السعر: [350.00]    الكمية: [2]                     │
│  الإجمالي: 700.00 ج.م                               │
└─────────────────────────────────────────────────────┘

--- أو لو كتب صنف مش موجود في الكتالوج ---

┌─────────────────────────────────────────────────────┐
│  البند #2                               [حذف ✕]     │
│                                                     │
│  الوصف: [شحن بضاعة للإسكندرية________]             │  ← فري تكست مباشر
│          (لا تظهر اقتراحات)                         │
│                                                     │
│  السعر: [200.00]    الكمية: [1]                     │
│  الإجمالي: 200.00 ج.م                               │
└─────────────────────────────────────────────────────┘
```

**Logic في الـ Frontend:**
```typescript
// لما المستخدم يكتب في حقل الوصف:
// 1. ابعت search للكتالوج (debounced 300ms, isActive=true)
// 2. لو في نتايج → اعرضها في dropdown تحت الحقل
// 3. لو اختار نتيجة → امسح الـ dropdown واملأ السعر + احفظ productId داخلياً
// 4. لو عدّل الوصف بعد الاختيار → امسح productId (بقى فري تكست)
// 5. لو مفيش نتايج أو ما اختارش → ابعت productId: undefined

interface LineItem {
  productId?: string;      // موجود بس لو اختار من الكتالوج
  description: string;     // دايماً موجود
  unitPrice: number;
  quantity: number;
}
```

**CreateInvoiceForm — شاشة إنشاء الفاتورة:**
- اختيار الطرف (Customer / Supplier)
- قائمة البنود — زرار "إضافة بند" يضيف InvoiceItemRow جديد
- كل بند: حقل وصف واحد مع typeahead من الكتالوج
- إجمالي الفاتورة يُحسَب live
- حقل الضريبة (اختياري)
- ملاحظات + تاريخ الإصدار

**InvoicePreview Screen (الأهم):**
- عرض الفاتورة بشكل بصري جميل (مثل فاتورة حقيقية)
- اسم الشركة + شعار (إن وجد)
- بيانات العميل + بنود الفاتورة
- الإجمالي + الضريبة
- زرار **Share** → `react-native-view-shot` يأخذ screenshot → يشار عبر WhatsApp

```typescript
// مثال Share:
await captureRef(invoiceRef, { format: 'png', quality: 0.9 });
await Share.share({ url: imageUri, message: `فاتورة رقم ${invoice.invoiceNumber}` });
```

### K.8 — Testing & Verification

- [ ] رقم الفاتورة يتولد صح بدون تكرار
- [ ] `from-deferred-sale` يأخذ snapshot صح
- [ ] إجمالي الفاتورة = مجموع البنود + الضريبة
- [ ] Share يعمل على Android + iOS
- [ ] Swagger documentation كاملة

---

## Phase L — Payment Reminders (تذكيرات السداد) 🔴 TIER 1

> ROI مباشر: التاجر يحصّل فلوسه أسرع بسبب الـ app

### L.1 — لماذا هذا الموديول؟

```
المشكلة: التاجر بينسى يطالب العميل المتأخر
الحل:    الـ app يذكّره بـ push notification
         + زرار "أرسل تذكير WhatsApp" بضغطة واحدة
```

### L.2 — Backend Changes

**لا module جديد كامل — تعديلات على الموجود:**

```typescript
// Prisma: إضافة للجداول الموجودة
// DeferredSale += lastRemindedAt DateTime?
// InstallmentSchedule += lastRemindedAt DateTime?
```

**Endpoints جديدة في modules موجودة:**

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/deferred-sales/:id/remind` | تسجيل إرسال تذكير (يحدّث lastRemindedAt) |
| `POST` | `/installments/:contractId/schedules/:scheduleId/remind` | نفس الفكرة للأقساط |
| `GET` | `/reports/reminder-candidates` | قائمة المتأخرين الذين لم يُذكَّروا منذ 3 أيام |

### L.3 — Business Rules

- [ ] `lastRemindedAt` يتحدث عند كل ضغطة "أرسل تذكير"
- [ ] `reminder-candidates`: متأخرون + (`lastRemindedAt` null أو أكتر من 3 أيام)
- [ ] Push Notification: كل يوم الصبح الـ server يرسل للـ owner: "عندك X عميل متأخر اليوم"
- [ ] WhatsApp template message يتولد من البيانات الموجودة

### L.4 — WhatsApp Deep Link (Frontend)

```typescript
function generateWhatsAppReminder(params: {
  phone: string;
  partyName: string;
  amount: string;
  referenceNumber: string;
  companyName: string;
}): string {
  const msg = encodeURIComponent(
    `السلام عليكم يا ${params.partyName}،\n` +
    `نذكركم بوجود مبلغ مستحق قدره ${params.amount} ج.م.\n` +
    `رقم المرجع: ${params.referenceNumber}\n` +
    `نرجو السداد في أقرب وقت ممكن.\n` +
    `شكراً لتعاملكم مع ${params.companyName}`
  );
  return `https://wa.me/+2${params.phone.replace(/^0/, '')}?text=${msg}`;
}

// الاستخدام:
Linking.openURL(generateWhatsAppReminder({ ... }));
```

### L.5 — Frontend Tasks

```
src/hooks/useReminders.ts              ← mutate remind + fetch candidates
src/components/reminders/
  ├── RemindButton.tsx                 ← زرار "أرسل تذكير" (يُستخدم في عدة شاشات)
  └── ReminderCandidatesList.tsx
app/(app)/reminders.tsx               ← شاشة "المتأخرون اليوم"
```

**RemindButton Component:**
```tsx
<RemindButton
  phone={customer.phone}
  partyName={customer.fullName}
  amount={sale.remainingAmount}
  referenceNumber={sale.referenceNumber}
  companyName={user.companyName}
  onRemindSent={() => markReadMutation.mutate(sale.id)}
/>
```

يفتح WhatsApp مباشرةً + يسجل `lastRemindedAt` في الـ backend.

### L.6 — Push Notification Job (Backend)

```typescript
// Cron Job — يشتغل كل يوم الساعة 9 صباحاً
@Cron('0 9 * * *')
async sendDailyOverdueReminders() {
  // لكل company نشطة:
  //   count overdue items
  //   لو count > 0: send push notification لكل owner في الشركة
  //   Title: "لديك X مستحقات متأخرة"
  //   Body: "افتح دفتر لمراجعة قائمة المتأخرين"
}
```

### L.7 — Testing & Verification

- [ ] `lastRemindedAt` يتحدث عند الضغط على "أرسل تذكير"
- [ ] WhatsApp يفتح بالرسالة الصحيحة
- [ ] Cron job يرسل push notifications صح
- [ ] `reminder-candidates` يستثني المُذكَّرين حديثاً (أقل من 3 أيام)

---

## Phase M — Advanced Dashboard Analytics (تحليلات متقدمة) 🟡 TIER 2

> يخلي الـ app يبان احترافي + يعطي التاجر insights حقيقية

### M.1 — لماذا هذا الموديول؟

```
الآن: Dashboard فيه أرقام ثابتة بس
بعده: رسوم بيانية → التاجر يفهم تريند عمله
```

### M.2 — Backend: Endpoints جديدة في Reports Module

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/reports/monthly-collection?months=6` | تحصيل شهري (آخر N شهور) |
| `GET` | `/reports/top-debtors?limit=5` | أعلى 5 مديونين |
| `GET` | `/reports/net-position` | صافي المركز المالي (مديونيات − مصروفات) |
| `GET` | `/reports/collection-rate` | نسبة التحصيل هذا الشهر vs الشهر الماضي |

### M.3 — Response Shapes

```typescript
// monthly-collection
interface MonthlyCollection {
  months: {
    month: string;        // "2026-01"
    label: string;        // "يناير 2026"
    collected: string;    // ما تم تحصيله
    newDebts: string;     // ما نشأ من ديون جديدة
    expenses: string;     // المصروفات (لو Phase I مكتمل)
  }[];
}

// top-debtors
interface TopDebtor {
  partyId: string;
  partyType: PartyType;
  partyName: string;
  partyPhone: string | null;
  totalBalance: string;
  overdueAmount: string;
}

// net-position
interface NetPosition {
  totalReceivables: string;
  totalExpenses: string;    // للفترة المحددة
  netPosition: string;      // receivables - expenses
  collectionRate: number;   // نسبة مئوية
}
```

### M.4 — Frontend Tasks

**مكتبة الرسوم البيانية:**
```bash
npx expo install victory-native
# أو
npx expo install react-native-gifted-charts
```

```
src/hooks/useAnalytics.ts
src/components/charts/
  ├── MonthlyBarChart.tsx        ← تحصيل شهري
  ├── TopDebtorsList.tsx         ← أعلى 5 مديونين
  └── CollectionRateGauge.tsx    ← مقياس نسبة التحصيل
app/(app)/analytics.tsx          ← شاشة التحليلات
```

**Dashboard Enhancement:**
- إضافة "Quick Analytics" section في الـ Home screen
- Mini bar chart للتحصيل الشهري (آخر 3 شهور)
- زرار "عرض التفاصيل" → analytics screen

### M.5 — Testing & Verification

- [ ] monthly-collection يرجع بيانات صحيحة للأشهر الماضية
- [ ] top-debtors مرتبين تنازلياً بالمديونية
- [ ] Charts تظهر صح على Android + iOS
- [ ] الأداء مقبول (لا تزيد استجابة عن 2 ثانية للـ charts)

---

## Phase N — Audit Log Module (سجل العمليات) 🟡 TIER 2

> كان مخطط له في Phase 1 (Phase G) ولم يُبنَ بعد

### N.1 — لماذا الآن؟

الـ AuditLog موجود كـ table في الـ DB ويُكتب في كل transaction.
المطلوب فقط: إنشاء module يقرأه ويعرضه للـ Owner.

### N.2 — Module Structure

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

### N.3 — APIs

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/audit` | سجل العمليات (pagination + filter) |
| `GET` | `/audit/:id` | تفاصيل عملية |

### N.4 — Query Filters

```typescript
class AuditQueryDto extends PaginationQueryDto {
  action?: string;           // CREATE / UPDATE / DELETE / PAYMENT
  entityType?: string;       // DeferredSale / Expense / Customer ...
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

### N.5 — Business Rules

- [ ] OWNER فقط (لا Staff)
- [ ] Read-only — لا حذف ولا تعديل
- [ ] Tenant-scoped
- [ ] Indexed على (companyId, createdAt)

### N.6 — Frontend Tasks

```
app/(app)/audit.tsx     ← شاشة سجل العمليات (في settings)
```

---

## Phase O — Zakat Calculator (حاسبة الزكاة) 🟢 TIER 3

> فيتشر فريد في السوق العربي

### O.1 — الفكرة

```
الزكاة = 2.5% من الأصول الزكوية
الأصول الزكوية للتاجر = المخزون + المديونيات التجارية
المصدر: البيانات الموجودة في دفتر
```

### O.2 — لا Backend جديد مطلوب

الحساب يتم بالكامل في الـ frontend باستخدام بيانات الـ Reports Summary:

```typescript
function calculateZakat(params: {
  totalReceivables: number;  // من /reports/summary
  totalExpenses: number;     // مصروفات مستحقة (ديون على الشركة)
  inventoryValue?: number;   // المستخدم يدخله يدوياً
  nisabValue: number;        // سعر 85 جرام ذهب (المستخدم يدخله)
}): ZakatResult {
  const zakatable = params.totalReceivables
                  - params.totalExpenses
                  + (params.inventoryValue ?? 0);

  const isAboveNisab = zakatable >= params.nisabValue;
  const zakatAmount = isAboveNisab ? zakatable * 0.025 : 0;

  return { zakatable, isAboveNisab, zakatAmount, nisabValue: params.nisabValue };
}
```

### O.3 — Frontend Tasks

```
src/components/zakat/ZakatCalculator.tsx   ← component قابل للتضمين
app/(app)/zakat.tsx                         ← شاشة منفصلة
```

**شاشة الزكاة:**
- إجمالي المديونيات (من Reports - تلقائي)
- مصروفات مستحقة (من Expenses - تلقائي)
- قيمة المخزون (يدخله المستخدم يدوياً)
- سعر النصاب الحالي (يدخله يدوياً أو يُجلب من API خارجية)
- النتيجة: الوعاء الزكوي + هل بلغ النصاب؟ + مقدار الزكاة

---

## Phase P — Multi-Branch Support (الفروع المتعددة) 🟢 TIER 3 — Enterprise

> للتجار الكبار الذين لديهم أكتر من فرع أو محل

### P.1 — الفكرة

```
Company (المالك) → Branch 1 (فرع الزيتون)
                 → Branch 2 (فرع المعادي)
                 → Branch 3 (فرع المنصورة)
```

### P.2 — Schema Change (ضخم)

```prisma
model Branch {
  id        String   @id @default(uuid())
  companyId String
  company   Company  @relation(...)
  name      String
  address   String?
  phone     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// إضافة branchId? لكل الجداول الموجودة:
// Customer, Supplier, Employee, Ledger, DeferredSale, Expense, Invoice
```

### P.3 — Business Rules

- [ ] OWNER يدير كل الفروع
- [ ] Staff مربوط بفرع محدد
- [ ] التقارير يمكن تصفيتها بالفرع
- [ ] الفاتورة تحمل اسم الفرع
- [ ] هذا يتطلب migration ضخم على كل الجداول

### P.4 — متى يُبنى؟

```
لا يُبنى إلا بعد:
1. وجود 3+ عملاء يطلبون هذا الفيتشر
2. رفع سعر الـ Enterprise Plan
3. قرار واضح بالـ branchId schema
```

---

## Progress Summary

| Phase | الموديول | الـ Tier | الحالة | الأهمية |
|-------|---------|---------|--------|---------|
| **I** | Expenses — المصروفات | 🔴 Tier 1 | ✅ Backend + Frontend (2026-02-23) | يكمل الصورة المالية |
| **J** | Products Catalog — كتالوج المنتجات | 🟡 Tier 2 | ✅ Backend + Frontend (2026-02-23) | يُسرّع الفواتير |
| **K** | Invoices — الفواتير | 🔴 Tier 1 | ✅ Backend (2026-02-23) — ⬅️ Frontend Next | تسويق فيروسي |
| **L** | Payment Reminders — تذكيرات السداد | 🔴 Tier 1 | ⬜ Not Started | ROI مباشر |
| **M** | Advanced Analytics — تحليلات | 🟡 Tier 2 | ⬜ Not Started | Retention |
| **N** | Audit Log — سجل العمليات | 🟡 Tier 2 | ⬜ Not Started | كان في PLAN.md |
| **O** | Zakat Calculator — حاسبة الزكاة | 🟢 Tier 3 | ⬜ Not Started | تميز في السوق |
| **P** | Multi-Branch — الفروع | 🟢 Tier 3 | ⬜ Not Started | Enterprise |

### Status Legend

- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- 🔴 Blocked

---

## Build Order (الترتيب الأمثل)

```
الأسبوع 1: Phase I  → Expenses
           └─ Backend: model + 6 endpoints + i18n
           └─ Frontend: screen + form + hooks

الأسبوع 2: Phase J  → Products Catalog
           └─ Backend: model + 5 endpoints
           └─ Frontend: screen + ProductPickerModal

الأسبوع 3: Phase K  → Invoices
           └─ Backend: model + 5 endpoints + auto-number
           └─ Frontend: InvoicePreview + Share (حجر الزاوية)

الأسبوع 4: Phase L  → Payment Reminders
           └─ Backend: 2 endpoints جديدة + Cron Job
           └─ Frontend: RemindButton + WhatsApp deep link

الأسبوع 5: Phase M  → Advanced Analytics
           └─ Backend: 4 endpoints جديدة في reports
           └─ Frontend: Charts + Analytics screen

الأسبوع 6: Phase N  → Audit Log
           └─ Backend: 2 endpoints
           └─ Frontend: Audit screen في settings

مستقبل:   Phase O  → Zakat (frontend only)
           Phase P  → Multi-Branch (بعد قرار العملاء)
```

---

## Subscription Tiers Recommendation

```
┌────────────────────────────────────────────────────────────────┐
│  FREE TRIAL   │ كل الفيتشرات 14 يوم                            │
├────────────────────────────────────────────────────────────────┤
│  STARTER      │ Ledger + Customers(50) + Suppliers + Reports    │
│  (مجاني بعد) │                                                  │
├────────────────────────────────────────────────────────────────┤
│  PRO          │ + Deferred Sales + Installments + Expenses      │
│               │ + Products(100) + Payment Reminders             │
├────────────────────────────────────────────────────────────────┤
│  BUSINESS     │ + Invoices + Advanced Analytics + Audit Log     │
│               │ + Zakat + Unlimited Products + Priority Support │
├────────────────────────────────────────────────────────────────┤
│  ENTERPRISE   │ + Multi-Branch + Custom Reports + API Access    │
│               │ + Dedicated Account Manager                     │
└────────────────────────────────────────────────────────────────┘
```

---

## Definition of Done — Phase 2

- [ ] **Expenses:** التاجر يسجل مصروفاته ويشوف صافي مركزه المالي
- [ ] **Products:** يختار من الكتالوج بدل الكتابة اليدوية
- [ ] **Invoices:** يولد فاتورة ويشاركها WhatsApp في أقل من 30 ثانية
- [ ] **Reminders:** يضغط زرار واحد يفتح WhatsApp برسالة جاهزة
- [ ] **Analytics:** يشوف تريند تحصيله آخر 6 شهور
- [ ] **Audit:** Owner يعرف مين عمل إيه ومتى
- [ ] كل الـ APIs مترجمة (عربي + إنجليزي)
- [ ] كل الـ APIs documented في Swagger
- [ ] لا يوجد تسريب بيانات بين الشركات (companyId enforced)
- [ ] Atomic transactions لكل عملية write
