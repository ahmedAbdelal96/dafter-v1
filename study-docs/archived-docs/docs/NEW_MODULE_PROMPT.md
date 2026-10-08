# Daftar Mobile App — New Module Implementation Prompt

> **استخدام هذا الملف:** عند بناء أي module جديد (Suppliers / Employees / Ledger / إلخ)،
> أعطِ هذا الملف كاملاً كـ context للـ AI أو اتبعه خطوة بخطوة كـ senior developer.

---

## 0. قبل أي سطر كود — افهم الـ Backend أولاً

```
⚠️  القاعدة الذهبية:
    لا تكتب type واحدة في الـ frontend
    إلا بعد ما تشوف الـ ACTUAL JSON response من الـ backend.
```

### 0.1 شكل الـ Response الثابت في هذا المشروع

كل endpoint في `dafter-api-v1` يرجع هذا الـ wrapper:

```json
// Single item & Create & Update & Delete
{
  "success": true,
  "data": { ...entity },
  "message": "...",
  "error": null,
  "timestamp": "2026-02-22T..."
}

// Paginated list — ⚠️ الـ data مصفوفة والـ meta منفصلة في نفس المستوى
{
  "success": true,
  "data": [ ...items ],        // ← res.data.data
  "message": "...",
  "error": null,
  "timestamp": "2026-02-22T...",
  "meta": {                    // ← res.data.meta  (ليست داخل data!)
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 0.2 كيف تقرأ الـ Response صح في الـ API layer

```typescript
// ✅ Paginated list — mapping إجباري
list: async (params?) => {
  const res = await apiClient.get<any>("/entity", { params });
  return {
    data: res.data.data ?? [],          // ← res.data.data لا res.data
    total: res.data.meta?.total ?? 0,   // ← res.data.meta لا res.data.total
    page:  res.data.meta?.page  ?? 1,
    limit: res.data.meta?.limit ?? 20,
  };
},

// ✅ Single / Create / Update
getById: async (id) => {
  const res = await apiClient.get<ApiResponse<Entity>>(`/entity/${id}`);
  return res.data.data!;  // ← .data.data (wrapper ثم payload)
},
```

### 0.3 Prisma Decimal → string

كل حقل `Decimal` في Prisma يأتي كـ **string** في الـ JSON.

```typescript
// ✅ صح في الـ types
openingBalance: string; // "1500.00" وليس number
balance: string | number; // قد يكون 0 (number) أو "1500" (string)

// ✅ عند العرض
const amount = parseFloat(String(entity.balance));
```

---

## 1. هيكل الملفات (File Structure)

```
src/
├── api/endpoints/
│   └── {module}.ts          ← API calls فقط، لا business logic
├── types/
│   └── {module}.types.ts    ← Types تعكس الـ backend بالضبط
├── hooks/
│   └── use{Module}s.ts      ← TanStack Query hooks
├── components/{module}/
│   ├── {Module}Card.tsx     ← List item (memo wrapped)
│   ├── {Module}Form.tsx     ← Create/Edit modal
│   └── {Module}ListSkeleton.tsx  ← Loading placeholder
├── constants/
│   └── config.ts            ← QUERY_KEYS يُضاف هنا
└── i18n/
    ├── ar/{module}.json     ← ترجمة عربي للـ module
    └── en/{module}.json     ← ترجمة إنجليزي للـ module

app/(app)/
├── {module}s.tsx            ← List screen
└── {module}s/
    └── [id].tsx             ← Detail screen
```

---

## 2. الخطوات بالترتيب الصحيح

### الخطوة 1: Types أولاً (`src/types/{module}.types.ts`)

```typescript
// ============================================
// {Module} Types — يعكس الـ backend entity بالضبط
// ============================================

