# Daftar Mobile — Module Creation Guide

**Project:** `dafter-dashboard-mobile`
**Backend:** `dafter-api-v1` (NestJS + Prisma + PostgreSQL)
**Stack:** Expo 54 · React Native 0.81.5 · Expo Router 6 · TanStack Query v5 · Zustand · i18next · Axios
**Last updated:** 2026-03-11

---

## Purpose

This document is the definitive guide for building any mobile module in Daftar.
Follow it exactly. Every module must be built the same way — same structure, same patterns, same quality bar.

---

## Non-Negotiable Rules

### Rule 1 — Feature Folder, Always

Every module lives in its own folder under `src/features/`. No screen-level files, no scattered logic.

```
src/features/[module]/
  api/          ← API functions (axios calls)
  hooks/        ← React Query hooks (useQuery, useMutation)
  components/   ← Module-specific UI (cards, forms, pickers)
  types.ts      ← All types for this module
```

Screens live in `src/app/(client)/[module].tsx` (entry point only — thin shell, no logic).

### Rule 2 — Backend Is the Single Source of Truth

Study `dafter-api-v1/src/modules/[module]/` before writing a single line:
- Controller (endpoints + HTTP verbs + route params)
- DTOs (request payloads + validation rules)
- Service/Use-cases (business rules, quota checks, what 409/403 means)
- Prisma schema (field names, types, relations)

Never guess. The mobile module must match the backend contract exactly.

### Rule 3 — Skeleton Loading Is Mandatory

Every list screen and every detail screen must show a skeleton while loading.
A spinner alone is never acceptable.
Use the `Skeleton` component from `@/components/ui/Skeleton`.

### Rule 4 — FlatList for All Dynamic Lists

Every screen with a list of data must use `FlatList`.
`ScrollView` + `.map()` is forbidden for dynamic data.
Paginated lists accumulate items in state (`allItems`); reset on mutation or refresh.

### Rule 5 — React Query for Server State, Zustand for UI State

`TanStack Query v5` owns ALL server data (fetch, cache, invalidate, mutate).
`Zustand` owns ONLY app/UI state: auth session, theme, locale, toast queue.
Never store fetched data in Zustand.

### Rule 6 — All Monetary Values Are Strings (Prisma Decimal)

Prisma `Decimal` fields arrive from the API as **strings**, not numbers.
Before any math or display: `parseFloat(String(value))`.
Never assume they are numbers. Never do arithmetic on raw API values.

### Rule 7 — RTL Support in Every Component

Arabic is the default locale. Every component must work in both directions.
- Use `isRTL` from `useLocale()` to flip `flexDirection`, `textAlign`, `marginStart/End`
- Never use hardcoded `marginLeft/Right` for layout — use `marginStart/End`
- Icon chevrons must flip: `chevron-forward` (LTR) ↔ `chevron-back` (RTL)
- `direction: 'rtl'` on containers where needed

### Rule 8 — Z-Components Are the Design System

Always use the Z-prefixed components from `src/components/ui/`:

| Component | Use for |
|---|---|
| `ZText` | All text (handles font family + RTL) |
| `ZButton` | All buttons (primary / secondary / danger / ghost) |
| `ZInput` | All text inputs (with label, error state, RTL) |
| `ZCard` | All content cards |
| `ZBadge` | Status chips, category tags |
| `ZModal` | Bottom-sheet modals, slide-up forms |
| `ZConfirmDialog` | Destructive action confirmations |
| `ZAvatar` | Name initials avatar |
| `ZDateInput` | Date picker input |
| `Skeleton` | Loading placeholders |
| `ScreenHeader` | All screen headers (title + optional right action) |
| `EmptyState` | Zero-data states |
| `PartyCombobox` | Live-search party picker (Customer / Supplier / Employee) |

Never build one-off versions of these. Extend the shared component if needed.

### Rule 9 — Cards Are memo()

Every list card component must be wrapped in `React.memo()` to prevent re-renders on FlatList scroll.

### Rule 10 — QUERY_KEYS Are Centralized

