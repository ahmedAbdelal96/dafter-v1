/**
 * React Query Configuration
 * إعدادات متقدمة للـ Cache وإدارة البيانات
 *
 * ==================== Cache Strategy ====================
 *
 * 🔄 staleTime: المدة التي تعتبر فيها البيانات "طازجة" ولن يتم refetch
 * 🗑️ gcTime: المدة التي تبقى فيها البيانات في الذاكرة بعد أن تصبح inactive
 *
 * ==================== Guidelines ====================
 *
 * 1. البيانات الثابتة (Settings, Categories): staleTime طويل
 * 2. البيانات المتغيرة (Bookings, Dashboard): staleTime قصير
 * 3. البيانات الحساسة (Auth): لا cache أو قصير جداً
 * 4. Invalidation: يجب أن يحدث تلقائياً عند أي mutation
 */

// ==================== Time Constants ====================
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ==================== Cache Times by Category ====================

/**
 * Auth Cache Configuration
 * - User data: قصير لأن الـ session قد تنتهي
 * - Sessions: لا cache لأنها حساسة
 */
export const AUTH_CACHE = {
  user: {
    staleTime: 5 * TIME.MINUTE, // User data صالح لـ 5 دقائق
    gcTime: 30 * TIME.MINUTE,
  },
  sessions: {
    staleTime: 0, // دائماً fresh
    gcTime: 5 * TIME.MINUTE,
  },
  loginHistory: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Bookings Cache Configuration
 * - List: قصير جداً لأن الحجوزات تتغير باستمرار
 * - Single: متوسط
 * - Stats: يمكن أن يكون أطول قليلاً
 * - Calendar: قصير لأنه يجب أن يعكس التغييرات فوراً
 */
export const BOOKINGS_CACHE = {
  list: {
    staleTime: 30 * TIME.SECOND, // 30 ثانية فقط
    gcTime: 5 * TIME.MINUTE,
  },
  single: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  stats: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  calendar: {
    staleTime: 30 * TIME.SECOND, // مهم جداً أن يكون محدث
    gcTime: 5 * TIME.MINUTE,
  },
  availableSlots: {
    staleTime: TIME.MINUTE, // الـ slots تتغير
    gcTime: 5 * TIME.MINUTE,
  },
} as const;

/**
 * Clients Cache Configuration
 * - List: متوسط لأن العملاء لا يتغيرون كثيراً
 * - Single: أطول قليلاً
 * - Stats: يمكن أن يكون أطول
 */
export const CLIENTS_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  single: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  stats: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  notes: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  pointsHistory: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Customers Cache Configuration
 */
export const CUSTOMERS_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  single: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Suppliers Cache Configuration
 */
export const SUPPLIERS_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  single: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Employees Cache Configuration
 */
export const EMPLOYEES_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  single: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Products Cache Configuration
 */
export const PRODUCTS_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  single: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Expenses Cache Configuration
 */
export const EXPENSES_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  single: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  summary: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Ledger Cache Configuration
 */
export const LEDGER_CACHE = {
  statement: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Services Cache Configuration
 * - List: طويل نسبياً لأن الخدمات لا تتغير كثيراً
 * - Categories: طويل جداً
 * - Stats: متوسط
 */
export const SERVICES_CACHE = {
  list: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  single: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  categories: {
    staleTime: 30 * TIME.MINUTE, // نادراً ما تتغير
    gcTime: TIME.HOUR,
  },
  stats: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  addons: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
} as const;

/**
 * Staff Cache Configuration
 */
export const STAFF_CACHE = {
  list: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  single: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  performance: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
} as const;

/**
 * Users Cache Configuration
 */
export const USERS_CACHE = {
  list: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  single: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  stats: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
} as const;

/**
 * Accounting Cache Configuration
 * - Dashboard: قصير جداً لأنه يجب أن يعكس الأرقام الحقيقية
 * - Reports: متوسط لأنها تحسب على فترات
 * - Invoices: قصير
 */
export const ACCOUNTING_CACHE = {
  dashboard: {
    staleTime: TIME.MINUTE, // مهم جداً
    gcTime: 5 * TIME.MINUTE,
  },
  invoices: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  deferredSales: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  installments: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  expenses: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  reports: {
    staleTime: 5 * TIME.MINUTE, // التقارير تأخذ وقت لحسابها
    gcTime: 15 * TIME.MINUTE,
  },
  dailyCloses: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
} as const;

/**
 * Notifications Cache Configuration
 */
export const NOTIFICATIONS_CACHE = {
  list: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  templates: {
    staleTime: 15 * TIME.MINUTE, // نادراً ما تتغير
    gcTime: 30 * TIME.MINUTE,
  },
  settings: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  stats: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

/**
 * Settings Cache Configuration
 * - Settings: طويل جداً لأنها نادراً ما تتغير
 */
export const SETTINGS_CACHE = {
  all: {
    staleTime: 15 * TIME.MINUTE,
    gcTime: TIME.HOUR,
  },
  category: {
    staleTime: 15 * TIME.MINUTE,
    gcTime: TIME.HOUR,
  },
} as const;

/**
 * Loyalty Cache Configuration
 */
export const LOYALTY_CACHE = {
  rewards: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  settings: {
    staleTime: 15 * TIME.MINUTE,
    gcTime: TIME.HOUR,
  },
  stats: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
} as const;

/**
 * Reviews Cache Configuration
 */
export const REVIEWS_CACHE = {
  list: {
    staleTime: 2 * TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
  stats: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  public: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
} as const;

/**
 * Public Booking Cache Configuration
 * - للعملاء: يجب أن تكون البيانات دقيقة
 */
export const PUBLIC_BOOKING_CACHE = {
  info: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  services: {
    staleTime: 10 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  availability: {
    staleTime: 30 * TIME.SECOND, // مهم جداً
    gcTime: 5 * TIME.MINUTE,
  },
} as const;

// ==================== Default Query Options ====================

export const DEFAULT_QUERY_OPTIONS = {
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

// ==================== Mutation Options ====================

export const DEFAULT_MUTATION_OPTIONS = {
  retry: 1,
  retryDelay: 1000,
} as const;
