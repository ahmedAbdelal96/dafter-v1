import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  CreateInvoiceRequest,
  InvoiceDetailsRecord,
  RecordInvoicePaymentRequest,
  InvoicesFilters,
  InvoicesListMeta,
  InvoicesListResponse,
  InvoiceSummaryItem,
} from "../types";

type InvoicesListApiPayload =
  | (ApiResponse<InvoiceSummaryItem[]> & { meta?: InvoicesListMeta })
  | ApiEnvelope<{ items: InvoiceSummaryItem[]; meta: InvoicesListMeta }>;

type DeleteInvoiceResult = null;
type InvoiceDetailsApiPayload = ApiEnvelope<InvoiceDetailsRecord> | ApiResponse<InvoiceDetailsRecord>;
type InvoiceLifecycleResult = InvoiceDetailsRecord | null;
type InvoiceLifecycleApiPayload = ApiEnvelope<InvoiceLifecycleResult> | ApiResponse<InvoiceLifecycleResult>;

function isStructuredInvoicesList(
  value: unknown
): value is { items: InvoiceSummaryItem[]; meta: InvoicesListMeta } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && Boolean(candidate.meta);
}

function isInvoicesListContainer(
  value: unknown
): value is { items: InvoiceSummaryItem[]; meta?: InvoicesListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

function normalizeInvoicesList(payload: InvoicesListApiPayload): InvoicesListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as InvoiceSummaryItem[],
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

  if (isInvoicesListContainer(payload)) {
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

  if (isApiEnvelope<unknown>(payload) && isStructuredInvoicesList(payload.data)) {
    return payload.data;
  }

  const rawData = isApiEnvelope<unknown>(payload)
    ? payload.data
    : (payload as { data?: unknown }).data;
  const items = Array.isArray(rawData) ? rawData : [];

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

export const invoicesApi = {
  async getAll(filters?: InvoicesFilters): Promise<InvoicesListResponse> {
    const response = await httpClient.get<InvoicesListApiPayload>(API_ENDPOINTS.invoices.list, {
      params: filters,
    });

    return normalizeInvoicesList(response.data);
  },

  async create(data: CreateInvoiceRequest) {
    const response = await httpClient.post(API_ENDPOINTS.invoices.create, data);
    return extractData(response.data);
  },

  async createAndApprove(data: CreateInvoiceRequest) {
    const response = await httpClient.post(API_ENDPOINTS.invoices.createAndApprove, data);
    return extractData(response.data);
  },

  async createFromDeferredSale(saleId: string): Promise<InvoiceDetailsRecord> {
    const response = await httpClient.post<InvoiceDetailsApiPayload>(
      API_ENDPOINTS.invoices.createFromDeferredSale(saleId)
    );
    return extractData(response.data) as InvoiceDetailsRecord;
  },

  async getById(id: string): Promise<InvoiceDetailsRecord> {
    const response = await httpClient.get<InvoiceDetailsApiPayload>(API_ENDPOINTS.invoices.get(id));
    return extractData(response.data) as InvoiceDetailsRecord;
  },

  async submit(id: string): Promise<InvoiceLifecycleResult> {
    const response = await httpClient.patch<InvoiceLifecycleApiPayload>(
      API_ENDPOINTS.invoices.submit(id)
    );
    return extractData(response.data);
  },

  async approve(id: string): Promise<InvoiceLifecycleResult> {
    const response = await httpClient.patch<InvoiceLifecycleApiPayload>(
      API_ENDPOINTS.invoices.approve(id)
    );
    return extractData(response.data);
  },

  async reject(id: string): Promise<InvoiceLifecycleResult> {
    const response = await httpClient.patch<InvoiceLifecycleApiPayload>(
      API_ENDPOINTS.invoices.reject(id)
    );
    return extractData(response.data);
  },

  async cancel(id: string): Promise<InvoiceLifecycleResult> {
    const response = await httpClient.patch<InvoiceLifecycleApiPayload>(
      API_ENDPOINTS.invoices.cancel(id)
    );
    return extractData(response.data);
  },

  async recordPayment(id: string, payload: RecordInvoicePaymentRequest): Promise<InvoiceLifecycleResult> {
    const response = await httpClient.post<InvoiceLifecycleApiPayload>(
      API_ENDPOINTS.invoices.recordPayment(id),
      payload
    );
    return extractData(response.data);
  },

  async delete(id: string): Promise<DeleteInvoiceResult> {
    const response = await httpClient.delete<DeleteInvoiceResult | ApiResponse<DeleteInvoiceResult>>(
      API_ENDPOINTS.invoices.delete(id)
    );
    return extractData(response.data);
  },
};