All query keys are defined in `src/lib/api/config.ts` under `QUERY_KEYS`.
Add new keys there. Never define query keys inline in hooks.

---

## Creation Order (Step by Step)

Follow this exact order. Do not skip steps, do not reorder.

```
1. Types (types.ts)
2. QUERY_KEYS (config.ts)
3. API Layer (api/[module].api.ts)
4. Hooks (hooks/use[Module].ts, use[Module]Mutations.ts)
5. Components (components/[Module]Card.tsx, [Module]Form.tsx, [Module]Skeleton.tsx)
6. Screen (app/(client)/[module].tsx + detail screen if needed)
7. i18n (locales/ar/[module].json + locales/en/[module].json + register in index.ts)
```

---

## Step 1 — Types (`src/features/[module]/types.ts`)

Define all TypeScript types matching the backend response shapes exactly.

```typescript
// Always match backend field names exactly (camelCase from NestJS)
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

// Paginated list wrapper (standard Daftar API shape)
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Mutation payloads — only send fields that the DTO accepts
export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}
```

**Rules:**
- Match backend field names exactly (no renaming)
- Monetary fields are `string` (Prisma Decimal)
- Date fields are `string` (ISO 8601)
- Optional backend fields are `T | null` (not `T | undefined`)
- Enums: copy from backend exactly

---

## Step 2 — QUERY_KEYS (`src/lib/api/config.ts`)

Add keys to the existing `QUERY_KEYS` object:

```typescript
// In QUERY_KEYS object:
CUSTOMERS: ['customers'] as const,
CUSTOMER: (id: string) => ['customers', id] as const,
```

**Naming rules:**
- List: `MODULE_NAME` (plural, uppercase)
- Single item: `MODULE_NAME` (singular) + id param
- Derived data: `MODULE_NAME_SUMMARY`, `MODULE_NAME_PICKER`, etc.

---

## Step 3 — API Layer (`src/features/[module]/api/[module].api.ts`)

Pure async functions. Each function calls one endpoint. No UI logic.

```typescript
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type { Customer, PaginatedResponse, CreateCustomerDto, UpdateCustomerDto } from '../types';

export const customersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<{ data: PaginatedResponse<Customer> }>(
      API_ENDPOINTS.customers.list,
      { params },
    );
    return res.data.data;
  },

  get: async (id: string) => {
    const res = await apiClient.get<{ data: Customer }>(
      API_ENDPOINTS.customers.get(id),
    );
    return res.data.data;
  },

  create: async (dto: CreateCustomerDto) => {
    const res = await apiClient.post<{ data: Customer }>(
      API_ENDPOINTS.customers.create,
      dto,
    );
    return res.data.data;
  },

  update: async (id: string, dto: UpdateCustomerDto) => {
    const res = await apiClient.patch<{ data: Customer }>(
      API_ENDPOINTS.customers.update(id),
      dto,
    );
    return res.data.data;
  },

  delete: async (id: string) => {
    await apiClient.delete(API_ENDPOINTS.customers.delete(id));
  },
};
```

**API response shape:**
- Single record: `res.data.data` (one object)
- Paginated list: `res.data.data` (array) + `res.data.meta.total`
- No data on success: just `await` (void)

**Add endpoints to `API_ENDPOINTS` in config.ts:**

```typescript
customers: {
  list:   '/customers',
  create: '/customers',
  get:    (id: string) => `/customers/${id}`,
  update: (id: string) => `/customers/${id}`,
  delete: (id: string) => `/customers/${id}`,
},
```

---

## Step 4 — Hooks

### 4a — Query Hooks (`hooks/use[Module].ts`)

```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { customersApi } from '../api/customers.api';

// Single record
export function useCustomer(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER(id),
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });
}

// Paginated list (manual pagination — accumulate pages in component)
export function useCustomers(params?: { search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CUSTOMERS, params],
    queryFn: () => customersApi.list({ ...params, page: 1, limit: 20 }),
  });
}
```

**Rules:**
- `enabled: !!id` on detail queries
- Include filter params in the `queryKey` array so React Query caches by filter
- For paginated lists: pass page number into the key and accumulate in screen state

