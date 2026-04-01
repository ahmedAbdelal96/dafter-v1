import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  Supplier,
  SupplierFilters,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SuppliersListMeta,
  SuppliersListResponse,
} from "../types";

type SuppliersListApiPayload =
  | (ApiResponse<Supplier[]> & { meta?: SuppliersListMeta })
  | ApiEnvelope<{ items: Supplier[]; meta: SuppliersListMeta }>;

type DeleteSupplierResult = { id: string; deleted: boolean };

function isStructuredSuppliersList(
  value: unknown
): value is { items: Supplier[]; meta: SuppliersListMeta } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && Boolean(candidate.meta);
}

function isSuppliersListContainer(
  value: unknown
): value is { items: Supplier[]; meta?: SuppliersListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

function isArrayDataWithMeta(
  value: unknown
): value is { data: Supplier[]; meta?: SuppliersListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { data?: unknown }).data);
}

function normalizeSuppliersList(payload: SuppliersListApiPayload): SuppliersListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as Supplier[],
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

  if (isSuppliersListContainer(payload)) {
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

  if (isApiEnvelope<unknown>(payload) && isStructuredSuppliersList(payload.data)) {
    return payload.data;
  }

  if (isArrayDataWithMeta(payload)) {
    const items = payload.data;
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

  const rawData = isApiEnvelope<unknown>(payload)
    ? payload.data
    : (payload as { data?: unknown }).data;
  const items = Array.isArray(rawData) ? rawData : [];

  return {
    items,
    meta: {
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

export const suppliersApi = {
  async getAll(filters?: SupplierFilters): Promise<SuppliersListResponse> {
    const response = await httpClient.get<SuppliersListApiPayload>(
      API_ENDPOINTS.suppliers.list,
      { params: filters }
    );
    return normalizeSuppliersList(response.data);
  },

  async getById(id: string): Promise<Supplier> {
    const response = await httpClient.get<Supplier | ApiResponse<Supplier>>(
      API_ENDPOINTS.suppliers.get(id)
    );
    return extractData(response.data);
  },

  async create(data: CreateSupplierRequest): Promise<Supplier> {
    const response = await httpClient.post<Supplier | ApiResponse<Supplier>>(
      API_ENDPOINTS.suppliers.create,
      data
    );
    return extractData(response.data);
  },

  async update(id: string, data: UpdateSupplierRequest): Promise<Supplier> {
    const response = await httpClient.patch<Supplier | ApiResponse<Supplier>>(
      API_ENDPOINTS.suppliers.update(id),
      data
    );
    return extractData(response.data);
  },

  async delete(id: string): Promise<DeleteSupplierResult> {
    const response = await httpClient.delete<
      DeleteSupplierResult | ApiResponse<DeleteSupplierResult>
    >(API_ENDPOINTS.suppliers.delete(id));
    return extractData(response.data);
  },
};
