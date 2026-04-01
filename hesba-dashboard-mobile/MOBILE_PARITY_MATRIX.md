# Daftar Mobile — Parity Matrix

**Project:** `dafter-dashboard-mobile`
**Backend:** `dafter-api-v1`
**Web Ref:** `dafter-dashboard`
**Last updated:** 2026-03-11

---

## Status Legend

| Status | Meaning |
|---|---|
| `Complete` | Fully implemented — list + detail + CRUD + skeleton + i18n + RTL |
| `Partial` | Core screens exist but missing some flows or polish |
| `Placeholder` | Screen file exists, shows EmptyState only |
| `Missing` | Not yet started |

---

## High-Level Status Snapshot

| # | Module | Backend | Mobile | Priority |
|---|---|---|---|---|
| 0 | Foundation / Auth / Shell | Complete | Complete | Done |
| 1 | Dashboard | Complete | Partial | Next |
| 2 | Customers | Complete | Complete | Done |
| 3 | Suppliers | Complete | Complete | Done |
| 4 | Employees | Complete | Complete | Done |
| 5 | Ledger | Complete | Complete | Done |
| 6 | Expenses | Complete | Complete | Done |
| 7 | Products | Complete | Complete | Done |
| 8 | Invoices | Complete | Complete | Done |
| 9 | Deferred Sales | Complete | Placeholder | High |
| 10 | Installments | Complete | Placeholder | High |
| 11 | Reports | Complete | Placeholder | Medium |
| 12 | Notifications | Complete | Placeholder | Medium |
| 13 | Settings / Profile | Partial | Partial | Medium |
| 14 | Users | Complete | Placeholder | Low |

---

## Delivery Order (Remaining Work)

```
Phase 2  — Dashboard         (redesign + live KPI cards)
Phase 9  — Deferred Sales    (list + detail + payment flow)
Phase 10 — Installments      (contract list + schedule + payment)
Phase 11 — Reports           (summary + overdue + collection schedule)
Phase 12 — Notifications     (inbox + mark-read + unread badge)
Phase 13 — Settings          (profile + appearance + tenant config)
Phase 14 — Users             (OWNER only — invite + role management)
```

---

## Module Details

---

### 0. Foundation / Auth / Shell

**Business Goal:** Secure entry point with persistent session, route protection, and app shell.

**Backend modules:** `auth`, `platform`

**Mobile Status:** `Complete`

**What exists:**
- Login screen with JWT + refresh token flow
- Token refresh queue (prevents race conditions on 401)
- Zustand `auth-store` — session persistence via `expo-secure-store`
- Theme store (dark/light + persisted)
- Locale store (AR/EN + persisted, RTL flag)
- Toast store
- Axios client with auth interceptor + refresh interceptor
- `(client)` group layout with 5-tab nav bar
- Protected route redirect to `/login` when unauthenticated
- i18n configured — 17 namespaces, Arabic default, sync init, Cairo font

**Remaining:**
- Nothing critical

---

### 1. Dashboard

**Business Goal:** Merchant sees financial health at a glance and can jump to key modules.

**Backend endpoint:** `GET /dashboard` → `DashboardStats`

**Response shape:**
```typescript
{
  totalReceivables: string;   // Decimal — total owed TO us (customers)
  totalPayables: string;      // Decimal — total owed BY us (suppliers)
  netPosition: string;        // Decimal — receivables - payables
  monthlyCollections: string; // Decimal — payments received this month
  overdueCount: number;       // count of overdue deferred sales
  lowStockCount: number;      // products below reorder threshold (if applicable)
}
```

**Mobile Status:** `Partial`

**What exists:**
- `(client)/index.tsx` — basic dashboard screen with placeholder KPI cards
- `dashboard.api.ts` — `getStats()` fetching `/dashboard`
- Fallback to `EMPTY_DASHBOARD` on error

**What is missing / needs work:**
- [ ] Live KPI cards bound to real API data (totalReceivables, totalPayables, netPosition)
- [ ] Decimal → formatted currency display (parseFloat + `toLocaleString`)
- [ ] Positive/negative color coding on netPosition
- [ ] `overdueCount` warning badge → tap → navigate to Deferred Sales filtered by overdue
- [ ] Recent activity section (optional: last 5 invoices or last 5 ledger entries)
- [ ] Quick action shortcuts (+ Customer, + Invoice, + Expense)
- [ ] Skeleton loading while KPIs load
- [ ] Pull-to-refresh
- [ ] Error state with retry