// 1. Entity الأساسية — انسخ الحقول من Prisma schema مع مراعاة:
//    - Decimal → string
//    - DateTime → string (ISO)
//    - Int → number
//    - Boolean → boolean
//    - nullable fields → Type | null
export interface {Module} {
  id: string;
  companyId: string;
  name: string;
  // ... باقي الحقول من الـ backend response الفعلي
  isActive: boolean;
  isDeleted: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// 2. Create payload — فقط الحقول اللي يقبلها الـ POST endpoint
export interface Create{Module}Payload {
  name: string;
  // ... حقول اختيارية optional
}

// 3. Update payload — كل الحقول optional
export interface Update{Module}Payload {
  name?: string;
  // ...
}

// 4. Filters للـ list
export interface {Module}Filters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// 5. ⚠️ ListResponse — shape يطابق ما يرجعه الـ api layer (بعد الـ mapping)
export interface {Module}ListResponse {
  data: {Module}[];
  total: number;
  page: number;
  limit: number;
}
```

### الخطوة 2: QUERY_KEYS (`src/constants/config.ts`)

```typescript
// أضف داخل QUERY_KEYS:
{MODULE}S: ["{module}s"] as const,
{MODULE}: (id: string) => ["{module}s", id] as const,
```

### الخطوة 3: API Layer (`src/api/endpoints/{module}s.ts`)

```typescript
import { apiClient } from "../client";
import type { ApiResponse } from "../../types/api.types";
import type {
  {Module}, Create{Module}Payload, Update{Module}Payload,
  {Module}Filters, {Module}ListResponse,
} from "../../types/{module}.types";

export const {module}sApi = {
  // ⚠️ LIST: يحتاج manual mapping لأن الـ meta منفصلة
  list: async (params?: {Module}Filters): Promise<{Module}ListResponse> => {
    const res = await apiClient.get<any>("/{module}s", { params });
    return {
      data:  res.data.data  ?? [],
      total: res.data.meta?.total ?? 0,
      page:  res.data.meta?.page  ?? 1,
      limit: res.data.meta?.limit ?? 20,
    };
  },

  getById: async (id: string): Promise<{Module}> => {
    const res = await apiClient.get<ApiResponse<{Module}>>(
      `/{module}s/${id}`
    );
    return res.data.data!;
  },

  create: async (payload: Create{Module}Payload): Promise<{Module}> => {
    const res = await apiClient.post<ApiResponse<{Module}>>(
      "/{module}s", payload
    );
    return res.data.data!;
  },

  update: async (id: string, payload: Update{Module}Payload): Promise<{Module}> => {
    const res = await apiClient.patch<ApiResponse<{Module}>>(
      `/{module}s/${id}`, payload
    );
    return res.data.data!;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/{module}s/${id}`);
  },
};
```

### الخطوة 4: TanStack Query Hooks (`src/hooks/use{Module}s.ts`)

```typescript
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { {module}sApi } from "../api/endpoints/{module}s";
import { QUERY_KEYS } from "../constants/config";
import type { {Module}, Create{Module}Payload, Update{Module}Payload,
  {Module}Filters, {Module}ListResponse } from "../types/{module}.types";

// ─── List ──────────────────────────────────────────────────────────────────────
export function use{Module}sList(
  filters: {Module}Filters = {},
  options?: Partial<UseQueryOptions<{Module}ListResponse>>,
) {
  return useQuery<{Module}ListResponse>({
    queryKey: [...QUERY_KEYS.{MODULE}S, filters],
    queryFn: () => {module}sApi.list(filters),
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
    ...options,
  });
}

// ─── Single ────────────────────────────────────────────────────────────────────
export function use{Module}(id: string | null) {
  return useQuery<{Module}>({
    queryKey: QUERY_KEYS.{MODULE}(id ?? ""),
    queryFn: () => {module}sApi.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

// ─── Create ────────────────────────────────────────────────────────────────────
export function useCreate{Module}() {
  const queryClient = useQueryClient();
  return useMutation<{Module}, Error, Create{Module}Payload>({
    mutationFn: {module}sApi.create,
    onSuccess: (created) => {
      queryClient.setQueryData(QUERY_KEYS.{MODULE}(created.id), created);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.{MODULE}S });
    },
  });
}

// ─── Update (مع Optimistic Update) ────────────────────────────────────────────
interface UpdateVars { id: string; payload: Update{Module}Payload }

export function useUpdate{Module}() {
  const queryClient = useQueryClient();
  return useMutation<{Module}, Error, UpdateVars>({
    mutationFn: ({ id, payload }) => {module}sApi.update(id, payload),

    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.{MODULE}(id) });
      const previous = queryClient.getQueryData<{Module}>(QUERY_KEYS.{MODULE}(id));

      // Optimistic update للـ detail cache
      if (previous) {
        queryClient.setQueryData<{Module}>(
          QUERY_KEYS.{MODULE}(id),
          { ...previous, ...payload }
        );
      }

      // Optimistic update لأي list cache
      queryClient.setQueriesData<{Module}ListResponse>(
        { queryKey: QUERY_KEYS.{MODULE}S },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) =>
              item.id === id ? { ...item, ...payload } : item
            ),
          };
        }
      );

      return { previous };
    },

    onError: (_err, { id }, ctx: any) => {
      if (ctx?.previous)
        queryClient.setQueryData(QUERY_KEYS.{MODULE}(id), ctx.previous);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.{MODULE}S });
    },

    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.{MODULE}(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.{MODULE}S });
    },
  });
}

// ─── Delete ────────────────────────────────────────────────────────────────────
export function useDelete{Module}() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: {module}sApi.remove,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.{MODULE}S });
      queryClient.setQueriesData<{Module}ListResponse>(
        { queryKey: QUERY_KEYS.{MODULE}S },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((item) => item.id !== id),
            total: old.total - 1,
          };
        }
      );
    },

    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.{MODULE}S });
    },

    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.{MODULE}(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.{MODULE}S });
    },
  });
}
```

### الخطوة 5: Components

#### `{Module}Card.tsx`

```tsx
// ✅ دائماً memo لمنع re-render غير ضروري
export default memo(function {Module}Card({ item, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      onLongPress={onLongPress}
      delayLongPress={400}
      // ⚠️ لا shadow-sm — استخدم border فقط (shadow props deprecated on web)
      className="flex-row items-center bg-white mx-4 mb-3 px-4 py-3.5 rounded-2xl border border-border"
      style={{ direction: "rtl" }}
    >
      {/* ... content */}
    </TouchableOpacity>
  );
});
```

#### `{Module}ListSkeleton.tsx`

```tsx
import { Platform } from "react-native";

// ⚠️ useNativeDriver يجب أن يكون false على الـ web
Animated.timing(opacity, {
  toValue: 1,
  duration: 700,
  useNativeDriver: Platform.OS !== "web", // ← ضروري
});
```

#### `{Module}Form.tsx` (Modal)

```tsx
import { Platform } from "react-native";

// ⚠️ نفس القاعدة في الـ slide animation
Animated.spring(slideY, {
  toValue: 0,
  useNativeDriver: Platform.OS !== "web", // ← ضروري
  bounciness: 4,
});
```

### الخطوة 6: List Screen (`app/(app)/{module}s.tsx`)

```tsx
const { data, isLoading, isFetching, refetch } = use{Module}sList(filters);

// ⚠️ data هو {Module}ListResponse بعد الـ mapping في الـ api layer
const items   = data?.data  ?? [];   // ← .data لا data مباشرة
const total   = data?.total ?? 0;
const hasMore = items.length < total;

// Skeleton فقط في أول load
const isFirstLoad = isLoading && items.length === 0;

return (
  <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
    {isFirstLoad ? (
      <{Module}ListSkeleton count={7} />
    ) : (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <{Module}Card item={item} onPress={...} onLongPress={...} />
        )}
        ListEmptyComponent={...}
        ListFooterComponent={...}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      />
    )}

    {/* FAB — استخدم style مباشرة للـ shadow على الـ FAB فقط (مقبول لأنه native component) */}
    <TouchableOpacity
      onPress={() => setShowForm(true)}
      className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center"
      style={{
        elevation: 6,
        shadowColor: "#3b82f6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      }}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
  </SafeAreaView>
);
```

### الخطوة 7: الترجمة (i18n)

#### 7.1 هيكل ملفات الترجمة

```
src/i18n/
  ar/
    common.json      ← مشترك بين كل التطبيق
    {module}.json    ← ترجمة الـ module بالعربي
  en/
    common.json
    {module}.json    ← ترجمة الـ module بالإنجليزي
  hook.ts            ← useAppTranslation
  index.ts           ← إعدادات i18next (الـ namespaces)
```

#### 7.2 إضافة ملفات الترجمة

اعمل **ملفين** — `src/i18n/ar/{module}.json` و `src/i18n/en/{module}.json`:

```json
// ar/{module}.json
{
  "title": "اسم القسم",
  "searchPlaceholder": "بحث...",
  "emptyTitle": "لا يوجد ...",
  "deleteTitle": "حذف ...",
  "deleteMessage": "هل أنت متأكد من حذف \"{{name}}\"?",
  "form": {
    "addTitle": "إضافة ...",
    "editTitle": "تعديل ...",
    "nameLabel": "الاسم *",
    "nameRequired": "الاسم مطلوب",
    "submitAdd": "إضافة",
    "submitEdit": "حفظ التعديلات",
    "addError": "فشل الإضافة",
    "editError": "فشل التعديل"
  }
}
```

#### 7.3 تسجيل الـ namespace في `src/i18n/index.ts`

```typescript
// 1. أضف الـ imports (مجمّعة حسب اللغة)
import {module}Ar from './ar/{module}.json';
import {module}En from './en/{module}.json';

// 2. أضف في APP_NAMESPACES
export const APP_NAMESPACES = [
  'common', 'nav', 'auth', 'dashboard', 'customers', 'settings',
  '{module}',   // ← أضف هنا
] as const;

// 3. أضف في resources
resources: {
  ar: { ..., {module}: {module}Ar },
  en: { ..., {module}: {module}En },
},
```

#### 7.4 الاستخدام في الـ screens والـ components

```tsx
import { useAppTranslation } from '../../src/i18n/hook';

export default function {Module}Screen() {
  // t()  → namespace الـ module
  // tc() → common namespace (cancel, delete, error, ...)
  const { t, tc, isRTL } = useAppTranslation('{module}');

  return (
    <>
      <Text>{t('title')}</Text>
      <Text>{t('form.nameLabel')}</Text>

      {/* مفاتيح مشتركة دائماً عن طريق tc() */}
      <Button title={tc('cancel')} />
      <Button title={tc('delete')} />
    </>
  );
}
```

#### 7.5 RTL

```tsx
const { isRTL } = useAppTranslation('{module}');

// للـ chevron direction
<Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} />

// للـ text direction في الـ cards
<TouchableOpacity style={{ direction: 'rtl' }}>
```

---

## 3. قائمة الأخطاء الشائعة وكيفية تجنبها

| الخطأ                                 | السبب                                                                    | الحل                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| قائمة فارغة مع 200 من الـ API         | `res.data.data` بيرجع مصفوفة مباشرة والكود يقرأ `.data.data` مرة تانية   | اعمل **mapping صريح** في `api.list()` كما في الخطوة 3                                |
| 403 على كل endpoints                  | `@UseGuards(PermissionsGuard)` تحت `@ProtectedWrite()` في الـ controller | في الـ backend: حط `@UseGuards(PermissionsGuard)` **فوق** `@ProtectedWrite()` دائماً |
| `useNativeDriver` warning على الـ web | `useNativeDriver: true` مش مدعوم على الـ web                             | `useNativeDriver: Platform.OS !== "web"`                                             |
| `shadow* props deprecated` warning    | `shadow-sm` NativeWind class تولّد old RN props                          | لا تستخدم `shadow-*` classes — استبدلها بـ `border border-border`                    |
| أرقام Decimal تظهر غلط                | Prisma يرجعها كـ string                                                  | `parseFloat(String(entity.amount))` عند الحساب، `String` في الـ type                 |
| Refresh token 401                     | الـ response يرجع `{ tokens: { accessToken, refreshToken } }` مش مباشرة  | اقرأ `response.data.data?.tokens?.accessToken`                                       |

---

## 4. Checklist قبل الـ Pull Request

```
□ شفت الـ actual JSON response من backend قبل كتابة أي type
□ الـ types تعكس الـ backend بالضبط (Decimal → string, nullable → | null)
□ api.list() فيها mapping صريح لـ { data, total, page, limit }
□ QUERY_KEYS مضافين في config.ts
□ screen بتقرأ data?.data لا data مباشرة
□ كل Animated.timing/spring فيها Platform.OS !== "web"
□ مفيش shadow-sm في className (استخدم border فقط)
□ Cards مغلّفة بـ memo()
□ Skeleton بيظهر فقط في isFirstLoad (مش في isFetching)
□ ListEmptyComponent فيها حالتين: empty search + empty list
□ FlatList فيها onEndReached للـ pagination
□ Delete فيه Alert تأكيد
□ ملفي ترجمة اتنشأوا: src/i18n/ar/{module}.json + src/i18n/en/{module}.json
□ الـ namespace اتضاف في APP_NAMESPACES وفي resources في index.ts
□ الـ screens بتستخدم useAppTranslation('{module}') مش useTranslation()
□ المفاتيح المشتركة (cancel/delete/error) بتجي من tc() مش t()
```

---

## 5. الـ Stack المستخدم (للـ reference)

| Layer         | Tool                                     |
| ------------- | ---------------------------------------- |
| UI Components | React Native + NativeWind v4 (Tailwind)  |
| Navigation    | Expo Router v4                           |
| Server State  | TanStack Query v5                        |
| Client State  | Zustand                                  |
| HTTP          | Axios (مع interceptor للـ JWT + refresh) |
| Icons         | @expo/vector-icons (Ionicons)            |
| Backend       | NestJS + Prisma v7 + PostgreSQL          |

---

## 6. نمط guards الـ Backend (مهم جداً)

```typescript
// ✅ الترتيب الصح — @UseGuards(PermissionsGuard) فوق @ProtectedWrite
@Get()
@UseGuards(PermissionsGuard)      // ← أولاً في الكود = يُنفَّذ أخيراً
@ProtectedRead()                  // ← ثانياً في الكود = يُنفَّذ أولاً (JWT → Roles → Tenant)
@RequirePermissions('viewParties')
async findAll() { ... }

// ❌ الترتيب الغلط — يسبب 403 لأن PermissionsGuard يشتغل قبل JWT
@Get()
@ProtectedRead()
@UseGuards(PermissionsGuard)   // ← ينفَّذ قبل JWT! request.user = undefined!
@RequirePermissions('viewParties')
async findAll() { ... }
```

> **السبب:** NestJS method decorators تُطبَّق bottom-to-top، و`@UseGuards` يـ append المصفوفة.
> الـ decorator الأخير في الكود = guards تُطبَّق أولاً في وقت التنفيذ.
