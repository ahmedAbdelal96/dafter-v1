import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  ExpenseRecord,
  ExpenseFilters,
  CreateExpenseRequestPayload,
  UpdateExpenseRequestPayload,
  ExpensesListMeta,
  ExpensesListResponse,
  ExpensesSummaryResponse,
} from "../types";

type ExpensesListApiPayload =
  | (ApiResponse<ExpenseRecord[]> & { meta?: ExpensesListMeta })
  | ApiEnvelope<{ items: ExpenseRecord[]; meta: ExpensesListMeta }>;

type ExpensesSummaryApiPayload =
  | ApiResponse<ExpensesSummaryResponse>
  | ApiEnvelope<ExpensesSummaryResponse>;

type DeleteExpenseResult = null;

function isStructuredExpensesList(
  value: unknown
): value is { items: ExpenseRecord[]; meta: ExpensesListMeta } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && Boolean(candidate.meta);
}

function isExpensesListContainer(
  value: unknown
): value is { items: ExpenseRecord[]; meta?: ExpensesListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

function normalizeExpensesList(payload: ExpensesListApiPayload): ExpensesListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as ExpenseRecord[],
      meta: {
        total: payload.length,
        page: 1,
        limit: Math.max(payload.length, 1),
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  if (isExpensesListContainer(payload)) {
    const items = payload.items;
    const meta = payload.meta ?? {
      total: items.length,
      page: 1,
      limit: Math.max(items.length, 1),
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    return { items, meta };
  }

  if (isApiEnvelope<unknown>(payload) && isStructuredExpensesList(payload.data)) {
    return payload.data;
  }

  const rawData = isApiEnvelope<unknown>(payload)
    ? payload.data
    : (payload as { data?: unknown }).data;
  const items = Array.isArray(rawData) ? (rawData as ExpenseRecord[]) : [];

  return {
    items,
    meta: {
      total: items.length,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

function normalizeExpensesSummary(payload: ExpensesSummaryApiPayload): ExpensesSummaryResponse {
  const extracted = extractData(payload);
  return {
    totalAmount: String(extracted?.totalAmount ?? "0"),
    count: Number(extracted?.count ?? 0),
    byCategory: Array.isArray(extracted?.byCategory)
      ? extracted.byCategory.map((item) => ({
          category: item.category,
          total: String(item.total ?? "0"),
          count: Number(item.count ?? 0),
        }))
      : [],
  };
}

export const expensesApi = {
  async getAll(filters?: ExpenseFilters): Promise<ExpensesListResponse> {
    const response = await httpClient.get<ExpensesListApiPayload>(API_ENDPOINTS.expenses.list, {
      params: filters,
    });
    return normalizeExpensesList(response.data);
  },

  async getSummary(filters?: ExpenseFilters): Promise<ExpensesSummaryResponse> {
    const response = await httpClient.get<ExpensesSummaryApiPayload>(
      API_ENDPOINTS.expenses.summary,
      {
        params: filters,
      }
    );
    return normalizeExpensesSummary(response.data);
  },

  async getById(id: string): Promise<ExpenseRecord> {
    const response = await httpClient.get<ExpenseRecord | ApiResponse<ExpenseRecord>>(
      API_ENDPOINTS.expenses.get(id)
    );
    return extractData(response.data);
  },

  async create(payload: CreateExpenseRequestPayload): Promise<ExpenseRecord> {
    const response = await httpClient.post<ExpenseRecord | ApiResponse<ExpenseRecord>>(
      API_ENDPOINTS.expenses.create,
      payload
    );
    return extractData(response.data);
  },

  async update(id: string, payload: UpdateExpenseRequestPayload): Promise<ExpenseRecord> {
    const response = await httpClient.patch<ExpenseRecord | ApiResponse<ExpenseRecord>>(
      API_ENDPOINTS.expenses.update(id),
      payload
    );
    return extractData(response.data);
  },

  async delete(id: string): Promise<DeleteExpenseResult> {
    const response = await httpClient.delete<DeleteExpenseResult | ApiResponse<DeleteExpenseResult>>(
      API_ENDPOINTS.expenses.delete(id)
    );
    return extractData(response.data);
  },
};
