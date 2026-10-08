/**
 * React Query key factory.
 *
 * This file intentionally includes only keys required by active hooks/modules.
 */

export const companyKeys = {
  all: ["company"] as const,
  me: () => [...companyKeys.all, "me"] as const,
  cashMode: () => [...companyKeys.all, "cash-mode"] as const,
};

export const cashReconciliationKeys = {
  all: ["cash-reconciliation"] as const,
  daily: (businessDate: string) =>
    [...cashReconciliationKeys.all, "daily", businessDate] as const,
  detail: (id: string) => [...cashReconciliationKeys.all, "detail", id] as const,
  history: (filters?: unknown) =>
    [...cashReconciliationKeys.all, "history", filters] as const,
  summary: (filters?: unknown) =>
    [...cashReconciliationKeys.all, "summary", filters] as const,
};

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  sessions: () => [...authKeys.all, "sessions"] as const,
  loginHistory: () => [...authKeys.all, "login-history"] as const,
};

export const usersKeys = {
  all: ["users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) => [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, "detail"] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  stats: () => [...usersKeys.all, "stats"] as const,
};

export const customersKeys = {
  all: ["customers"] as const,
  lists: () => [...customersKeys.all, "list"] as const,
  list: (filters?: unknown) =>
    [...customersKeys.lists(), filters] as const,
  details: () => [...customersKeys.all, "detail"] as const,
  detail: (id: string) => [...customersKeys.details(), id] as const,
  snapshots: () => [...customersKeys.all, "snapshot"] as const,
  snapshot: (id: string) => [...customersKeys.snapshots(), id] as const,
};

export const suppliersKeys = {
  all: ["suppliers"] as const,
  lists: () => [...suppliersKeys.all, "list"] as const,
  list: (filters?: unknown) =>
    [...suppliersKeys.lists(), filters] as const,
  details: () => [...suppliersKeys.all, "detail"] as const,
  detail: (id: string) => [...suppliersKeys.details(), id] as const,
};

export const employeesKeys = {
  all: ["employees"] as const,
  lists: () => [...employeesKeys.all, "list"] as const,
  list: (filters?: unknown) =>
    [...employeesKeys.lists(), filters] as const,
  details: () => [...employeesKeys.all, "detail"] as const,
  detail: (id: string) => [...employeesKeys.details(), id] as const,
};

export const productsKeys = {
  all: ["products"] as const,
  lists: () => [...productsKeys.all, "list"] as const,
  list: (filters?: unknown) =>
    [...productsKeys.lists(), filters] as const,
  details: () => [...productsKeys.all, "detail"] as const,
  detail: (id: string) => [...productsKeys.details(), id] as const,
};

export const expensesKeys = {
  all: ["expenses"] as const,
  lists: () => [...expensesKeys.all, "list"] as const,
  list: (filters?: unknown) => [...expensesKeys.lists(), filters] as const,
  details: () => [...expensesKeys.all, "detail"] as const,
  detail: (id: string) => [...expensesKeys.details(), id] as const,
  summaries: () => [...expensesKeys.all, "summary"] as const,
  summary: (filters?: unknown) => [...expensesKeys.summaries(), filters] as const,
};

export const ledgerKeys = {
  all: ["ledger"] as const,
  statements: () => [...ledgerKeys.all, "statement"] as const,
  statement: (filters?: unknown) =>
    [...ledgerKeys.statements(), filters] as const,
};

export const invoicesKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoicesKeys.all, "list"] as const,
  list: (filters?: unknown) => [...invoicesKeys.lists(), filters] as const,
  details: () => [...invoicesKeys.all, "detail"] as const,
  detail: (id: string) => [...invoicesKeys.details(), id] as const,
};

export const deferredSalesKeys = {
  all: ["deferred-sales"] as const,
  lists: () => [...deferredSalesKeys.all, "list"] as const,
  list: (filters?: unknown) => [...deferredSalesKeys.lists(), filters] as const,
  details: () => [...deferredSalesKeys.all, "detail"] as const,
  detail: (id: string) => [...deferredSalesKeys.details(), id] as const,
};

export const installmentsKeys = {
  all: ["installments"] as const,
  contracts: () => [...installmentsKeys.all, "contracts"] as const,
  contractsList: (filters?: unknown) =>
    [...installmentsKeys.contracts(), "list", filters] as const,
  contractDetail: (id: string, includePayments = false) =>
    [...installmentsKeys.contracts(), "detail", id, { includePayments }] as const,
  schedules: () => [...installmentsKeys.all, "schedule"] as const,
  scheduleList: (filters?: unknown) =>
    [...installmentsKeys.schedules(), "list", filters] as const,
};

export const notificationsKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationsKeys.all, "list"] as const,
  list: (filters?: unknown) =>
    [...notificationsKeys.lists(), filters] as const,
  unreadCount: () => [...notificationsKeys.all, "unread-count"] as const,
};

