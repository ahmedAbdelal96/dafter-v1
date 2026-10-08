import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";
import type {
  AgingFilters,
  AgingResponse,
  CashFlowFilters,
  CashFlowResponse,
  CriticalAlertsFilters,
  CriticalAlertsResponse,
  ReportsSummaryFilters,
  ReportsSummaryResponse,
  CollectionsFollowupFilters,
  CollectionsFollowupReportResponse,
  DebtsSummaryFilters,
  DebtsSummaryReportResponse,
  ExpensesAnalyticsFilters,
  ExpensesAnalyticsResponse,
  OperationalPerformanceFilters,
  OperationalPerformanceResponse,
  ProductsPerformanceFilters,
  ProductsPerformanceResponse,
  ProfitLossFilters,
  ProfitLossResponse,
  ReportsMeta,
  ReportsLedgerStatementFilters,
  ReportsLedgerStatementResponse,
  SalesDetailedFilters,
  SalesDetailedResponse,
  SimpleLedgerFilters,
  SimpleLedgerReportResponse,
  StaffActivityFilters,
  StaffActivityReportResponse,
} from "../types";

type MetaCandidate = Partial<ReportsMeta> | null | undefined;

type ReportApiEnvelope<T> = {
  data?: T;
  meta?: MetaCandidate;
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMeta(meta: MetaCandidate, fallbackCount: number, page = 1, limit = 10): ReportsMeta {
  const safePage = Math.max(1, toNumber(meta?.page, page));
  const safeLimit = Math.max(1, toNumber(meta?.limit, limit));
  const safeTotal = Math.max(0, toNumber(meta?.total, fallbackCount));
  const totalPages = Math.max(1, toNumber(meta?.totalPages, Math.ceil(safeTotal / safeLimit)));

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNext: Boolean(meta?.hasNext ?? safePage < totalPages),
    hasPrev: Boolean(meta?.hasPrev ?? safePage > 1),
  };
}

function unwrapData<T>(payload: unknown): { data: T; meta: MetaCandidate } {
  if (isApiEnvelope<T>(payload)) {
    const envelope = payload as ReportApiEnvelope<T>;
    return {
      data: envelope.data as T,
      meta: envelope.meta,
    };
  }

  const source = (payload ?? {}) as ReportApiEnvelope<T>;
  if (source.data !== undefined) {
    return {
      data: source.data,
      meta: source.meta,
    };
  }

  return {
    data: payload as T,
    meta: source.meta,
  };
}

