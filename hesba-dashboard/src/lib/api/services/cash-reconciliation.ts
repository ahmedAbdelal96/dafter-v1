import httpClient from "../http-client";
import { API_ENDPOINTS } from "@/lib/api/config";

export type CashReconciliationMode = "DISABLED" | "SIMPLE_DAILY";
export type CashReconciliationStatus = "DRAFT" | "CLOSED";

export interface CompanyCashMode {
  id: string;
  cashReconciliationMode: CashReconciliationMode;
  cashModeUpdatedByUserId: string | null;
  cashModeUpdatedAt: string | null;
}

export interface UpdateCompanyCashModePayload {
  mode: CashReconciliationMode;
}

export interface DailyCashReconciliationRecord {
  id: string;
  companyId: string;
  businessDate: string;
  status: CashReconciliationStatus;
  openingCash: string | number;
  cashSalesOutsideSystem: string | number;
  cashExpensesOutsideSystem: string | number;
  actualCashCounted: string | number;
  expectedCash: string | number;
  variance: string | number;
  note: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  closedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface UpsertDailyCashReconciliationPayload {
  businessDate: string;
  openingCash?: number;
  cashSalesOutsideSystem?: number;
  cashExpensesOutsideSystem?: number;
  actualCashCounted?: number;
  note?: string;
}

export interface UpdateDailyCashReconciliationPayload {
  openingCash?: number;
  cashSalesOutsideSystem?: number;
  cashExpensesOutsideSystem?: number;
  actualCashCounted?: number;
  note?: string;
}

export interface UpsertDailyCashReconciliationResult {
  record: DailyCashReconciliationRecord;
  created: boolean;
}

export interface CashReconciliationHistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: CashReconciliationStatus;
  page?: number;
  limit?: number;
}

export interface CashReconciliationHistoryMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CashReconciliationHistoryResponse {
  items: DailyCashReconciliationRecord[];
  meta: CashReconciliationHistoryMeta;
}

export interface CashReconciliationSummary {
  range: {
    dateFrom: string | null;
    dateTo: string | null;
  };
  totals: {
    totalRecords: number;
    draftCount: number;
    closedCount: number;
    totalVariance: number;
    positiveVarianceDays: number;
    negativeVarianceDays: number;
  };
  latestClosedRecord: DailyCashReconciliationRecord | null;
}

export const cashReconciliationApi = {
  async getCompanyMode(): Promise<CompanyCashMode> {
    const res = await httpClient.get<{ data: CompanyCashMode }>(API_ENDPOINTS.companies.cashMode);
    return res.data.data;
  },

  async updateCompanyMode(payload: UpdateCompanyCashModePayload): Promise<CompanyCashMode> {
    const res = await httpClient.patch<{ data: CompanyCashMode }>(
      API_ENDPOINTS.companies.cashMode,
      payload,
    );
    return res.data.data;
  },

  async getDaily(businessDate: string): Promise<DailyCashReconciliationRecord | null> {
    const res = await httpClient.get<{ data: DailyCashReconciliationRecord | null }>(
      API_ENDPOINTS.cashReconciliation.daily,
      { params: { businessDate } },
    );
    return res.data.data;
  },

  async getDailyById(id: string): Promise<DailyCashReconciliationRecord> {
    const res = await httpClient.get<{ data: DailyCashReconciliationRecord }>(
      API_ENDPOINTS.cashReconciliation.dailyById(id),
    );
    return res.data.data;
  },

  async getHistory(
    filters?: CashReconciliationHistoryFilters,
  ): Promise<CashReconciliationHistoryResponse> {
    const res = await httpClient.get<{
      data: DailyCashReconciliationRecord[];
      meta?: CashReconciliationHistoryMeta;
    }>(API_ENDPOINTS.cashReconciliation.history, { params: filters });

    const items = res.data.data ?? [];
    const meta = res.data.meta ?? {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? Math.max(items.length, 1),
      total: items.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    return { items, meta };
  },

  async getSummary(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CashReconciliationSummary> {
    const res = await httpClient.get<{ data: CashReconciliationSummary }>(
      API_ENDPOINTS.cashReconciliation.summary,
      { params },
    );
    return res.data.data;
  },

  async upsertDraft(
    payload: UpsertDailyCashReconciliationPayload,
  ): Promise<UpsertDailyCashReconciliationResult> {
    const res = await httpClient.post<{ data: UpsertDailyCashReconciliationResult }>(
      API_ENDPOINTS.cashReconciliation.upsertDraft,
      payload,
    );
    return res.data.data;
  },

  async updateDraft(
    id: string,
    payload: UpdateDailyCashReconciliationPayload,
  ): Promise<DailyCashReconciliationRecord> {
    const res = await httpClient.patch<{ data: DailyCashReconciliationRecord }>(
      API_ENDPOINTS.cashReconciliation.updateDraft(id),
      payload,
    );
    return res.data.data;
  },

  async closeDraft(id: string): Promise<DailyCashReconciliationRecord> {
    const res = await httpClient.patch<{ data: DailyCashReconciliationRecord }>(
      API_ENDPOINTS.cashReconciliation.closeDraft(id),
      {},
    );
    return res.data.data;
  },
};
