import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  CreateDeferredSaleRequest,
  DeferredSaleDetailsRecord,
  DeferredSaleRecord,
  DeferredSalesFilters,
  DeferredSalesListMeta,
  DeferredSalesListResponse,
  RecordDeferredPaymentRequest,
} from "../types";

type DeferredSalesListPayload =
  | (ApiResponse<DeferredSaleRecord[]> & { meta?: DeferredSalesListMeta })
  | ApiEnvelope<{ items: DeferredSaleRecord[]; total: number; page: number; limit: number }>;

function isStructuredList(
  value: unknown
): value is { items: DeferredSaleRecord[]; total: number; page: number; limit: number } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.items) &&
    typeof candidate.total === "number" &&
    typeof candidate.page === "number" &&
    typeof candidate.limit === "number"
  );
}

function toMeta(total: number, page: number, limit: number): DeferredSalesListMeta {
  const safeLimit = Math.max(limit || 10, 1);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  return {
    total,
    page,
    limit: safeLimit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function normalizeDeferredSalesList(payload: DeferredSalesListPayload): DeferredSalesListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: toMeta(payload.length, 1, Math.max(payload.length, 1)),
    };
  }

  if (isApiEnvelope<unknown>(payload) && isStructuredList(payload.data)) {
    return {
      items: payload.data.items,
      meta: toMeta(payload.data.total, payload.data.page, payload.data.limit),
    };
  }

  const direct = payload as { items?: unknown; meta?: DeferredSalesListMeta };
  if (Array.isArray(direct.items)) {
    const items = direct.items as DeferredSaleRecord[];
    const meta =
      direct.meta ??
      toMeta(items.length, 1, Math.max(items.length, 1));

    return { items, meta };
  }

  const extracted = extractData(payload as ApiResponse<DeferredSaleRecord[]>);
  const items = Array.isArray(extracted) ? extracted : [];
  return { items, meta: toMeta(items.length, 1, Math.max(items.length, 1)) };
}

export const deferredSalesApi = {
  async getAll(filters?: DeferredSalesFilters): Promise<DeferredSalesListResponse> {
    const response = await httpClient.get<DeferredSalesListPayload>(API_ENDPOINTS.deferredSales.list, {
      params: filters,
    });

    return normalizeDeferredSalesList(response.data);
  },

  async getById(id: string): Promise<DeferredSaleDetailsRecord> {
    const response = await httpClient.get<
      DeferredSaleDetailsRecord | ApiResponse<DeferredSaleDetailsRecord>
    >(API_ENDPOINTS.deferredSales.get(id));

    return extractData(response.data);
  },

  async create(payload: CreateDeferredSaleRequest): Promise<DeferredSaleRecord> {
    const response = await httpClient.post<DeferredSaleRecord | ApiResponse<DeferredSaleRecord>>(
      API_ENDPOINTS.deferredSales.create,
      payload,
    );

    return extractData(response.data);
  },

  async recordPayment(id: string, payload: RecordDeferredPaymentRequest): Promise<void> {
    await httpClient.post(API_ENDPOINTS.deferredSales.recordPayment(id), payload);
  },

  async cancel(id: string): Promise<void> {
    await httpClient.patch(API_ENDPOINTS.deferredSales.cancel(id));
  },
};