**Deliverables:**
```
src/features/dashboard/
  api/dashboard.api.ts        ← exists, check/update
  hooks/useDashboard.ts       ← create
  components/KpiCard.tsx      ← create (memo)
  components/DashboardSkeleton.tsx ← create
  types.ts                    ← create (DashboardStats)
src/app/(client)/index.tsx    ← rewrite with real data
src/i18n/locales/ar/dashboard.json ← update keys
src/i18n/locales/en/dashboard.json ← update keys
```

---

### 2. Customers

**Business Goal:** Full customer lifecycle — create, browse, view history, edit, delete.

**Backend endpoints:** `POST /customers` · `GET /customers` · `GET /customers/:id` · `PATCH /customers/:id` · `DELETE /customers/:id`

**Mobile Status:** `Complete`

**What exists:**
- List screen with search + FlatList + skeleton + pull-to-refresh
- Detail screen with hero header, InfoRow sections, ledger navigation button
- Slide-up create/edit form with full keyboard handling
- Delete with ZConfirmDialog
- CustomerCard memoized
- Full i18n AR + EN
- RTL layout correct
- Navigates to Ledger via `router.push({ pathname: '/(client)/ledger', params: { partyId, partyType: 'CUSTOMER', partyName } })`

**Module path:** `src/features/customers/`

---

### 3. Suppliers

**Business Goal:** Supplier management — same as customers but for the payables side.

**Backend endpoints:** Same structure as customers under `/suppliers`

**Mobile Status:** `Complete`

**What exists:**
- Same architecture as customers (list + detail + form + skeleton)
- Violet accent palette (`#7c3aed`)
- Hidden tab — navigated via `router.push('/(client)/suppliers')` from Menu
- Ledger navigation uses `partyType: 'SUPPLIER'`

**Module path:** `src/features/suppliers/`

---

### 4. Employees

**Business Goal:** Employee management with optimistic locking to prevent concurrent edit conflicts.

**Backend endpoints:** `POST /employees` · `GET /employees` · `GET /employees/:id` · `PATCH /employees/:id` (requires `version`) · `DELETE /employees/:id`

**Mobile Status:** `Complete`

**Special behavior:**
- `version` field required in every PATCH payload (Optimistic Locking)
- 409 on PATCH = version conflict → refresh record + show `errors.versionConflict`
- 409 on DELETE = has ledger entries → show `errors.deleteHasLedger`
- `jobTitle` badge rendered with indigo/teal pill in EmployeeCard
- Ledger navigation uses `partyType: 'EMPLOYEE'`

**Module path:** `src/features/employees/`

---

### 5. Ledger

**Business Goal:** Full double-entry accounting ledger with running balance. View per-party transaction history.

**Backend endpoints:**
- `POST /ledger` — create entry
- `GET /ledger/:partyId/statement` — statement with running balance
- `DELETE /ledger/:id` — delete entry (recalculates balances)

**Mobile Status:** `Complete`

**Architecture (dual-mode):**
- **Party Picker mode:** No route params → shows 3 tabs (Customers / Suppliers / Employees) for party selection
- **Statement mode:** `partyId` + `partyType` + `partyName` params → shows full transaction history + running balance

**Navigation contract (from party detail screens):**
```typescript
router.push({
  pathname: '/(client)/ledger',
  params: { partyId, partyType, partyName }
});
```

**signedAmount convention (DO NOT change):**

| Party | Entry Type | Sign |
|---|---|---|
| Customer | INVOICE | Negative (customer owes us) |
| Customer | PAYMENT | Positive (customer pays us) |
| Supplier | INVOICE | Positive (we owe supplier) |
| Supplier | PAYMENT | Negative (we pay supplier) |
| Employee | ADVANCE | Negative (employee owes company) |
| Employee | SALARY_PAYMENT | Positive (company pays employee) |

Use `computeSignedAmount()` from `ledger.types.ts` — never compute sign manually.

**NO optimistic updates** — `runningBalance` is a Prisma Decimal computed server-side. Client cannot replicate it exactly.