### 4b — Mutation Hooks (`hooks/use[Module]Mutations.ts`)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { customersApi } from '../api/customers.api';
import { useToast } from '@/stores/toast-store';

export function useCreateCustomer() {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      toast.show({ type: 'success', message: 'Customer created' }); // use i18n in practice
    },
    onError: (err) => {
      toast.show({ type: 'error', message: extractErrorMessage(err) });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateCustomerDto) => customersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMER(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}
```

**Invalidation rules:**
- After CREATE: invalidate the list key
- After UPDATE: invalidate the single item key AND the list key
- After DELETE: invalidate the list key
- If the mutation affects a related module (e.g., ledger entries after adding payment): also invalidate that module's keys

---

## Step 5 — Components

### 5a — List Card (`components/[Module]Card.tsx`)

```typescript
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import type { Customer } from '../types';

interface CustomerCardProps {
  item: Customer;
  onPress: (id: string) => void;
}

// memo() is REQUIRED on all list cards — prevents FlatList re-renders
const CustomerCard = memo(function CustomerCard({ item, onPress }: CustomerCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        Shadows.sm,
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      {/* ... */}

      {/* Info */}
      <View style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <ZText style={{ color: palette.text }}>{item.name}</ZText>
        {item.phone ? (
          <ZText style={{ color: palette.textSecondary }}>{item.phone}</ZText>
        ) : null}
      </View>

      {/* Chevron flips for RTL */}
      <Ionicons
        name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
        size={16}
        color={palette.textMuted}
      />
    </TouchableOpacity>
  );
});

export default CustomerCard;
```

### 5b — Skeleton (`components/[Module]Skeleton.tsx`)

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius } from '@/constants/theme';

// Shown while list is loading — renders N placeholder rows
export function CustomerListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.info}>
            <Skeleton width="60%" height={16} borderRadius={8} />
            <Skeleton width="40%" height={13} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}
```

### 5c — Form (`components/[Module]Form.tsx`)

Slide-up modal form using `ZModal`. See Form UX section below.

---

## Step 6 — Screen (`src/app/(client)/[module].tsx`)

The screen is a thin shell. It imports from the feature folder.

```typescript
import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '@/stores/theme-store';
import { Colors, Spacing } from '@/constants/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import CustomerCard from '@/features/customers/components/CustomerCard';
import { CustomerListSkeleton } from '@/features/customers/components/CustomerSkeleton';
import CreateCustomerForm from '@/features/customers/components/CustomerForm';

export default function CustomersScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isFetching, refetch } = useCustomers();

  const renderItem = useCallback(({ item }) => (
    <CustomerCard item={item} onPress={(id) => router.push(`/(client)/customers/${id}`)} />
  ), []);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScreenHeader
        title={t('title')}
        rightAction={{ icon: 'add', onPress: () => setShowForm(true) }}
      />

      {isLoading ? (
        <CustomerListSkeleton />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="people-outline" title={t('list.empty')} />}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
        />
      )}

      <CreateCustomerForm
        visible={showForm}
        onClose={() => setShowForm(false)}
      />
    </View>
  );
}
```

---

## Step 7 — i18n

### Files to create:
- `src/i18n/locales/ar/[module].json`
- `src/i18n/locales/en/[module].json`

### Register in `src/i18n/index.ts`:
1. Import: `import arModule from './locales/ar/[module].json';`
2. Add to `I18nNamespace` type union
3. Add to `ns` array
4. Add to `resources.ar` and `resources.en`

### Translation structure:
```json
{
  "title": "Customers",
  "list": {
    "empty": "No customers yet",
    "emptyDesc": "Add your first customer to get started"
  },
  "detail": {
    "title": "Customer Details",
    "phone": "Phone",
    "email": "Email",
    "address": "Address",
    "notes": "Notes",
    "ledger": "View Ledger"
  },
  "form": {
    "createTitle": "New Customer",
    "editTitle": "Edit Customer",
    "name": "Full Name",
    "namePlaceholder": "Enter customer name",
    "phone": "Phone Number",
    "phonePlaceholder": "05XXXXXXXX",
    "email": "Email",
    "address": "Address",
    "notes": "Notes",
    "save": "Save",
    "cancel": "Cancel"
  },
  "delete": {
    "title": "Delete Customer",
    "message": "Are you sure you want to delete this customer? This action cannot be undone.",
    "confirm": "Delete",
    "cancel": "Cancel"
  },
  "errors": {
    "loadFailed": "Failed to load customers",
    "createFailed": "Failed to create customer",
    "updateFailed": "Failed to update customer",
    "deleteFailed": "Failed to delete customer"
  }
}
```

