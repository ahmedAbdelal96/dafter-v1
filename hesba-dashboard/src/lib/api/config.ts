/**
 * API configuration used by active dashboard services.
 *
 * Scope is intentionally limited to modules currently wired in the frontend
 * (auth, users, notifications, settings) to reduce legacy template surface area.
 */
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const;

// Keep frontend query limits aligned with backend validation constraints.
// Backend PaginationQueryDto currently enforces limit <= 100.
export const API_LIMITS = {
  MAX_PAGE_LIMIT: 100,
  LOOKUP_LIMIT: 100,
  EXPORT_PAGE_SIZE: 100,
} as const;

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: "dafter_access_token",
  REFRESH_TOKEN_KEY: "dafter_refresh_token",
  TENANT_ID_KEY: "dafter_tenant_id",
  USER_KEY: "dafter_user",
  ACCESS_TOKEN_EXPIRY: Number(process.env.NEXT_PUBLIC_TOKEN_EXPIRY_DAYS) || 7,
  REFRESH_TOKEN_EXPIRY:
    Number(process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY_DAYS) || 30,
} as const;

export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    me: "/auth/me",
    changePassword: "/auth/change-password",
    sendVerificationEmail: "/auth/send-verification-email",
    verifyEmail: "/auth/verify-email",
    sessions: "/auth/sessions",
    revokeSession: (sessionId: string) => `/auth/sessions/${sessionId}`,
    loginHistory: "/auth/login-history",
  },

  companies: {
    me: "/companies/me",
    cashMode: "/companies/me/cash-reconciliation-mode",
  },

  cashReconciliation: {
    daily: "/cash-reconciliation/daily",
    dailyById: (id: string) => `/cash-reconciliation/daily/${id}`,
    history: "/cash-reconciliation/daily/history",
    summary: "/cash-reconciliation/summary",
    upsertDraft: "/cash-reconciliation/daily/draft",
    updateDraft: (id: string) => `/cash-reconciliation/daily/${id}/draft`,
    closeDraft: (id: string) => `/cash-reconciliation/daily/${id}/close`,
  },

  customers: {
    create: "/customers",
    list: "/customers",
    get: (id: string) => `/customers/${id}`,
    snapshot: (id: string) => `/customers/${id}/snapshot`,
    update: (id: string) => `/customers/${id}`,
    delete: (id: string) => `/customers/${id}`,
  },

  suppliers: {
    create: "/suppliers",
    list: "/suppliers",
    get: (id: string) => `/suppliers/${id}`,
    update: (id: string) => `/suppliers/${id}`,
    delete: (id: string) => `/suppliers/${id}`,
  },

  employees: {
    create: "/employees",
    list: "/employees",
    get: (id: string) => `/employees/${id}`,
    update: (id: string) => `/employees/${id}`,
    delete: (id: string) => `/employees/${id}`,
  },

  products: {
    create: "/products",
    list: "/products",
    get: (id: string) => `/products/${id}`,
    update: (id: string) => `/products/${id}`,
    delete: (id: string) => `/products/${id}`,
  },

  invoices: {
    create: "/invoices",
    createAndApprove: "/invoices/create-and-approve",
    createFromDeferredSale: (saleId: string) => `/invoices/from-deferred-sale/${saleId}`,
    list: "/invoices",
    get: (id: string) => `/invoices/${id}`,
    submit: (id: string) => `/invoices/${id}/submit`,
    approve: (id: string) => `/invoices/${id}/approve`,
    reject: (id: string) => `/invoices/${id}/reject`,
    cancel: (id: string) => `/invoices/${id}/cancel`,
    recordPayment: (id: string) => `/invoices/${id}/payments`,
    delete: (id: string) => `/invoices/${id}`,
  },

  payments: {
    create: "/payments",
    distribute: "/payments/distribute",
  },

  deferredSales: {
    create: "/deferred-sales",
    list: "/deferred-sales",
    get: (id: string) => `/deferred-sales/${id}`,
    recordPayment: (id: string) => `/deferred-sales/${id}/payments`,
    cancel: (id: string) => `/deferred-sales/${id}/cancel`,
  },

  installments: {
    createContract: "/installments/contracts",
    listContracts: "/installments/contracts",
    getContract: (id: string) => `/installments/contracts/${id}`,
    recordPayment: (id: string) => `/installments/contracts/${id}/payments`,
    cancelContract: (id: string) => `/installments/contracts/${id}/cancel`,
    schedule: "/installments/schedule",
  },

  expenses: {
    create: "/expenses",
    list: "/expenses",
    summary: "/expenses/summary",
    get: (id: string) => `/expenses/${id}`,
    update: (id: string) => `/expenses/${id}`,
    delete: (id: string) => `/expenses/${id}`,
  },

  ledger: {
    create: "/ledger",
    statement: "/ledger/statement",
    delete: (id: string) => `/ledger/${id}`,
  },

  reports: {
    summary: "/reports/summary",
    profitLoss: "/reports/profit-loss",
    cashFlow: "/reports/cash-flow",
    customersAging: "/reports/customers-aging",
    suppliersAging: "/reports/suppliers-aging",
    salesDetailed: "/reports/sales-detailed",
    expensesAnalytics: "/reports/expenses-analytics",
    productsPerformance: "/reports/products-performance",
    operationalPerformance: "/reports/operational-performance",
    criticalAlerts: "/reports/critical-alerts",
    ledgerStatement: "/reports/ledger-statement",
    collectionsFollowup: "/reports/collections-followup",
    debtsSummary: "/reports/debts-summary",
    staffActivity: "/reports/staff-activity",
    simpleLedger: "/reports/simple-ledger",
  },

  dashboard: {
    overview: "/dashboard/overview",
    charts: "/dashboard/charts",
    highlights: "/dashboard/highlights",
    alerts: "/dashboard/alerts",
  },

  platformDashboard: {
    overview: "/platform-dashboard/overview",
    charts: "/platform-dashboard/charts",
    health: "/platform-dashboard/health",
  },

  platform: {
    companies: "/platform/companies",
    company: (id: string) => `/platform/companies/${id}`,
    auditLogs: "/platform/audit-logs",
    disableCompany: (id: string) => `/platform/companies/${id}/disable`,
    enableCompany: (id: string) => `/platform/companies/${id}/enable`,
    archiveCompany: (id: string) => `/platform/companies/${id}/archive`,
    restoreCompany: (id: string) => `/platform/companies/${id}/restore`,
    companyMetrics: (id: string) => `/platform/companies/${id}/metrics`,
    plans: "/platform/plans",
    plan: (id: string) => `/platform/plans/${id}`,
    activateSubscription: "/platform/subscriptions/activate",
    suspendSubscription: "/platform/subscriptions/suspend",
    extendSubscription: "/platform/subscriptions/extend",
    changePlan: "/platform/subscriptions/change-plan",
    users: "/platform/users",
    usersStats: "/platform/users/stats",
    createStaffUser: "/platform/users/staff",
    user: (id: string) => `/platform/users/${id}`,
    updateUserPermissions: (id: string) => `/platform/users/${id}/permissions`,
    disableUser: (id: string) => `/platform/users/${id}/disable`,
    enableUser: (id: string) => `/platform/users/${id}/enable`,
    resetUserCredentials: (id: string) => `/platform/users/${id}/credentials/reset`,
    capabilities: "/platform/capabilities",
    settings: "/platform/settings",
    featureFlags: "/platform/settings/feature-flags",
    featureFlag: (name: string) => `/platform/settings/feature-flags/${name}`,
  },
  pricing: {
    listForCustomer: (customerId: string) => `/pricing/customer/${customerId}`,
    setForProduct: (customerId: string, productId: string) =>
      `/pricing/customer/${customerId}/product/${productId}`,
  },

  entitlements: {
    mine: "/my/entitlements",
    featureCatalog: "/plans/feature-catalog",
  },

  users: {
    createStaff: "/users/staff",
    list: "/users",
    stats: "/users/stats",
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    updatePermissions: (id: string) => `/users/${id}/permissions`,
    disable: (id: string) => `/users/${id}/disable`,
    enable: (id: string) => `/users/${id}/enable`,
    resetCredentials: (id: string) => `/users/${id}/reset-credentials`,
  },

  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
    registerDeviceToken: "/notifications/device-token",
    unregisterDeviceToken: (token: string) => `/notifications/device-token/${token}`,
  },

  settings: {
    getAll: "/settings",
    getCategory: (category: string) => `/settings/${category}`,
    updateGeneral: "/settings/general",
    updateBranding: "/settings/branding",
    uploadLogo: "/settings/branding/logo",
    uploadCover: "/settings/branding/cover",
    deleteLogo: "/settings/branding/logo",
    deleteCover: "/settings/branding/cover",
    updateBusinessHours: "/settings/business-hours",
    updateBooking: "/settings/booking",
    updateNotification: "/settings/notification",
    updateLoyalty: "/settings/loyalty",
    resetCategory: (category: string) => `/settings/${category}/reset`,
  },
} as const;
