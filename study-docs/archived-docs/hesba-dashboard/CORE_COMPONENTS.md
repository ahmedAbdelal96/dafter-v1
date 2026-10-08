# ✅ Core Components - المكونات الأساسية

تم إنشاء جميع المكونات الأساسية اللازمة قبل البدء في بناء الصفحات.

---

## 📁 الملفات المُنشأة

### 1. **Error Handling** - معالجة الأخطاء

#### `src/components/common/ErrorBoundary.tsx`
```tsx
import { ErrorBoundary, ErrorFallback, MiniErrorFallback } from '@/components/common/ErrorBoundary';

// استخدام في App Layout
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>

// مع fallback مخصص
<ErrorBoundary fallback={<CustomError />}>
  <Component />
</ErrorBoundary>
```

#### `src/hooks/useErrorHandler.ts`
```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleApiError, showSuccess, showWarning } = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await api.post('/bookings', data);
      showSuccess('تم إنشاء الحجز بنجاح');
    } catch (error) {
      handleApiError(error);
    }
  };
}
```

**المميزات:**
- ✅ ترجمة رسائل الأخطاء للعربية تلقائياً
- ✅ معالجة أخطاء Axios و HTTP Status Codes
- ✅ Toast notifications جاهزة
- ✅ Error Boundary للتعامل مع React errors

---

### 2. **Loading States** - حالات التحميل

#### `src/components/common/LoadingStates.tsx`
```tsx
import { 
  LoadingSpinner,
  PageLoader,
  FullPageLoader,
  ButtonLoading,
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
  FormSkeleton
} from '@/components/common/LoadingStates';

// Loading Spinner
<LoadingSpinner size="md" />

// Page Loader
<PageLoader message="جاري تحميل الحجوزات..." />

// Button with Loading
<ButtonLoading isLoading={isSubmitting} loadingText="جاري الحفظ...">
  حفظ
</ButtonLoading>

// Table Skeleton
<TableSkeleton rows={5} columns={4} />
```

**الأنواع المتوفرة:**
- ✅ LoadingSpinner (4 أحجام: sm, md, lg, xl)
- ✅ PageLoader (للصفحات)
- ✅ FullPageLoader (overlay)
- ✅ ButtonLoading (للأزرار)
- ✅ Skeleton (للنصوص)
- ✅ TableSkeleton (للجداول)
- ✅ CardSkeleton (للبطاقات)
- ✅ ListSkeleton (للقوائم)
- ✅ FormSkeleton (للفورمات)
- ✅ StatsCardSkeleton (للإحصائيات)
- ✅ ChartSkeleton (للرسوم البيانية)

---

### 3. **Permission/RBAC** - الصلاحيات والتحكم بالوصول

#### `src/hooks/usePermission.ts`
```tsx
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { hasPermission, hasRole, userRole } = usePermission();

  if (hasPermission('bookings:create')) {
    // عرض زر الإضافة
  }

  if (hasRole(['OWNER', 'RECEPTION'])) {
    // عرض محتوى للمدير والاستقبال فقط
  }
}
```

#### `src/components/common/Protected.tsx`
```tsx
import { Protected, ProtectedRoute } from '@/components/common/Protected';

// إخفاء/إظهار عناصر
<Protected permission="bookings:delete">
  <DeleteButton />
</Protected>

// حسب الدور
<Protected role={['OWNER', 'ACCOUNTANT']}>
  <FinancialReports />
</Protected>

// عدة صلاحيات (يحتاج واحدة فقط)
<Protected permission={['bookings:create', 'bookings:update']}>
  <BookingForm />
</Protected>

// عدة صلاحيات (يحتاج كلها)
<Protected 
  permission={['bookings:delete', 'bookings:update']} 
  requireAll
>
  <AdvancedActions />
</Protected>

// حماية صفحة كاملة
<ProtectedRoute role="OWNER">
  <SettingsPage />
</ProtectedRoute>
```

**الأدوار المتاحة:**
- `SUPER_ADMIN` - كل الصلاحيات
- `OWNER` - كل صلاحيات الصالون
- `RECEPTION` - الحجوزات + العملاء
- `ACCOUNTANT` - التقارير + المحاسبة
- `STAFF` - حجوزاته فقط

**الصلاحيات المعرّفة:**
```
bookings:view, bookings:create, bookings:update, bookings:delete
clients:view, clients:create, clients:update, clients:delete
services:view, services:create, services:update, services:delete
staff:view, staff:create, staff:update, staff:delete
reports:view, reports:export
settings:view, settings:update
accounting:view, accounting:create, accounting:update
```

---

### 4. **Empty States** - الحالات الفارغة

#### `src/components/common/EmptyStates.tsx`
```tsx
import { 
  EmptyState,
  NoData,
  NoResults,
  NoBookings,
  NoClients,
  NoServices,
  NoStaff
} from '@/components/common/EmptyStates';

// حالة عامة
<EmptyState
  title="لا توجد بيانات"
  description="ابدأ بإضافة بيانات جديدة"
  action={{
    label: "إضافة",
    onClick: handleAdd,
  }}
/>

// لا توجد بيانات (عامة)
<NoData 
  entity="حجوزات" 
  onAdd={handleAddBooking}
  addLabel="إضافة حجز جديد"
/>

// لا توجد نتائج بحث
<NoResults 
  searchQuery={searchQuery}
  onClearSearch={() => setSearchQuery('')}
/>

// مكونات جاهزة لكل موديول
<NoBookings onAdd={handleAddBooking} />
<NoClients onAdd={handleAddClient} />
<NoServices onAdd={handleAddService} />
<NoStaff onAdd={handleAddStaff} />
```

---

## 🎯 كيفية الاستخدام في الصفحات

### مثال: صفحة الحجوزات
```tsx
'use client';

import { useBookings } from '@/lib/api/hooks/use-bookings';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { usePermission } from '@/hooks/usePermission';
import { Protected } from '@/components/common/Protected';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TableSkeleton } from '@/components/common/LoadingStates';
import { NoBookings, NoResults } from '@/components/common/EmptyStates';

export default function BookingsPage() {
  const { data, isLoading, error } = useBookings();
  const { handleApiError } = useErrorHandler();
  const { hasPermission } = usePermission();

  // معالجة Loading
  if (isLoading) return <TableSkeleton rows={5} columns={4} />;

  // معالجة Error
  if (error) {
    handleApiError(error);
    return null;
  }

  // لا توجد بيانات
  if (!data?.length) {
    return <NoBookings onAdd={hasPermission('bookings:create') ? handleAdd : undefined} />;
  }

  return (
    <ErrorBoundary>
      <div>
        <Protected permission="bookings:create">
          <button onClick={handleAdd}>إضافة حجز</button>
        </Protected>

        <table>
          {data.map(booking => (
            <tr key={booking.id}>
              <td>{booking.clientName}</td>
              <Protected permission="bookings:delete">
                <td><DeleteButton /></td>
              </Protected>
            </tr>
          ))}
        </table>
      </div>
    </ErrorBoundary>
  );
}
```

---

## 🚀 الخطوة التالية

الآن كل المكونات الأساسية جاهزة! يمكننا البدء في بناء الصفحات:

1. ✅ **Bookings Page** - صفحة الحجوزات
2. ✅ **Clients Page** - صفحة العملاء  
3. ✅ **Services Page** - صفحة الخدمات
4. ✅ **Staff Page** - صفحة الموظفين

**اختر الصفحة التي تريد البدء بها!** 🎯
