# 🎯 Dynamic Navigation System

## نظام التنقل الديناميكي في dafter Dashboard

تم تطوير نظام navigation ديناميكي يسمح باستخدام نفس الـ layout لكل من **Salon Admin** و **Super Admin** مع محتوى sidebar مختلف لكل واحد.

---

## 📁 Structure

```
src/
├── config/
│   └── navigation-items.tsx      # Navigation configs (Salon & Super Admin)
├── layout/
│   ├── DashboardLayout.tsx      # Shared layout component
│   ├── DynamicSidebar.tsx       # Dynamic sidebar component
│   ├── AppHeader.tsx            # Header (unchanged)
│   └── AppSidebar.tsx           # Old sidebar (for reference)
├── app/[locale]/
│   ├── (admin)/
│   │   └── layout.tsx           # Salon admin layout (uses DashboardLayout)
│   └── super-admin/
│       └── layout.tsx           # Super admin layout (uses DashboardLayout)
```

---

## 🔧 كيف يعمل النظام؟

### 1️⃣ **Navigation Config** ([`navigation-items.tsx`](src/config/navigation-items.tsx))

يحتوي على 3 أنواع من Navigation:

```typescript
export type NavigationConfig = {
  main: NavItem[];         // القائمة الرئيسية
  accounting: NavItem[];   // قائمة المحاسبة
  settings: NavItem[];     // قائمة الإعدادات
};

// Salon Navigation
export const salonNavigation: NavigationConfig = {
  main: [
    { key: "dashboard", icon: <Icons.Dashboard />, path: "/" },
    { key: "bookings", icon: <Icons.Booking />, subItems: [...] },
    // ... المزيد
  ],
  accounting: [...],
  settings: [...],
};

// Super Admin Navigation
export const superAdminNavigation: NavigationConfig = {
  main: [
    { key: "dashboard", icon: <Icons.Dashboard />, path: "/super-admin/dashboard" },
    { key: "tenants", icon: <Icons.Building />, subItems: [...] },
    // ... المزيد
  ],
  accounting: [...],
  settings: [...],
};
```

### 2️⃣ **Shared Layout** ([`DashboardLayout.tsx`](src/layout/DashboardLayout.tsx))

Layout component واحد يستخدمه الجميع:

```tsx
<DashboardLayout 
  navigation={navigationConfig}  // محتوى القوائم
  basePathPrefix="/super-admin"  // بادئة المسارات
>
  {children}
</DashboardLayout>
```

### 3️⃣ **Dynamic Sidebar** ([`DynamicSidebar.tsx`](src/layout/DynamicSidebar.tsx))

Sidebar ديناميكي يستقبل navigation config:

```tsx
<DynamicSidebar 
  navigation={navigation}
  basePathPrefix={basePathPrefix}
/>
```

**الميزات:**
- ✅ يدعم RTL/LTR
- ✅ Expandable/Collapsible
- ✅ Sub-menus مع animation
- ✅ Active state detection
- ✅ Mobile responsive

---

## 📋 الاستخدام

### للـ Salon Admin:

```tsx
// src/app/[locale]/(admin)/layout.tsx
import DashboardLayout from "@/layout/DashboardLayout";
import { salonNavigation } from "@/config/navigation-items";

export default function AdminLayout({ children }) {
  return (
    <DashboardLayout 
      navigation={salonNavigation}
      basePathPrefix=""  // no prefix
    >
      {children}
    </DashboardLayout>
  );
}
```

### للـ Super Admin:

```tsx
// src/app/[locale]/super-admin/layout.tsx
import DashboardLayout from "@/layout/DashboardLayout";
import { superAdminNavigation } from "@/config/navigation-items";

export default function SuperAdminLayout({ children }) {
  return (
    <DashboardLayout 
      navigation={superAdminNavigation}
      basePathPrefix="/super-admin"  // مهم!
    >
      {children}
    </DashboardLayout>
  );
}
```

---

## 🎨 إضافة قائمة جديدة

### 1. إضافة Navigation Config:

```typescript
// في navigation-items.tsx
export const myCustomNavigation: NavigationConfig = {
  main: [
    {
      key: "myPage",
      icon: <Icons.Custom />,
      path: "/my-page",
    },
    {
      key: "mySection",
      icon: <Icons.Section />,
      subItems: [
        { key: "subPage1", path: "/section/page1" },
        { key: "subPage2", path: "/section/page2" },
      ],
    },
  ],
  accounting: [],
  settings: [],
};
```

### 2. إضافة الترجمات:

```json
// messages/ar/navigation.json
{
  "main": {
    "myPage": "صفحتي",
    "mySection": "قسمي",
    "subPage1": "الصفحة الأولى",
    "subPage2": "الصفحة الثانية"
  }
}
```

### 3. استخدامها في Layout:

```tsx
import { myCustomNavigation } from "@/config/navigation-items";

export default function MyLayout({ children }) {
  return (
    <DashboardLayout 
      navigation={myCustomNavigation}
      basePathPrefix="/my-prefix"
    >
      {children}
    </DashboardLayout>
  );
}
```

---

## 🎯 الفوائد

1. **DRY (Don't Repeat Yourself)**
   - Layout واحد بدل ما يكون عندك نسخ متعددة

2. **سهولة الصيانة**
   - تعديل واحد في DashboardLayout بينعكس على الجميع

3. **Flexibility**
   - إضافة role جديد = إضافة navigation config فقط

4. **Type Safety**
   - TypeScript يضمن صحة البيانات

5. **i18n Ready**
   - دعم كامل للترجمة

---

## 🔍 الفرق بين Salon Admin و Super Admin

| Feature | Salon Admin | Super Admin |
|---------|-------------|-------------|
| **القوائم** | Bookings, Clients, Services, Staff | Tenants, Subscriptions, Analytics |
| **Base Path** | `/` | `/super-admin` |
| **Navigation Config** | `salonNavigation` | `superAdminNavigation` |
| **الصلاحيات** | إدارة صالون واحد | إدارة كل الصوالين |

---

## 📝 ملاحظات

1. **basePathPrefix مهم جداً** للـ Super Admin علشان الـ links تشتغل صح
2. **Translation keys** يجب تكون موجودة في `navigation.json`
3. **Icons** يمكن إضافتها في [`navigation.tsx`](src/config/navigation.tsx)

---

**Happy Coding! 🚀**
