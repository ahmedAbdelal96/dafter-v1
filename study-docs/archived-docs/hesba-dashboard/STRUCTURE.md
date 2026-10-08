# 📁 dafter Dashboard Structure

## 📂 Active Pages (Our Work)
Located in: `src/app/[locale]/(admin)/`

### Main Pages:
- ✅ **dashboard/** - لوحة التحكم الرئيسية
- 🔜 **bookings/** - إدارة الحجوزات
- 🔜 **clients/** - إدارة العملاء  
- 🔜 **services/** - إدارة الخدمات
- 🔜 **staff/** - إدارة الموظفين
- 🔜 **settings/** - الإعدادات
- 🔜 **reports/** - التقارير والإحصائيات

---

## 📦 Template Examples (Reference Only)
Located in: `src/app/[locale]/(admin-examples)/`

### Contains:
- **(others-pages)/** - Forms, Tables, Charts, Calendar, Profile, Blank
- **(ui-elements)/** - Alerts, Badges, Buttons, Modals, etc.

> ⚠️ These are template examples for reference only. Do not modify.

---

## 🌐 Public Pages
Located in: `src/app/[locale]/(full-width-pages)/`

- **(auth)/** - Sign In, Sign Up, Reset Password

---

## 🎯 Development Guidelines

1. **Work only in `(admin)` folder** for main app features
2. **Reference `(admin-examples)`** for UI patterns and examples
3. **Use Zustand stores** from `src/stores/` for state management
4. **Use i18n navigation** from `@/i18n/navigation` for routing
5. **Follow SSR-safe patterns** for all components

---

## 📝 File Naming Convention

```
page.tsx          → Main page component (Server Component)
layout.tsx        → Layout wrapper
loading.tsx       → Loading state
error.tsx         → Error boundary
not-found.tsx     → 404 page
```

---

## 🚀 Next Steps

1. Build Bookings page (Calendar + List view)
2. Build Clients page (CRUD operations)
3. Build Services page (Categories + Pricing)
4. Build Staff page (Team management)
5. Build Settings page (Salon configuration)
6. Build Reports page (Analytics + Insights)