---

## Form UX Rules

### Keyboard Type Map

| Field Type | `keyboardType` | `autoCapitalize` | `autoCorrect` | `returnKeyType` |
|---|---|---|---|---|
| Name | `default` | `words` | `false` | `next` |
| Phone | `phone-pad` | `none` | `false` | `next` |
| Email | `email-address` | `none` | `false` | `next` |
| Amount/Price | `decimal-pad` | `none` | `false` | `next` |
| Integer count | `numeric` | `none` | `false` | `next` |
| Notes/Description | `default` | `sentences` | `true` | `done` |
| Search | `default` | `none` | `false` | `search` |
| Password | `default` | `none` | `false` | `done` + `secureTextEntry` |

### Focus Chain

Use `useRef` to chain focus from field to field on `returnKeyType="next"`:

```typescript
const phoneRef = useRef<TextInput>(null);
const emailRef = useRef<TextInput>(null);

// Name field:
<ZInput returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />

// Phone field:
<ZInput ref={phoneRef} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />

// Last field:
<ZInput ref={emailRef} returnKeyType="done" onSubmitEditing={handleSubmit} />
```

### Keyboard Avoidance

All forms must be inside `KeyboardAvoidingView`:

```typescript
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView keyboardShouldPersistTaps="handled">
    {/* form fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Party Picker — Use `PartyCombobox`

Whenever a form needs the user to select a Customer, Supplier, or Employee, **always** use `PartyCombobox` — never a plain text UUID input.

```typescript
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';

// In your form state:
const [selectedParty, setSelectedParty] = useState<SelectedParty | null>(null);

// Reset when partyType tab changes:
const handlePartyTypeChange = (type: PartyType) => {
  setForm(f => ({ ...f, partyType: type }));
  setSelectedParty(null); // clear — different entity type
};

// In the JSX (replaces the ZInput partyId field):
<PartyCombobox
  partyType={form.partyType}      // 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE'
  value={selectedParty}
  onChange={(party) => {
    setSelectedParty(party);
    if (errors.partyId) setErrors(e => ({ ...e, partyId: undefined }));
  }}
  label={t('form.party')}
  placeholder={t('form.partyPlaceholder')}
  error={errors.partyId}
/>

// Validation:
if (!selectedParty) {
  errs.partyId = t('validation.partyRequired');
}

// Payload:
{ partyId: selectedParty!.id, partyType: form.partyType, ... }
```

**Architecture notes:**
- `PartyCombobox` opens a slide-up search modal with debounced live search (300ms, min 1 char)
- Uses **direct Axios** calls (not React Query) — results depend on live query text, no caching benefit
- Normalises Customer / Supplier / Employee API responses to `{ id, name, subtitle? }`
- Full RTL + dark mode support
- `SelectedParty`: `{ id: string; name: string }`

### Form as Slide-Up Modal

All create/edit forms must use `ZModal` (bottom sheet pattern):

```typescript
<ZModal visible={visible} onClose={onClose} title={t('form.createTitle')}>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* fields */}
    </ScrollView>
  </KeyboardAvoidingView>
  <ZButton title={t('form.save')} onPress={handleSubmit} loading={isPending} />
</ZModal>
```

### Inline Validation

Show inline errors under each field when submission fails:

```typescript
const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

// After API error: parse error.response.data.message and map to fields
<ZInput
  label={t('form.name')}
  error={errors.name}
