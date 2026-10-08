// ─── Reports API ──────────────────────────────────────────────────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  ReportsSummary,
  SummaryParams,
  OverdueReport,
  CollectionSchedule,
  CollectionParams,
  DateRangeParams,
  ProfitLossReport,
  CashFlowReport,
  AgingReport,
  SalesDetailedReport,
  CollectionsFollowupReport,
  ExpensesAnalyticsReport,
  DebtsSummaryReport,
  ProductsPerformanceReport,
  OperationalPerformanceReport,
  CriticalAlertsReport,
  StaffActivityReport,
  LedgerStatementParams,
  LedgerStatementReport,
} from '../types';

function toAgingQuery(params?: DateRangeParams): { asOfDate?: string } | undefined {
  if (!params) return undefined;
  return { asOfDate: params.dateTo ?? params.dateFrom };
}

export const reportsApi = {
  /** GET /reports/summary */
  getSummary: async (params?: SummaryParams): Promise<ReportsSummary> => {
    const res = await apiClient.get<{ data: ReportsSummary }>(
      API_ENDPOINTS.reports.summary,
      { params },
    );
    return res.data.data;
  },

  /**
   * GET /reports/overdue
   * Returns { deferredSales: [...], installmentSchedules: [...] }
   */
  getOverdue: async (): Promise<OverdueReport> => {
    const res = await apiClient.get<{ data: OverdueReport }>(
      API_ENDPOINTS.reports.overdue,
    );
    return res.data.data;
  },

  /**
   * GET /reports/collection-schedule?dateFrom=X&dateTo=X
   * Backend returns data as a direct array (not wrapped in { items: [] })
   */
  getCollectionSchedule: async (
    params: CollectionParams,
  ): Promise<CollectionSchedule> => {
    const res = await apiClient.get<{ data: CollectionSchedule }>(
      API_ENDPOINTS.reports.collectionSchedule,
      { params },
    );
    // data may be an array directly or wrapped — normalise
    const raw = res.data.data;
    return Array.isArray(raw) ? raw : [];
  },

  /** GET /reports/profit-loss */
  getProfitLoss: async (params?: DateRangeParams): Promise<ProfitLossReport> => {
    const res = await apiClient.get<{ data: ProfitLossReport }>(
      API_ENDPOINTS.reports.profitLoss,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/cash-flow */
  getCashFlow: async (params?: DateRangeParams): Promise<CashFlowReport> => {
    const res = await apiClient.get<{ data: CashFlowReport }>(
      API_ENDPOINTS.reports.cashFlow,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/customers-aging */
  getCustomersAging: async (params?: DateRangeParams): Promise<AgingReport> => {
    const agingQuery = toAgingQuery(params);
    const res = await apiClient.get<{ data: AgingReport }>(
      API_ENDPOINTS.reports.customersAging,
      { params: agingQuery },
    );
    return res.data.data;
  },

  /** GET /reports/suppliers-aging */
  getSuppliersAging: async (params?: DateRangeParams): Promise<AgingReport> => {
    const agingQuery = toAgingQuery(params);
    const res = await apiClient.get<{ data: AgingReport }>(
      API_ENDPOINTS.reports.suppliersAging,
      { params: agingQuery },
    );
    return res.data.data;
  },

  /** GET /reports/sales-detailed */
  getSalesDetailed: async (params?: DateRangeParams): Promise<SalesDetailedReport> => {
    const res = await apiClient.get<{ data: SalesDetailedReport }>(
      API_ENDPOINTS.reports.salesDetailed,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/collections-followup */
  getCollectionsFollowup: async (
    params?: DateRangeParams,
  ): Promise<CollectionsFollowupReport> => {
    const res = await apiClient.get<{ data: CollectionsFollowupReport }>(
      API_ENDPOINTS.reports.collectionsFollowup,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/expenses-analytics */
  getExpensesAnalytics: async (params?: DateRangeParams): Promise<ExpensesAnalyticsReport> => {
    const res = await apiClient.get<{ data: ExpensesAnalyticsReport }>(
      API_ENDPOINTS.reports.expensesAnalytics,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/debts-summary */
  getDebtsSummary: async (params?: DateRangeParams): Promise<DebtsSummaryReport> => {
    const res = await apiClient.get<{ data: DebtsSummaryReport }>(
      API_ENDPOINTS.reports.debtsSummary,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/products-performance */
  getProductsPerformance: async (params?: DateRangeParams): Promise<ProductsPerformanceReport> => {
    const res = await apiClient.get<{ data: ProductsPerformanceReport }>(
      API_ENDPOINTS.reports.productsPerformance,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/operational-performance */
  getOperationalPerformance: async (params?: DateRangeParams): Promise<OperationalPerformanceReport> => {
    const res = await apiClient.get<{ data: OperationalPerformanceReport }>(
      API_ENDPOINTS.reports.operationalPerformance,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/critical-alerts */
  getCriticalAlerts: async (params?: DateRangeParams): Promise<CriticalAlertsReport> => {
    const res = await apiClient.get<{ data: CriticalAlertsReport }>(
      API_ENDPOINTS.reports.criticalAlerts,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/staff-activity */
  getStaffActivity: async (params?: DateRangeParams): Promise<StaffActivityReport> => {
    const res = await apiClient.get<{ data: StaffActivityReport }>(
      API_ENDPOINTS.reports.staffActivity,
      { params },
    );
    return res.data.data;
  },

  /** GET /reports/ledger-statement — requires partyType + partyId */
  getLedgerStatement: async (params: LedgerStatementParams): Promise<LedgerStatementReport> => {
    const res = await apiClient.get<{ data: LedgerStatementReport }>(
      API_ENDPOINTS.reports.ledgerStatement,
      { params },
    );
    return res.data.data;
  },
};