function normalizeCollectionsFollowup(payload: unknown): CollectionsFollowupReportResponse {
  const { data, meta } = unwrapData<Omit<CollectionsFollowupReportResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    period: data?.period ?? { dateFrom: "", dateTo: "" },
    summary: data?.summary ?? {
      expectedAmount: "0.00",
      collectedAmount: "0.00",
      collectionRatePercent: "0.00",
      overdueOutstanding: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeDebtsSummary(payload: unknown): DebtsSummaryReportResponse {
  const { data, meta } = unwrapData<Omit<DebtsSummaryReportResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    totals: data?.totals ?? {
      customersReceivable: "0.00",
      customersCredit: "0.00",
      suppliersReceivable: "0.00",
      suppliersPayable: "0.00",
      netReceivable: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeStaffActivity(payload: unknown): StaffActivityReportResponse {
  const { data, meta } = unwrapData<Omit<StaffActivityReportResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    period: data?.period ?? { dateFrom: "", dateTo: "" },
    summary: data?.summary ?? {
      usersCount: 0,
      totalActivities: 0,
      totalInvoices: 0,
      totalInvoiceAmount: "0.00",
      totalCollections: "0.00",
      totalExpenses: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeSimpleLedger(payload: unknown): SimpleLedgerReportResponse {
  const { data, meta } = unwrapData<Omit<SimpleLedgerReportResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    party: data?.party ?? null,
    openingBalance: data?.openingBalance ?? "0.00",
    totalDebit: data?.totalDebit ?? "0.00",
    totalCredit: data?.totalCredit ?? "0.00",
    closingBalance: data?.closingBalance ?? "0.00",
    currentBalance: data?.currentBalance ?? "0.00",
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeSummary(payload: unknown): ReportsSummaryResponse {
  const { data } = unwrapData<Partial<ReportsSummaryResponse>>(payload);
  return {
    totalReceivables: data?.totalReceivables ?? "0.00",
    deferredSales: {
      total: Number(data?.deferredSales?.total ?? 0),
      totalAmount: data?.deferredSales?.totalAmount ?? "0.00",
      paidAmount: data?.deferredSales?.paidAmount ?? "0.00",
      remainingAmount: data?.deferredSales?.remainingAmount ?? "0.00",
      overdueCount: Number(data?.deferredSales?.overdueCount ?? 0),
      overdueAmount: data?.deferredSales?.overdueAmount ?? "0.00",
    },
    installments: {
      activeContracts: Number(data?.installments?.activeContracts ?? 0),
      totalAmount: data?.installments?.totalAmount ?? "0.00",
      paidAmount: data?.installments?.paidAmount ?? "0.00",
      remainingAmount: data?.installments?.remainingAmount ?? "0.00",
      overdueSchedules: Number(data?.installments?.overdueSchedules ?? 0),
      overdueAmount: data?.installments?.overdueAmount ?? "0.00",
    },
  };
}

function normalizeProfitLoss(payload: unknown): ProfitLossResponse {
  const { data } = unwrapData<ProfitLossResponse>(payload);
  return data;
}

function normalizeCashFlow(payload: unknown): CashFlowResponse {
  const { data, meta } = unwrapData<Omit<CashFlowResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    period: data?.period ?? { dateFrom: "", dateTo: "", days: 0 },
    totals: data?.totals ?? {
      openingBalance: "0.00",
      inflow: "0.00",
      outflow: "0.00",
      netChange: "0.00",
      closingBalance: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeAging(payload: unknown): AgingResponse {
  const { data, meta } = unwrapData<Omit<AgingResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    asOfDate: data?.asOfDate ?? "",
    summary: data?.summary ?? {
      partiesCount: 0,
      totalOutstanding: "0.00",
      bucket_0_30: "0.00",
      bucket_31_60: "0.00",
      bucket_61_90: "0.00",
      bucket_90_plus: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeSalesDetailed(payload: unknown): SalesDetailedResponse {
  const { data, meta } = unwrapData<Omit<SalesDetailedResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    summary: data?.summary ?? {
      invoicesCount: 0,
      grossAmount: "0.00",
      taxAmount: "0.00",
      netAmount: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeExpensesAnalytics(payload: unknown): ExpensesAnalyticsResponse {
  const { data, meta } = unwrapData<Omit<ExpensesAnalyticsResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    period: data?.period ?? { dateFrom: "", dateTo: "", days: 0 },
    summary: data?.summary ?? {
      totalAmount: "0.00",
      expensesCount: 0,
      averageExpense: "0.00",
    },
    byCategory: Array.isArray(data?.byCategory) ? data.byCategory : [],
    comparison: data?.comparison ?? null,
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeProductsPerformance(payload: unknown): ProductsPerformanceResponse {
  const { data, meta } = unwrapData<Omit<ProductsPerformanceResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    summary: data?.summary ?? {
      totalProducts: 0,
      totalQuantity: "0.000",
      totalSalesAmount: "0.00",
    },
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

function normalizeOperationalPerformance(payload: unknown): OperationalPerformanceResponse {
  const { data } = unwrapData<OperationalPerformanceResponse>(payload);
  return data;
}

function normalizeCriticalAlerts(payload: unknown): CriticalAlertsResponse {
  const { data } = unwrapData<CriticalAlertsResponse>(payload);
  return data;
}

function normalizeLedgerStatement(payload: unknown): ReportsLedgerStatementResponse {
  const { data, meta } = unwrapData<Omit<ReportsLedgerStatementResponse, "meta">>(payload);
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    party: data?.party ?? null,
    openingBalance: data?.openingBalance ?? "0.00",
    totalDebit: data?.totalDebit ?? "0.00",
    totalCredit: data?.totalCredit ?? "0.00",
    closingBalance: data?.closingBalance ?? "0.00",
    currentBalance: data?.currentBalance ?? "0.00",
    items,
    meta: normalizeMeta(meta, items.length),
  };
}

export const reportsApi = {
  async getSummary(filters: ReportsSummaryFilters): Promise<ReportsSummaryResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.summary, {
      params: filters,
    });
    return normalizeSummary(response.data);
  },

  async getProfitLoss(filters: ProfitLossFilters): Promise<ProfitLossResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.profitLoss, { params: filters });
    return normalizeProfitLoss(response.data);
  },

  async getCashFlow(filters: CashFlowFilters): Promise<CashFlowResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.cashFlow, { params: filters });
    return normalizeCashFlow(response.data);
  },

  async getCustomersAging(filters: AgingFilters): Promise<AgingResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.customersAging, { params: filters });
    return normalizeAging(response.data);
  },

  async getSuppliersAging(filters: AgingFilters): Promise<AgingResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.suppliersAging, { params: filters });
    return normalizeAging(response.data);
  },

  async getSalesDetailed(filters: SalesDetailedFilters): Promise<SalesDetailedResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.salesDetailed, { params: filters });
    return normalizeSalesDetailed(response.data);
  },

  async getExpensesAnalytics(filters: ExpensesAnalyticsFilters): Promise<ExpensesAnalyticsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.expensesAnalytics, { params: filters });
    return normalizeExpensesAnalytics(response.data);
  },

  async getProductsPerformance(
    filters: ProductsPerformanceFilters
  ): Promise<ProductsPerformanceResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.productsPerformance, { params: filters });
    return normalizeProductsPerformance(response.data);
  },

  async getOperationalPerformance(
    filters: OperationalPerformanceFilters
  ): Promise<OperationalPerformanceResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.operationalPerformance, { params: filters });
    return normalizeOperationalPerformance(response.data);
  },

  async getCriticalAlerts(filters: CriticalAlertsFilters): Promise<CriticalAlertsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.criticalAlerts, { params: filters });
    return normalizeCriticalAlerts(response.data);
  },

  async getLedgerStatement(
    filters: ReportsLedgerStatementFilters
  ): Promise<ReportsLedgerStatementResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.ledgerStatement, { params: filters });
    return normalizeLedgerStatement(response.data);
  },

  async getCollectionsFollowup(filters: CollectionsFollowupFilters): Promise<CollectionsFollowupReportResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.collectionsFollowup, {
      params: filters,
    });
    return normalizeCollectionsFollowup(response.data);
  },

  async getDebtsSummary(filters: DebtsSummaryFilters): Promise<DebtsSummaryReportResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.debtsSummary, {
      params: filters,
    });
    return normalizeDebtsSummary(response.data);
  },

  async getStaffActivity(filters: StaffActivityFilters): Promise<StaffActivityReportResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.staffActivity, {
      params: filters,
    });
    return normalizeStaffActivity(response.data);
  },

  async getSimpleLedger(filters: SimpleLedgerFilters): Promise<SimpleLedgerReportResponse> {
    const response = await httpClient.get(API_ENDPOINTS.reports.simpleLedger, {
      params: filters,
    });
    return normalizeSimpleLedger(response.data);
  },
};