**Pagination reset rule:** On delete or refresh → `setPage(1); setAllItems([])` before invalidating.

**Module path:** `src/features/ledger/`

---

### 6. Expenses

**Business Goal:** Log and categorize business expenses. View summary by category.

**Backend endpoints:**
- `POST /expenses` · `GET /expenses` (paginated + category filter) · `GET /expenses/:id` · `PATCH /expenses/:id` · `DELETE /expenses/:id`
- `GET /expenses/summary` — total per category + grand total

**Mobile Status:** `Complete`

**What exists:**
- Summary card at top (total + breakdown by category)
- Category chips filter strip (horizontal scroll)
- Paginated list with skeleton
- Slide-up create/edit form
- Amber accent (`#d97706`) consistent with Invoices

**Expense categories:** `RENT` · `SALARIES` · `UTILITIES` · `SUPPLIES` · `TRANSPORTATION` · `MAINTENANCE` · `MARKETING` · `TAXES` · `OTHER`

**Module path:** `src/features/expenses/`

---

### 7. Products

**Business Goal:** Product catalog management. Used as a typeahead source when creating invoice line items.

**Backend endpoints:** `POST /products` · `GET /products` · `GET /products/:id` · `PATCH /products/:id` (includes `isActive` toggle) · `DELETE /products/:id`

**Mobile Status:** `Complete`

**What exists:**
- Product list with search + isActive toggle inline
- Product detail with full info
- Create/edit slide-up form
- `ProductPickerModal` — reusable picker component used by Invoices `InvoiceItemRow`
- Teal accent (`#0d9488`)

**Module path:** `src/features/products/`

---

### 8. Invoices

**Business Goal:** Create and manage invoices. Invoice items can be picked from product catalog. Invoices can also be created directly from a deferred sale.

**Backend endpoints:**
- `POST /invoices` — manual invoice with line items
- `POST /invoices/from-deferred-sale/:saleId` — idempotent (409 if already invoiced)
- `GET /invoices` · `GET /invoices/:id` · `DELETE /invoices/:id`

**Mobile Status:** `Complete`

**What exists:**
- InvoiceCard with status badge + total
- InvoiceItemRow with 300ms debounced typeahead product search
- CreateInvoiceForm — full-screen modal, party type tabs → inline PartyPickerModal → items list + live total
- InvoicePreview — receipt-style modal; Share via `Share.share()` (no native module needed)
- `from-deferred-sale` flow (triggered from DeferredSale detail screen)
- Amber palette (`#d97706` / `#fffbeb`)

**IMPORTANT:** `react-native-view-shot` is NOT installed. Do not use it for share/print.

**Module path:** `src/features/invoices/`

---

### 9. Deferred Sales (بيع آجل)

**Business Goal:** Record sales with deferred payment (customer pays later). Track partial payments. Convert to invoice.

**Backend endpoints:**
- `POST /deferred-sales` · `GET /deferred-sales` (filter: status, customerId) · `GET /deferred-sales/:id` · `PATCH /deferred-sales/:id`
- `POST /deferred-sales/:id/payments` — record partial payment
- `DELETE /deferred-sales/:id`

**Response shape (key fields):**
```typescript
{
  id: string;
  customerId: string;
  customer: { id: string; name: string };
  totalAmount: string;        // Decimal
  paidAmount: string;         // Decimal
  remainingAmount: string;    // Decimal
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueDate: string | null;     // ISO date
  description: string | null;
  invoiceId: string | null;   // set when converted to invoice
  createdAt: string;
}
```

**Mobile Status:** `Placeholder`

**Required deliverables:**
```
src/features/deferred-sales/
  types.ts
  api/deferred-sales.api.ts
  hooks/useDeferredSales.ts
  hooks/useDeferredSalesMutations.ts
  components/DeferredSaleCard.tsx        ← memo, shows status badge + remaining amount
  components/DeferredSaleSkeleton.tsx
  components/CreateDeferredSaleForm.tsx  ← includes customer picker
  components/RecordPaymentForm.tsx       ← partial payment slide-up
src/app/(client)/deferred-sales.tsx      ← list screen with status filter chips
src/app/(client)/deferred-sales/[id].tsx ← detail screen + payment history + "Make Invoice" button
src/i18n/locales/ar/deferredSales.json   ← exists, verify keys
src/i18n/locales/en/deferredSales.json   ← exists, verify keys
```