/>
```

---

## Error Handling Patterns

### Standard API Error

```typescript
onError: (error: unknown) => {
  const msg = error?.response?.data?.message ?? t('errors.unknown');
  toast.show({ type: 'error', message: msg });
}
```

### 409 — Optimistic Lock Conflict (Employees Only)

Employees use version-based optimistic locking. Always pass `version` in PATCH.

```typescript
// In form state:
const [version, setVersion] = useState(employee.version);

// In PATCH payload:
{ name, jobTitle, ..., version }

// On 409:
onError: (error) => {
  if (error?.response?.status === 409) {
    // Refresh the employee record to get the latest version
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE(id) });
    toast.show({ type: 'error', message: t('errors.versionConflict') });
  }
}
```

Employee DELETE may also return 409 if the employee has ledger entries. Show `errors.deleteHasLedger` in that case.

### 403 — Entitlement Error (Feature/Quota Gate)

```typescript
onError: (error) => {
  if (error?.response?.status === 403) {
    const body = error.response.data;
    if (body?.error === 'EntitlementError') {
      // Feature is locked by subscription plan
      toast.show({ type: 'error', message: t('errors.featureLocked') });
      return;
    }
  }
  // ... other error handling
}
```

`EntitlementException` shape: `{ statusCode: 403, error: 'EntitlementError', code, featureKey?, entity?, limit?, current? }`

### 401 — Token Expiry

Handled globally in the Axios interceptor (`src/lib/api/client.ts`). The token refresh queue ensures only one refresh request fires even if multiple 401s arrive simultaneously. No module-level handling needed.

---

## UI Design System

### Color Palette Per Module

Each module has an assigned accent color for visual identity. Use consistently across header, icon pills, and badges.

| Module | Accent | Light BG |
|---|---|---|
| Dashboard | Blue `#2563eb` | `#eff6ff` |
| Customers | Blue `#2563eb` | `#eff6ff` |
| Suppliers | Violet `#7c3aed` | `#f5f3ff` |
| Employees | Indigo `#4f46e5` | `#eef2ff` |
| Ledger | Slate `#475569` | `#f8fafc` |
| Expenses | Amber `#d97706` | `#fffbeb` |
| Products | Teal `#0d9488` | `#f0fdfa` |
| Invoices | Amber `#d97706` | `#fffbeb` |
| Deferred Sales | Red `#dc2626` | `#fef2f2` |
| Installments | Green `#16a34a` | `#f0fdf4` |
| Reports | Blue `#2563eb` | `#eff6ff` |
| Notifications | Orange `#ea580c` | `#fff7ed` |

### Screen Header Standard

```typescript
// Blue header with white title — consistent across all screens
<ScreenHeader
  title={t('title')}           // localized
  rightAction={{
    icon: 'add',
    onPress: () => setShowForm(true),
  }}
/>
```

### Detail Hero Pattern

For party detail screens (Customer, Supplier, Employee):
- Hero `bg-primary-600` header with `pb-16`
- ScrollView with `marginTop: -56` to overlap hero
- Avatar card with `elevation: 5` overlaps the hero
- InfoRow sections below with colored icon squares

### Balance / Amount Display

Balance pills must color-code by sign:
- Positive (owes us): Red `#dc2626` text + `#fef2f2` background
- Negative (we owe): Green `#16a34a` text + `#f0fdf4` background
- Zero: Muted color + light gray background

---

## Pagination Pattern

```typescript
// Screen state
const [page, setPage] = useState(1);
const [allItems, setAllItems] = useState<T[]>([]);

// On fetch success — append to allItems
useEffect(() => {
  if (data) {
    setAllItems(prev => page === 1 ? data.data : [...prev, ...data.data]);
  }
}, [data, page]);

// On mutation success — RESET both
const handleDeleteSuccess = () => {
  setPage(1);
  setAllItems([]);
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
};

// FlatList footer load more
<FlatList
  data={allItems}
  onEndReached={() => {
    if (allItems.length < (data?.meta.total ?? 0)) setPage(p => p + 1);
  }}
  onEndReachedThreshold={0.3}
/>
```

---

## Hidden Tab Screens

Modules NOT in the main tab bar (all except Home, Customers, Ledger, Invoices, More) must be declared in `_layout.tsx` with `href: null`:

