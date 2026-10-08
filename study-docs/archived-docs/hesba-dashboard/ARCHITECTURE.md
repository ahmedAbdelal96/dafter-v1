# 🏗️ dafter Platform Structure

## 🎯 Three Separate Applications

### 1️⃣ Super Admin (Platform Management)
**Path:** `/super-admin/*`  
**Purpose:** إدارة المنصة بالكامل - Tenants, Subscriptions, Analytics  
**Access:** Platform administrators only  
**Role:** `SUPER_ADMIN`

**Pages:**
- Dashboard (Platform statistics)
- Tenants (Beauty centers management)
- Subscriptions & Billing
- System Settings
- Platform Analytics

---

### 2️⃣ Dashboard (Tenant Management)
**Path:** `/dashboard/*`  
**Purpose:** إدارة السنتر (الصالون) - أصحاب السنتر والموظفين  
**Access:** Salon owners, managers, staff  
**Roles:** `OWNER`, `MANAGER`, `STAFF`

**Pages:**
- Dashboard (Salon overview)
- Bookings (Appointments)
- Clients (Customer management)
- Services (Services & pricing)
- Staff (Team management)
- Reports (Analytics)
- Settings (Salon configuration)

---

### 3️⃣ Public Booking (Client Portal)
**Path:** `/book/*` or `/[tenant-slug]/*`  
**Purpose:** الصفحات العامة للعملاء للحجز والاستعلام  
**Access:** Public (no authentication required for browsing)  
**Roles:** `CLIENT` (after booking/registration)

**Pages:**
- Salon Info (Public profile)
- Services List (Browse services)
- Online Booking (Calendar + booking form)
- Booking Confirmation
- Client Dashboard (My bookings - requires login)

---

## 🔐 Protection Strategy

### Middleware Routes:
```typescript
const SUPER_ADMIN_ROUTES = ["/super-admin"];
const DASHBOARD_ROUTES = ["/dashboard"];
const PUBLIC_ROUTES = ["/book", "/[tenant-slug]"];
const AUTH_ROUTES = ["/signin", "/signup"];
```

### Role-based Access:
- **SUPER_ADMIN**: Full platform access
- **OWNER**: Full salon access
- **MANAGER**: Manage bookings, staff, clients
- **STAFF**: View schedule, manage own bookings
- **CLIENT**: View/manage own bookings only

---

## 📁 Current Structure (Implemented)

```
src/app/[locale]/
├── (admin)/                    ← 🏢 Salon Management Dashboard
│   │                              (Owner, Manager, Staff)
│   ├── dashboard/              → Main dashboard
│   ├── bookings/               → Appointments management
│   ├── clients/                → Customer management
│   ├── services/               → Services & pricing
│   ├── staff/                  → Team management
│   ├── reports/                → Analytics & reports
│   ├── settings/               → Salon settings
│   ├── layout.tsx             → Dashboard layout (sidebar, header)
│   └── page.tsx               → Redirect to /dashboard
│
├── (super-admin)/              ← 👑 Platform Management
│   │                              (Platform administrators)
│   ├── dashboard/              → Platform stats
│   ├── tenants/                → Beauty centers
│   ├── subscriptions/          → Billing management
│   ├── analytics/              → Platform analytics
│   └── settings/               → System settings
│
├── (public-booking)/           ← 🌐 Public Client Portal
│   │                              (Public + Authenticated clients)
│   ├── book/                   → Online booking flow
│   └── my-bookings/            → Client dashboard (protected)
│
├── (admin-examples)/           ← 📦 UI Template Reference
│   ├── (others-pages)/         → Forms, tables, charts
│   └── (ui-elements)/          → UI components examples
│
├── (full-width-pages)/         ← 🔐 Authentication
│   └── (auth)/
│       ├── signin/
│       ├── signup/
│       └── reset-password/
│
└── layout.tsx                  → Root layout
```

---

## 🛡️ Middleware Logic

```typescript
// Check user role and route
if (pathname.startsWith('/super-admin')) {
  requireRole(['SUPER_ADMIN']);
} else if (pathname.startsWith('/dashboard')) {
  requireRole(['OWNER', 'MANAGER', 'STAFF']);
} else if (pathname.startsWith('/my-bookings')) {
  requireRole(['CLIENT']);
}
```