**Key UX rules:**
- Status filter chips: ALL · PENDING · PARTIAL · PAID · OVERDUE
- Overdue badge = red, Partial = amber, Paid = green, Pending = muted
- "Make Invoice" button only visible when `invoiceId === null`
- "Make Invoice" calls `POST /invoices/from-deferred-sale/:id` → navigate to invoice detail
- Payment form: amount (decimal) + date + optional notes

---

### 10. Installments (بيع بالتقسيط)

**Business Goal:** Installment contracts with fixed or custom payment schedules. Track installment payments.

**Backend endpoints:**
- `POST /installments` · `GET /installments` · `GET /installments/:id` · `DELETE /installments/:id`
- `POST /installments/:id/payments` — pay one or more installments

**Installment types:** `FIXED` (equal payments) · `CUSTOM` (manually defined schedule)

**Response shape (key fields):**
```typescript
{
  id: string;
  customerId: string;
  customer: { id: string; name: string };
  totalAmount: string;      // Decimal
  paidAmount: string;       // Decimal
  remainingAmount: string;  // Decimal
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE';
  scheduleType: 'FIXED' | 'CUSTOM';
  installmentCount: number;
  installmentAmount: string; // Decimal (for FIXED)
  startDate: string;
  installments: InstallmentItem[]; // the schedule
}

interface InstallmentItem {
  id: string;
  dueDate: string;
  amount: string;           // Decimal
  paidAmount: string;       // Decimal
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
}
```

**Mobile Status:** `Placeholder`

**Required deliverables:**
```
src/features/installments/
  types.ts
  api/installments.api.ts
  hooks/useInstallments.ts
  hooks/useInstallmentsMutations.ts
  components/InstallmentCard.tsx        ← progress bar showing paid/total
  components/InstallmentSkeleton.tsx
  components/CreateInstallmentForm.tsx  ← customer picker + schedule type + amount/count
  components/ScheduleRow.tsx            ← single installment row with status + pay action
src/app/(client)/installments.tsx       ← list with status filter
src/app/(client)/installments/[id].tsx  ← contract detail + schedule list + pay button per row
```

**Key UX rules:**
- Progress bar on card: `paidAmount / totalAmount`
- Schedule displayed as vertical timeline
- "Pay" action on each PENDING installment row → confirm amount → `POST /installments/:id/payments`
- OVERDUE installments highlighted in red

---

### 11. Reports

**Business Goal:** Financial summaries — receivables, payables, collections, overdue breakdown.

**Backend endpoints:**
- `GET /reports/summary` — financial snapshot (period param)
- `GET /reports/overdue` — overdue deferred sales + installments
- `GET /reports/collection-schedule` — upcoming payment schedule

**Mobile Status:** `Placeholder`

**Required deliverables:**
```
src/features/reports/
  types.ts
  api/reports.api.ts
  hooks/useReports.ts
  components/ReportSummaryCard.tsx
  components/OverdueList.tsx
  components/CollectionScheduleList.tsx
  components/ReportSkeleton.tsx
src/app/(client)/reports.tsx            ← tab-based: Summary | Overdue | Schedule
```

**Key UX rules:**
- Date range picker for summary (this month / last month / custom)
- Overdue list sorted by days overdue (most overdue first)
- Collection schedule grouped by week
- All monetary values formatted with currency
- No complex charts unless they add clear value — prefer summary numbers

---

### 12. Notifications

**Business Goal:** In-app notification inbox. Mark as read. Unread count in tab badge.

**Backend endpoints:**
- `GET /notifications` (paginated) · `PATCH /notifications/:id/read` · `POST /notifications/read-all`

**Notification types:** `PAYMENT_RECEIVED` · `OVERDUE_ALERT` · `INSTALLMENT_DUE` · `SYSTEM`

**Mobile Status:** `Placeholder`

**Required deliverables:**
```
src/features/notifications/
  types.ts
  api/notifications.api.ts
  hooks/useNotifications.ts
  hooks/useUnreadCount.ts              ← polled every 60s for badge
  hooks/useNotificationsMutations.ts
  components/NotificationCard.tsx      ← memo, unread = bold + accent left border
  components/NotificationSkeleton.tsx
src/app/(client)/notifications.tsx     ← list with "Mark all read" header action
```

