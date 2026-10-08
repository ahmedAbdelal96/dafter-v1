# 🔐 Authentication & Authorization Flow

## 📊 System Roles

| Role | Access Level | Default Redirect |
|------|--------------|------------------|
| **SUPER_ADMIN** | Platform Management | `/ar/super-admin/dashboard` |
| **OWNER** | Full Salon Access | `/ar/dashboard` |
| **RECEPTION** | Bookings, Clients | `/ar/dashboard` |
| **ACCOUNTANT** | Reports, Settings | `/ar/dashboard` |
| **STAFF** | Schedule, Own Bookings | `/ar/dashboard` |

---

## 🔄 Login Flow

### 1️⃣ User Submits Login Form
```tsx
// SignInForm.tsx
const result = await login(email, password);
```

### 2️⃣ Server Action Calls Backend API
```typescript
// actions.ts → loginAction()
const response = await fetch(API_URL + '/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const data = await response.json();
// data.user.role = "SUPER_ADMIN" | "OWNER" | "STAFF" | etc.
```

### 3️⃣ Save Tokens & User Data in Cookies
```typescript
// server.ts → setAuthCookies()
await setAuthCookies({
  accessToken: data.tokens.accessToken,
  refreshToken: data.tokens.refreshToken,
  user: { ...data.user, role: data.user.role },
  tenant: data.tenant
});

// Also save role in separate cookie for middleware
cookieStore.set("dafter_user_role", session.user.role);
```

### 4️⃣ Client Redirects & Middleware Takes Over
```tsx
// SignInForm.tsx
if (result.success) {
  window.location.href = "/"; // Force reload
}
```

### 5️⃣ Middleware Reads Role & Redirects
```typescript
// middleware.ts
const user = getUserFromToken(request); // { role: "SUPER_ADMIN" }

if (isAuth && isAuthenticated && user) {
  const redirectUrl = getRedirectByRole(user.role, locale);
  // SUPER_ADMIN → /ar/super-admin/dashboard
  // OWNER → /ar/dashboard
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
```

---

## 🛡️ Route Protection

### Super Admin Routes
```typescript
// middleware.ts
if (pathWithoutLocale.startsWith("/super-admin")) {
  if (user.role !== "SUPER_ADMIN") {
    // Redirect back to their dashboard
    return NextResponse.redirect(getRedirectByRole(user.role, locale));
  }
}
```

### Dashboard Routes (Salon)
```typescript
const dashboardPaths = [
  "/dashboard", "/bookings", "/clients", 
  "/services", "/staff", "/reports", "/settings"
];

if (isDashboardPath(pathWithoutLocale)) {
  const allowedRoles = ["OWNER", "RECEPTION", "STAFF", "ACCOUNTANT"];
  if (!allowedRoles.includes(user.role)) {
    // SUPER_ADMIN trying to access salon dashboard → redirect to super-admin
    return NextResponse.redirect(getRedirectByRole(user.role, locale));
  }
}
```

---

## 🎯 Example Scenarios

### Scenario 1: Super Admin Login
```
1. SUPER_ADMIN logs in
2. Middleware detects role = "SUPER_ADMIN"
3. Redirects to: /ar/super-admin/dashboard ✅
4. If tries to access /ar/dashboard → Redirected back to super-admin ❌
```

### Scenario 2: Salon Owner Login
```
1. OWNER logs in
2. Middleware detects role = "OWNER"
3. Redirects to: /ar/dashboard ✅
4. If tries to access /ar/super-admin → Redirected back to dashboard ❌
```

### Scenario 3: Staff Member Login
```
1. STAFF logs in
2. Middleware detects role = "STAFF"
3. Redirects to: /ar/dashboard ✅
4. Can access: /ar/bookings, /ar/clients (based on permissions)
```

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Role-based routing & access control |
| `lib/auth/server.ts` | Cookie management (saves role) |
| `lib/auth/actions.ts` | Server actions (login/logout) |
| `stores/auth-store.ts` | Client state (UI only) |
| `components/auth/SignInForm.tsx` | Login form |

---

## ⚠️ Important Notes

1. **Role is stored in 2 places:**
   - `dafter_user_role` cookie → For middleware (fast access)
   - `dafter_user_data` cookie → For client UI (full user data)

2. **Middleware runs on every request** → Checks role before page loads

3. **No client-side role checking needed** → Middleware handles everything

4. **If user tries unauthorized route** → Auto-redirect to their dashboard

---

## 🚀 Testing

### Test Super Admin Access:
1. Login with SUPER_ADMIN role
2. Should redirect to: `/ar/super-admin/dashboard`
3. Try accessing `/ar/dashboard` → Should redirect back

### Test Salon Owner Access:
1. Login with OWNER role
2. Should redirect to: `/ar/dashboard`
3. Try accessing `/ar/super-admin` → Should redirect back

---

## 📝 Future Enhancements

1. **Fine-grained permissions** (e.g., STAFF can't access Reports)
2. **Role-based UI components** (hide buttons based on role)
3. **Audit logging** (track who accessed what)
4. **Multi-tenant isolation** (ensure users only see their salon data)