export const reportsKeys = {
  all: ["reports"] as const,
  summary: (filters?: unknown) => [...reportsKeys.all, "summary", filters] as const,
  profitLoss: (filters?: unknown) => [...reportsKeys.all, "profit-loss", filters] as const,
  cashFlow: (filters?: unknown) => [...reportsKeys.all, "cash-flow", filters] as const,
  customersAging: (filters?: unknown) => [...reportsKeys.all, "customers-aging", filters] as const,
  suppliersAging: (filters?: unknown) => [...reportsKeys.all, "suppliers-aging", filters] as const,
  salesDetailed: (filters?: unknown) => [...reportsKeys.all, "sales-detailed", filters] as const,
  expensesAnalytics: (filters?: unknown) => [...reportsKeys.all, "expenses-analytics", filters] as const,
  productsPerformance: (filters?: unknown) =>
    [...reportsKeys.all, "products-performance", filters] as const,
  operationalPerformance: (filters?: unknown) =>
    [...reportsKeys.all, "operational-performance", filters] as const,
  criticalAlerts: (filters?: unknown) => [...reportsKeys.all, "critical-alerts", filters] as const,
  ledgerStatement: (filters?: unknown) => [...reportsKeys.all, "ledger-statement", filters] as const,
  collectionsFollowup: (filters?: unknown) =>
    [...reportsKeys.all, "collections-followup", filters] as const,
  debtsSummary: (filters?: unknown) =>
    [...reportsKeys.all, "debts-summary", filters] as const,
  staffActivity: (filters?: unknown) =>
    [...reportsKeys.all, "staff-activity", filters] as const,
  simpleLedger: (filters?: unknown) =>
    [...reportsKeys.all, "simple-ledger", filters] as const,
};

export const taxSetupKeys = {
  all: ["tax-setup"] as const,
  registrationProfile: () => [...taxSetupKeys.all, "registration-profile"] as const,
  taxRates: () => [...taxSetupKeys.all, "tax-rates"] as const,
  taxRate: (id: string) => [...taxSetupKeys.taxRates(), id] as const,
  taxTreatments: () => [...taxSetupKeys.all, "tax-treatments"] as const,
  taxTreatment: (id: string) => [...taxSetupKeys.taxTreatments(), id] as const,
  defaultPolicy: () => [...taxSetupKeys.all, "default-policy"] as const,
  accountBindings: () => [...taxSetupKeys.all, "account-bindings"] as const,
  moduleApplicabilityRules: () =>
    [...taxSetupKeys.all, "module-applicability-rules"] as const,
  moduleApplicabilityRule: (moduleKey: string) =>
    [...taxSetupKeys.moduleApplicabilityRules(), moduleKey] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (filters?: unknown) => [...dashboardKeys.all, "overview", filters] as const,
  charts: (filters?: unknown) => [...dashboardKeys.all, "charts", filters] as const,
  highlights: (filters?: unknown) => [...dashboardKeys.all, "highlights", filters] as const,
  alerts: (filters?: unknown) => [...dashboardKeys.all, "alerts", filters] as const,
};

export const platformDashboardKeys = {
  all: ["platform-dashboard"] as const,
  overview: (filters?: unknown) =>
    [...platformDashboardKeys.all, "overview", filters] as const,
  charts: (filters?: unknown) =>
    [...platformDashboardKeys.all, "charts", filters] as const,
  health: (filters?: unknown) =>
    [...platformDashboardKeys.all, "health", filters] as const,
};

export const platformKeys = {
  all: ["platform"] as const,
  companies: () => [...platformKeys.all, "companies"] as const,
  companiesList: (filters?: unknown) =>
    [...platformKeys.companies(), "list", filters] as const,
  company: (id: string) => [...platformKeys.all, "company", id] as const,
  companyMetrics: (id: string) =>
    [...platformKeys.all, "company-metrics", id] as const,
  plans: (includeInactive = false) =>
    [...platformKeys.all, "plans", { includeInactive }] as const,
  plansUsage: (includeArchived = true) =>
    [...platformKeys.all, "plans-usage", { includeArchived }] as const,
  users: () => [...platformKeys.all, "users"] as const,
  usersList: (filters?: unknown) =>
    [...platformKeys.users(), "list", filters] as const,
  user: (id: string, companyId: string) =>
    [...platformKeys.users(), "detail", id, { companyId }] as const,
  usersStats: (companyId: string) =>
    [...platformKeys.users(), "stats", { companyId }] as const,
  auditLogs: (filters?: unknown) =>
    [...platformKeys.all, "audit-logs", filters] as const,
  auditLookups: (filters?: unknown) =>
    [...platformKeys.all, "audit-lookups", filters] as const,
  settings: () => [...platformKeys.all, "settings"] as const,
  featureFlags: () => [...platformKeys.all, "feature-flags"] as const,
  capabilities: () => [...platformKeys.all, "capabilities"] as const,
};

export const pricingKeys = {
  all: ["pricing"] as const,
  forCustomer: (customerId: string) =>
    [...pricingKeys.all, "customer", customerId] as const,
};

export const entitlementsKeys = {
  all: ["entitlements"] as const,
  mine: () => [...entitlementsKeys.all, "mine"] as const,
  featureCatalog: () => [...entitlementsKeys.all, "feature-catalog"] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  allSettings: () => [...settingsKeys.all, "all"] as const,
  category: (category: string) => [...settingsKeys.all, category] as const,
};

export const queryKeys = {
  auth: authKeys,
  company: companyKeys,
  cashReconciliation: cashReconciliationKeys,
  pricing: pricingKeys,
  customers: customersKeys,
  suppliers: suppliersKeys,
  employees: employeesKeys,
  products: productsKeys,
  expenses: expensesKeys,
  ledger: ledgerKeys,
  invoices: invoicesKeys,
  deferredSales: deferredSalesKeys,
  installments: installmentsKeys,
  users: usersKeys,
  notifications: notificationsKeys,
  settings: settingsKeys,
  reports: reportsKeys,
  dashboard: dashboardKeys,
  platformDashboard: platformDashboardKeys,
  platform: platformKeys,
  entitlements: entitlementsKeys,
  taxSetup: taxSetupKeys,
};