**Key UX rules:**
- Unread count badge on the Notifications card in Menu screen
- Unread items visually distinct (bolder text, left accent border)
- Tap → mark as read automatically
- "Mark all read" button in header when unread count > 0
- `OVERDUE_ALERT` → tap → navigate to Deferred Sales filtered by overdue
- `INSTALLMENT_DUE` → tap → navigate to that Installment contract

---

### 13. Settings / Profile

**Business Goal:** User profile management + app preferences.

**Backend endpoints:**
- `GET /auth/me` · `PATCH /users/profile` (name, phone, avatar)
- `GET /platform/company` · `PATCH /platform/company` (OWNER only — company details)

**Mobile Status:** `Partial`

**What exists:**
- `(client)/profile.tsx` — placeholder screen
- Theme toggle (dark/light) in locale store
- Language toggle (AR/EN) in locale store

**What is missing:**
```
src/features/settings/
  api/settings.api.ts
  hooks/useProfile.ts
  hooks/useProfileMutations.ts
  components/ProfileForm.tsx
  components/AppearanceSection.tsx     ← theme + language toggles
  components/CompanyForm.tsx           ← OWNER only
src/app/(client)/profile.tsx           ← full settings hub
```

**Key UX rules:**
- Grouped settings: Profile · App Preferences · Company (OWNER only) · About
- Theme toggle with immediate preview
- Language switch triggers locale store update → app re-renders in new locale
- Danger zone: "Delete account" — extra confirmation

---

### 14. Users

**Business Goal:** OWNER manages team members (invite, assign role, deactivate). STAFF cannot access.

**Backend endpoints:**
- `GET /users` · `POST /users/invite` · `PATCH /users/:id/role` · `DELETE /users/:id`

**Roles:** `OWNER` · `STAFF`

**Staff Permissions:** `viewParties` · `manageParties` · `viewLedger` · `manageLedger` · `viewReports` · `manageUsers` · `viewInstallments` · `manageInstallments`

**Mobile Status:** `Placeholder`

**Guarded by:** `user?.role === 'OWNER'` — the Users row in Menu screen only shows for owners

**Required deliverables:**
```
src/features/users/
  types.ts
  api/users.api.ts
  hooks/useUsers.ts
  hooks/useUsersMutations.ts
  components/UserCard.tsx              ← name + role badge + status
  components/InviteUserForm.tsx        ← email + role + permissions checkboxes
src/app/(client)/users.tsx             ← list + invite button
```

---

## Platform Adaptation Rules (All Modules)

| Web Pattern | Mobile Equivalent |
|---|---|
| Data table | FlatList of cards |
| Dense filter bar | Horizontal chip strip or modal filter sheet |
| Row action dropdown | ZConfirmDialog or action buttons in detail screen |
| Multi-column form | Single-column grouped form in ZModal |
| Tab navigation (sub-page) | Segmented control or top tab within screen |
| Toast/banner | Zustand toast store → auto-dismiss overlay |
| Calendar picker | ZDateInput (native date picker) |
| Typeahead search | Debounced TextInput → FlatList dropdown |
| Report tables | Summary cards + sectioned lists |

---

## Mobile Success Criteria (Per Module)

A module is parity-complete only if all of the following are true:

1. API contract matches backend DTOs exactly
2. List screen: FlatList + skeleton + empty state + pull-to-refresh
3. Detail screen: skeleton + all key fields displayed + navigation to related modules
4. Create form: keyboard-safe, correct input types, focus chain, inline validation
5. Edit form: pre-populated from cached data, correct PATCH payload
6. Delete: ZConfirmDialog confirmation before calling API
7. Error handling: 401 (auto), 403 (EntitlementError), 409 (version conflict where applicable)
8. Monetary fields: `parseFloat(String(value))` before display + formatted with currency
9. Arabic + English translations 100% complete
10. RTL layout correct: chevrons, text alignment, margins, row direction
11. `memo()` on all cards, `useCallback()` on all render/handler props
12. Registered in `_layout.tsx` (visible or `href: null`)