```typescript
<Tabs.Screen
  name="suppliers"
  options={{ href: null }}
/>
```

Navigate to them via `router.push('/(client)/suppliers')`.

---

## RTL Layout Rules

```typescript
// Container row
<View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>

// Text alignment
<Text style={{ textAlign: isRTL ? 'right' : 'left' }}>

// Icon chevron
<Ionicons
  name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
/>

// Margin (always use Start/End, never Left/Right for layout)
<View style={{ marginStart: Spacing[3] }}>

// Arabic text container
<View style={{ direction: 'rtl' }}>
```

---

## Performance Rules

1. **memo()** on every card/row component
2. **useCallback()** on every `renderItem`, `onPress`, and event handler passed as props
3. **debounce** search input by 300ms (`useMemo` + `setTimeout` or `useDebounce`)
4. **keyExtractor** always uses `item.id` (never index)
5. **getItemLayout** optional but preferred for fixed-height rows
6. **removeClippedSubviews** on large lists (Android only, via `Platform.OS === 'android'`)
7. No heavy computation inside render — derive in `useMemo` or `useEffect`
8. No nested FlatLists — use `SectionList` or `ListHeaderComponent` instead

---

## Definition of Done Checklist

A module is NOT complete until every item is true:

- [ ] Feature folder created: `src/features/[module]/api/ hooks/ components/ types.ts`
- [ ] All types match backend DTO/response shapes exactly
- [ ] All endpoints added to `API_ENDPOINTS` in config.ts
- [ ] All query keys added to `QUERY_KEYS` in config.ts
- [ ] API functions return typed responses (no `any`)
- [ ] Query hooks use correct `queryKey` including filter params
- [ ] Mutations invalidate correct query keys (list + item as needed)
- [ ] List screen uses `FlatList` with `keyExtractor={(item) => item.id}`
- [ ] List screen shows `Skeleton` while loading
- [ ] List screen shows `EmptyState` when data is empty
- [ ] Detail screen shows skeleton while loading
- [ ] Forms are inside `KeyboardAvoidingView` + `ScrollView`
- [ ] All inputs have correct `keyboardType`, `returnKeyType`, `autoCapitalize`
- [ ] Focus chain implemented with `useRef` + `onSubmitEditing`
- [ ] Destructive actions use `ZConfirmDialog`
- [ ] Error handling covers 401 (auto), 403 (EntitlementError), 409 (version conflict where applicable)
- [ ] `memo()` on all list card components
- [ ] `useCallback()` on all `renderItem` and handler functions
- [ ] Arabic + English translations complete
- [ ] RTL layout verified (chevrons flip, text aligns, margins correct)
- [ ] Screen registered in `_layout.tsx` (with `href: null` if hidden)
- [ ] Pull-to-refresh via `RefreshControl`
- [ ] Monetary values use `parseFloat(String(value))` before display

---

## Quick Start Template

When asked to build a module named `[module]`:

1. Read `dafter-api-v1/src/modules/[module]/` — controller, DTOs, service
2. Create `src/features/[module]/types.ts`
3. Add keys to `QUERY_KEYS` in `src/lib/api/config.ts`
4. Add endpoints to `API_ENDPOINTS` in `src/lib/api/config.ts`
5. Create `src/features/[module]/api/[module].api.ts`
6. Create `src/features/[module]/hooks/use[Module].ts`
7. Create `src/features/[module]/hooks/use[Module]Mutations.ts`
8. Create `src/features/[module]/components/[Module]Card.tsx` (memo)
9. Create `src/features/[module]/components/[Module]Skeleton.tsx`
10. Create `src/features/[module]/components/[Module]Form.tsx`
11. Update `src/app/(client)/[module].tsx` screen
12. Create `src/i18n/locales/ar/[module].json`
13. Create `src/i18n/locales/en/[module].json`
14. Register namespace in `src/i18n/index.ts`
15. Register screen in `src/app/(client)/_layout.tsx`

Write code as a senior software engineer. Handle all edge cases. Never skip the skeleton.
