/**
 * Daftar Mobile Dashboard — API Configuration
 *
 * All backend endpoints in one place, matching NestJS controller routes exactly.
 * Backend base: http://[host]:7000/api/v1
 * Swagger docs: http://[host]:7000/api/docs
 *
 * Conventions:
 *   - Static paths are plain strings.
 *   - Parameterized paths are arrow functions → string.
 *   - Token storage: expo-secure-store (encrypted), NOT cookies.
 */

// ─── Secure Storage Keys ──────────────────────────────────────────────────────

export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'dafter_access_token',
  REFRESH_TOKEN: 'dafter_refresh_token',
  /** Company ID (= tenant scope for every API request) */
  TENANT_ID: 'dafter_company_id',
  USER: 'dafter_user',
  TENANT: 'dafter_company',
} as const;

// ─── React Query Cache Config ─────────────────────────────────────────────────

export const QUERY_CONFIG = {
  /** Data is considered fresh for 2 minutes before a background refetch */
  staleTime: 2 * 60 * 1000,
  /** Evict unused cache entries after 5 minutes */
  gcTime: 5 * 60 * 1000,
} as const;

/**
 * Retry strategy: retry transient errors (network, 5xx) up to 2 times.
 * Never retry deterministic client errors (4xx), except 401 which is
 * handled by the Axios token-refresh interceptor separately.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  // Bail immediately on any client error except 401 (handled by interceptor)
  if (status && status >= 400 && status < 500 && status !== 401) return false;
  return failureCount < 2;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────
// Centralised so every hook and invalidation call uses the same key shape.

export const QUERY_KEYS = {
  // Dashboard — keyed by preset so switching periods is cache-isolated
  DASHBOARD_OVERVIEW: (preset: string) =>
    ['dashboard', 'overview', preset] as const,
  DASHBOARD_ALERTS: (preset: string) =>
    ['dashboard', 'alerts', preset] as const,
  DASHBOARD_RECEIVABLES: ['dashboard', 'receivables'] as const,
  CUSTOMERS_OVERDUE: ['customers', 'overdue'] as const,

  // Customers
  CUSTOMERS: ['customers'] as const,
  CUSTOMER: (id: string) => ['customers', id] as const,
  CUSTOMER_SNAPSHOT: (id: string) => ['customers', id, 'snapshot'] as const,
  CUSTOMER_FREQUENT_PRODUCTS: (id: string) =>
    ['customers', id, 'frequent-products'] as const,
  CUSTOMER_PRICES: (customerId: string) =>
    ['pricing', 'customer', customerId] as const,

  // Suppliers
  SUPPLIERS: ['suppliers'] as const,
  SUPPLIER: (id: string) => ['suppliers', id] as const,

  // Employees
  EMPLOYEES: ['employees'] as const,
  EMPLOYEE: (id: string) => ['employees', id] as const,

  // Ledger
  LEDGER: ['ledger'] as const,
  STATEMENT: (partyId: string) => ['ledger', 'statement', partyId] as const,

  // Expenses
  EXPENSES: ['expenses'] as const,
  EXPENSE: (id: string) => ['expenses', id] as const,
  EXPENSES_SUMMARY: ['expenses', 'summary'] as const,

  // Products
  PRODUCTS: ['products'] as const,
  PRODUCT: (id: string) => ['products', id] as const,
  PRODUCTS_SEARCH: ['products', 'search'] as const,
  PRODUCTS_RECENT: ['products', 'recent'] as const,

  // Invoices
  INVOICES: ['invoices'] as const,
  INVOICE: (id: string) => ['invoices', id] as const,
  INVOICE_LAST_FOR_CUSTOMER: (customerId: string) =>
    ['invoices', 'customer', customerId, 'last'] as const,

  // Deferred Sales
  DEFERRED_SALES: ['deferred-sales'] as const,
  DEFERRED_SALE: (id: string) => ['deferred-sales', id] as const,

  // Installments
  INSTALLMENTS: ['installments'] as const,
  INSTALLMENT: (id: string) => ['installments', id] as const,

  // Reports
  REPORTS_SUMMARY: ['reports', 'summary'] as const,
  REPORTS_OVERDUE: ['reports', 'overdue'] as const,
  REPORTS_COLLECTION: ['reports', 'collection'] as const,
  REPORTS_PROFIT_LOSS: ['reports', 'profit-loss'] as const,
  REPORTS_CASH_FLOW: ['reports', 'cash-flow'] as const,
  REPORTS_CUSTOMERS_AGING: ['reports', 'customers-aging'] as const,
  REPORTS_SUPPLIERS_AGING: ['reports', 'suppliers-aging'] as const,
  REPORTS_SALES_DETAILED: ['reports', 'sales-detailed'] as const,
  REPORTS_COLLECTIONS_FOLLOWUP: ['reports', 'collections-followup'] as const,
  REPORTS_EXPENSES_ANALYTICS: ['reports', 'expenses-analytics'] as const,
  REPORTS_DEBTS_SUMMARY: ['reports', 'debts-summary'] as const,
  REPORTS_PRODUCTS_PERFORMANCE: ['reports', 'products-performance'] as const,
  REPORTS_OPERATIONAL_PERFORMANCE: ['reports', 'operational-performance'] as const,
  REPORTS_CRITICAL_ALERTS: ['reports', 'critical-alerts'] as const,
  REPORTS_STAFF_ACTIVITY: ['reports', 'staff-activity'] as const,
  REPORTS_LEDGER_STATEMENT: ['reports', 'ledger-statement'] as const,

  // Notifications
  NOTIFICATIONS: ['notifications'] as const,
  UNREAD_COUNT: ['notifications', 'unread-count'] as const,

  // Users / Staff
  USERS: ['users'] as const,
  USER: (id: string) => ['users', id] as const,
  USERS_STATS: ['users', 'stats'] as const,

  // Entitlements
  ENTITLEMENTS: ['entitlements'] as const,

  // Platform (Super Admin)
  // My company profile
  MY_COMPANY: ['company', 'me'] as const,

  PLATFORM_COMPANIES: ['platform', 'companies'] as const,
  PLATFORM_COMPANY: (id: string) => ['platform', 'companies', id] as const,
  PLATFORM_COMPANY_METRICS: (id: string) => ['platform', 'companies', id, 'metrics'] as const,
  PLATFORM_CAPABILITIES: ['platform', 'capabilities'] as const,
  PLATFORM_PLANS: ['platform', 'plans'] as const,
  PLATFORM_STATS: ['platform', 'stats'] as const,
  PLATFORM_AUDIT_LOGS: ['platform', 'audit-logs'] as const,
  PLATFORM_AUDIT_LOOKUPS: ['platform', 'audit-lookups'] as const,
  PLATFORM_SETTINGS: ['platform', 'settings'] as const,
  PLATFORM_FEATURE_FLAGS: ['platform', 'feature-flags'] as const,

  // Platform Users (scoped per company)
  PLATFORM_USERS: (companyId: string) => ['platform', 'users', companyId] as const,
  PLATFORM_USER_STATS: (companyId: string) => ['platform', 'users', companyId, 'stats'] as const,
} as const;

// Hard delete is disabled by default and always disabled in production.
// This mirrors backend archival-first policy.
export const PLATFORM_CAPABILITIES_FALLBACK = {
  canHardDeleteCompany:
    process.env.EXPO_PUBLIC_ALLOW_COMPANY_HARD_DELETE === 'true' &&
    process.env.NODE_ENV !== 'production',
} as const;

// ─── API Endpoints ────────────────────────────────────────────────────────────

export const API_ENDPOINTS = {
  // ── Companies (Tenant Self-Management) ────────────────────────────────────
  companies: {
    /** GET /companies/me — fetch authenticated company's own profile */
    me: '/companies/me',
    /** PATCH /companies/me — update company name / phone / address / currency */
    updateMe: '/companies/me',
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    /**
     * GET /dashboard/overview — KPIs + operations + alert counts.
     * Query params: preset (TODAY|WEEK|MONTH|YEAR|LAST_30_DAYS), dateFrom, dateTo
     */
    overview: '/dashboard/overview',
    /**
     * GET /dashboard/alerts — detailed alert items (overdue, credit risks).
     * Query params: preset, dateFrom, dateTo, limit (1-50)
     */
    alerts: '/dashboard/alerts',
    /**
     * GET /dashboard/highlights — top customers / products / employees.
     * Query params: preset, dateFrom, dateTo, limit (1-10)
     */
    highlights: '/dashboard/highlights',
    /**
     * GET /dashboard/charts — trend data for sales/expenses/collections.
     * Query params: preset, dateFrom, dateTo, granularity (AUTO|DAY|MONTH)
     */
    charts: '/dashboard/charts',
    /** GET /dashboard/receivables — receivables summary + overdue snapshot (B7.1) */
    receivables: '/dashboard/receivables',
  },

  // ── Users (OWNER manages STAFF) ───────────────────────────────────────────
  users: {
    /** POST /users/staff — create a new STAFF user (OWNER only) */
    createStaff: '/users/staff',
    /** GET /users/stats — total/active/disabled/staff counts (OWNER only) */
    stats: '/users/stats',
    list: '/users',
    get: (id: string) => `/users/${id}`,
    /** PATCH /users/:id — update fullName/phone only (OWNER only) */
    update: (id: string) => `/users/${id}`,
    /** PATCH /users/:id/permissions — update permission flags (OWNER only) */
    updatePermissions: (id: string) => `/users/${id}/permissions`,
    /** PATCH /users/:id/disable — soft-disable user (OWNER only) */
    disable: (id: string) => `/users/${id}/disable`,
    /** PATCH /users/:id/enable — re-activate disabled user (OWNER only) */
    enable: (id: string) => `/users/${id}/enable`,
    /** POST /users/:id/reset-credentials — trigger OTP reset for staff (OWNER only) */
    resetCredentials: (id: string) => `/users/${id}/reset-credentials`,
  },

  // ── Customers ─────────────────────────────────────────────────────────────
  customers: {
    create: '/customers',
    list: '/customers',
    get: (id: string) => `/customers/${id}`,
    update: (id: string) => `/customers/${id}`,
    delete: (id: string) => `/customers/${id}`,
    snapshot: (id: string) => `/customers/${id}/snapshot`,
    frequentProducts: (id: string) => `/customers/${id}/frequent-products`,
    overdue: '/customers/overdue',
  },

  // ── Suppliers ─────────────────────────────────────────────────────────────
  suppliers: {
    create: '/suppliers',
    list: '/suppliers',
    get: (id: string) => `/suppliers/${id}`,
    update: (id: string) => `/suppliers/${id}`,
    delete: (id: string) => `/suppliers/${id}`,
  },

  // ── Employees ─────────────────────────────────────────────────────────────
  employees: {
    create: '/employees',
    list: '/employees',
    get: (id: string) => `/employees/${id}`,
    /**
     * PATCH /employees/:id — requires `version` field in body for
     * optimistic locking. Server returns 409 if version is stale.
     */
    update: (id: string) => `/employees/${id}`,
    delete: (id: string) => `/employees/${id}`,
  },

  // ── Ledger ────────────────────────────────────────────────────────────────
  ledger: {
    /** POST /ledger — create a new entry */
    create: '/ledger',
    /**
     * GET /ledger/statement — paginated statement with running balance.
     * Query params: partyType, partyId, page, limit, dateFrom?, dateTo?
     * NOTE: partyType + partyId are passed as query params (NOT path params).
     */
    statement: '/ledger/statement',
    /** DELETE /ledger/:entryId — soft-delete a ledger entry */
    delete: (entryId: string) => `/ledger/${entryId}`,
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    create: '/expenses',
    list: '/expenses',
    /** GET /expenses/summary — aggregates by category + total */
    summary: '/expenses/summary',
    get: (id: string) => `/expenses/${id}`,
    update: (id: string) => `/expenses/${id}`,
    delete: (id: string) => `/expenses/${id}`,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    create: '/products',
    list: '/products',
    search: '/products/search',
    recent: '/products/recent',
    get: (id: string) => `/products/${id}`,
    lastPrice: (id: string) => `/products/${id}/last-price`,
    update: (id: string) => `/products/${id}`,
    delete: (id: string) => `/products/${id}`,
  },

  // ── Invoices ──────────────────────────────────────────────────────────────
  invoices: {
    create: '/invoices',
    fromDeferredSale: (saleId: string) => `/invoices/from-deferred-sale/${saleId}`,
    duplicate: (invoiceId: string) => `/invoices/duplicate/${invoiceId}`,
    list: '/invoices',
    get: (id: string) => `/invoices/${id}`,
    delete: (id: string) => `/invoices/${id}`,
    submit: (id: string) => `/invoices/${id}/submit`,
    approve: (id: string) => `/invoices/${id}/approve`,
    reject: (id: string) => `/invoices/${id}/reject`,
    cancel: (id: string) => `/invoices/${id}/cancel`,
    recordPayment: (id: string) => `/invoices/${id}/payments`,
    customerLast: (customerId: string) => `/invoices/customer/${customerId}/last`,
  },

  // ── Standalone Payments ───────────────────────────────────────────────────
  payments: {
    standalone: '/payments',
    distribute: '/payments/distribute',
  },

  // ── Deferred Sales (بيع آجل) ───────────────────────────────────────────────
  deferredSales: {
    create: '/deferred-sales',
    list: '/deferred-sales',
    get: (id: string) => `/deferred-sales/${id}`,
    update: (id: string) => `/deferred-sales/${id}`,
    delete: (id: string) => `/deferred-sales/${id}`,
    /** POST /deferred-sales/:id/payments — record a partial payment */
    recordPayment: (id: string) => `/deferred-sales/${id}/payments`,
  },

  // ── Installments (بيع بالتقسيط) ────────────────────────────────────────────
  installments: {
    /** POST /installments/contracts — create a new contract */
    create: '/installments/contracts',
    /** GET /installments/contracts — paginated list with filters */
    list: '/installments/contracts',
    /** GET /installments/contracts/:id?includePayments=true */
    get: (id: string) => `/installments/contracts/${id}`,
    /** POST /installments/contracts/:id/payments — record payment on a schedule row */
    recordPayment: (contractId: string) => `/installments/contracts/${contractId}/payments`,
    /** PATCH /installments/contracts/:id/cancel — cancel (OWNER only) */
    cancel: (id: string) => `/installments/contracts/${id}/cancel`,
    /** GET /installments/schedule — cross-contract schedule view */
    schedule: '/installments/schedule',
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    /** GET /reports/summary — totals for a date range */
    summary: '/reports/summary',
    /** GET /reports/overdue — overdue deferred sales + installments */
    overdue: '/reports/overdue',
    /** GET /reports/collection-schedule — upcoming due dates */
    collectionSchedule: '/reports/collection-schedule',
    /** GET /reports/profit-loss */
    profitLoss: '/reports/profit-loss',
    /** GET /reports/cash-flow */
    cashFlow: '/reports/cash-flow',
    /** GET /reports/customers-aging */
    customersAging: '/reports/customers-aging',
    /** GET /reports/suppliers-aging */
    suppliersAging: '/reports/suppliers-aging',
    /** GET /reports/sales-detailed */
    salesDetailed: '/reports/sales-detailed',
    /** GET /reports/collections-followup */
    collectionsFollowup: '/reports/collections-followup',
    /** GET /reports/expenses-analytics */
    expensesAnalytics: '/reports/expenses-analytics',
    /** GET /reports/debts-summary */
    debtsSummary: '/reports/debts-summary',
    /** GET /reports/products-performance */
    productsPerformance: '/reports/products-performance',
    /** GET /reports/operational-performance */
    operationalPerformance: '/reports/operational-performance',
    /** GET /reports/critical-alerts */
    criticalAlerts: '/reports/critical-alerts',
    /** GET /reports/staff-activity */
    staffActivity: '/reports/staff-activity',
    /** GET /reports/ledger-statement?partyType=CUSTOMER&partyId=X */
    ledgerStatement: '/reports/ledger-statement',
  },

  // ── Pricing ───────────────────────────────────────────────────────────────
  pricing: {
    /** GET /pricing/customer/:customerId — all custom prices for a customer */
    listForCustomer: (customerId: string) => `/pricing/customer/${customerId}`,
    /** GET /pricing/customer/:customerId/product/:productId */
    getForProduct: (customerId: string, productId: string) =>
      `/pricing/customer/${customerId}/product/${productId}`,
    /** PUT /pricing/customer/:customerId/product/:productId */
    setForProduct: (customerId: string, productId: string) =>
      `/pricing/customer/${customerId}/product/${productId}`,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list: '/notifications',
    /** GET /notifications/unread-count → { count: number } */
    unreadCount: '/notifications/unread-count',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    /** POST /notifications/device-token — register Expo push token */
    registerToken: '/notifications/device-token',
    /** DELETE /notifications/device-token/:token — unregister */
    unregisterToken: (token: string) => `/notifications/device-token/${encodeURIComponent(token)}`,
  },

  // ── Entitlements ──────────────────────────────────────────────────────────
  entitlements: {
    /** GET /my/entitlements — effective features + quotas for this company */
    mine: '/my/entitlements',
    /** GET /plans/feature-catalog — all features keyed by plan */
    catalog: '/plans/feature-catalog',
  },

  // ── Platform (Super Admin) ─────────────────────────────────────────────────
  platform: {
    // Companies (tenants)
    companies: '/platform/companies',
    company: (id: string) => `/platform/companies/${id}`,
    companyMetrics: (id: string) => `/platform/companies/${id}/metrics`,
    archiveCompany: (id: string) => `/platform/companies/${id}/archive`,
    restoreCompany: (id: string) => `/platform/companies/${id}/restore`,
    deleteCompany: (id: string) => `/platform/companies/${id}`,
    disableCompany: (id: string) => `/platform/companies/${id}/disable`,
    enableCompany: (id: string) => `/platform/companies/${id}/enable`,
    capabilities: '/platform/capabilities',
    auditLogs: '/platform/audit-logs',
    auditLogLookups: '/platform/audit-logs/lookups',
    settings: '/platform/settings',
    featureFlags: '/platform/settings/feature-flags',

    // Subscriptions
    activateSubscription: '/platform/subscriptions/activate',
    suspendSubscription: '/platform/subscriptions/suspend',
    extendSubscription: '/platform/subscriptions/extend',
    changePlan: '/platform/subscriptions/change-plan',

    // Plans
    plans: '/platform/plans',
    plan: (id: string) => `/platform/plans/${id}`,

    // Platform Users (all require companyId)
    /** GET /platform/users?companyId= | POST /platform/users/staff */
    users: '/platform/users',
    user: (id: string) => `/platform/users/${id}`,
    /** GET /platform/users/stats?companyId= */
    userStats: '/platform/users/stats',
    /** POST /platform/users/staff */
    createStaff: '/platform/users/staff',
    /** PATCH /platform/users/:id — body includes companyId */
    updateUser: (id: string) => `/platform/users/${id}`,
    /** PATCH /platform/users/:id/disable — body includes companyId */
    disableUser: (id: string) => `/platform/users/${id}/disable`,
    /** PATCH /platform/users/:id/enable — body includes companyId */
    enableUser: (id: string) => `/platform/users/${id}/enable`,
  },
} as const;
