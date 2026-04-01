import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";

export type DashboardPeriodPreset = "today" | "week" | "month" | "year" | "last30days";
export type DashboardChartGranularity = "auto" | "day" | "month";

export interface DashboardBaseFilters {
  preset?: DashboardPeriodPreset;
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardChartsFilters extends DashboardBaseFilters {
  granularity?: DashboardChartGranularity;
}

export interface DashboardHighlightsFilters extends DashboardBaseFilters {
  limit?: number;
}

export interface DashboardAlertsFilters extends DashboardBaseFilters {
  limit?: number;
}

export interface DashboardOverviewResponse {
  company: {
    id: string;
    name: string;
    currencyCode: string;
  };
  period: {
    dateFrom: string;
    dateTo: string;
    preset: string;
  };
  kpis: {
    totalSales: string;
    totalExpenses: string;
    netProfit: string;
    collectionAmount: string;
    receivables: string;
    payables: string;
    cashNetFlow: string;
  };
  operations: {
    invoicesCount: number;
    deferredSalesCount: number;
    installmentContractsCount: number;
    overdueCount: number;
    activeCustomers: number;
    activeProducts: number;
    activeEmployees: number;
  };
  alerts: {
    overdueDeferredSales: number;
    overdueInstallments: number;
    customersNearCreditLimit: number;
    criticalNegativeBalances: number;
  };
}

export interface DashboardPoint {
  label: string;
  value: number;
}

export interface DashboardChartsResponse {
  salesTrend: DashboardPoint[];
  expensesTrend: DashboardPoint[];
  collectionsTrend: DashboardPoint[];
  receivablesVsPayables: {
    receivables: number;
    payables: number;
  };
  salesDistribution: {
    cash: number;
    deferred: number;
    installment: number;
  };
}

export interface DashboardHighlightsResponse {
  topCustomers: Array<{
    id: string;
    name: string;
    totalSales: string;
    outstandingBalance: string;
  }>;
  topProducts: Array<{
    id: string | null;
    name: string;
    quantitySold: string;
    salesAmount: string;
  }>;
  topEmployees: Array<{
    id: string;
    name: string;
    invoicesCount: number;
    salesAmount: string;
    collectionsAmount: string;
  }>;
}

export interface DashboardAlertItem {
  type: "OVERDUE_DEFERRED" | "OVERDUE_INSTALLMENT" | "CREDIT_LIMIT_RISK" | "CRITICAL_PAYABLE";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  amount?: string;
  dueDate?: string;
}

export interface DashboardAlertsResponse {
  items: DashboardAlertItem[];
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  const source = payload as { data?: T } | null | undefined;
  return (source?.data ?? payload) as T;
}

function buildDateParams(filters: DashboardBaseFilters) {
  if (filters.dateFrom && filters.dateTo) {
    return {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    };
  }

  return {
    preset: filters.preset ?? "month",
  };
}

export const dashboardApi = {
  async getOverview(filters: DashboardBaseFilters = {}): Promise<DashboardOverviewResponse> {
    const response = await httpClient.get(API_ENDPOINTS.dashboard.overview, {
      params: buildDateParams(filters),
    });

    return unwrapEnvelope<DashboardOverviewResponse>(response.data);
  },

  async getCharts(filters: DashboardChartsFilters = {}): Promise<DashboardChartsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.dashboard.charts, {
      params: {
        ...buildDateParams(filters),
        granularity: filters.granularity ?? "auto",
      },
    });

    return unwrapEnvelope<DashboardChartsResponse>(response.data);
  },

  async getHighlights(filters: DashboardHighlightsFilters = {}): Promise<DashboardHighlightsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.dashboard.highlights, {
      params: {
        ...buildDateParams(filters),
        limit: filters.limit ?? 5,
      },
    });

    return unwrapEnvelope<DashboardHighlightsResponse>(response.data);
  },

  async getAlerts(filters: DashboardAlertsFilters = {}): Promise<DashboardAlertsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.dashboard.alerts, {
      params: {
        ...buildDateParams(filters),
        limit: filters.limit ?? 10,
      },
    });

    return unwrapEnvelope<DashboardAlertsResponse>(response.data);
  },
};
