import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import {
  isApiEnvelope,
  type ApiEnvelope,
} from "../contracts";
import type {
  ApiResponse,
  Customer,
  CustomerFilters,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomersListResponse,
  CustomersListMeta,
  CustomerSnapshot,
} from "../types";

type CustomersListApiPayload =
  | (ApiResponse<Customer[]> & { meta?: CustomersListMeta })
  | ApiEnvelope<{ items: Customer[]; meta: CustomersListMeta }>;

type DeleteCustomerResult = { id: string; deleted: boolean };

function isStructuredCustomersList(
  value: unknown
): value is { items: Customer[]; meta: CustomersListMeta } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && Boolean(candidate.meta);
}

function isCustomersListContainer(
  value: unknown
): value is { items: Customer[]; meta?: CustomersListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

function isArrayDataWithMeta(
  value: unknown
): value is { data: Customer[]; meta?: CustomersListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { data?: unknown }).data);
}

function normalizeCustomersList(payload: CustomersListApiPayload): CustomersListResponse {
  // Shape A: raw array response (legacy/unwrapped backend)
  if (Array.isArray(payload)) {
    return {
      items: payload as Customer[],
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

  // Shape B: direct object {items, meta?}
  if (isCustomersListContainer(payload)) {
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

  // Shape C: envelope where data is {items, meta}
  if (isApiEnvelope<unknown>(payload) && isStructuredCustomersList(payload.data)) {
    return payload.data;
  }

  // Shape D: legacy wrapped response { data: Customer[], meta }
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

  // Shape E: envelope where data is Customer[]
  const rawData = isApiEnvelope<unknown>(payload)
    ? payload.data
    : (payload as { data?: unknown }).data;

  const items = Array.isArray(rawData) ? rawData : [];
  const fallbackLimit = 10;
  const meta = {
    total: items.length,
    page: 1,
    limit: fallbackLimit,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  return { items, meta };
}

export const customersApi = {
  async getAll(filters?: CustomerFilters): Promise<CustomersListResponse> {
    const response = await httpClient.get<CustomersListApiPayload>(
      API_ENDPOINTS.customers.list,
      { params: filters }
    );

    return normalizeCustomersList(response.data);
  },

  async getById(id: string): Promise<Customer> {
    const response = await httpClient.get<Customer | ApiResponse<Customer>>(
      API_ENDPOINTS.customers.get(id)
    );
    return extractData(response.data);
  },

  async getSnapshot(id: string): Promise<CustomerSnapshot> {
    const response = await httpClient.get<
      CustomerSnapshot | ApiResponse<CustomerSnapshot>
    >(API_ENDPOINTS.customers.snapshot(id));
    return extractData(response.data);
  },

  async create(data: CreateCustomerRequest): Promise<Customer> {
    const response = await httpClient.post<Customer | ApiResponse<Customer>>(
      API_ENDPOINTS.customers.create,
      data
    );
    return extractData(response.data);
  },

  async update(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    const response = await httpClient.patch<Customer | ApiResponse<Customer>>(
      API_ENDPOINTS.customers.update(id),
      data
    );
    return extractData(response.data);
  },

  async delete(id: string): Promise<DeleteCustomerResult> {
    const response = await httpClient.delete<
      DeleteCustomerResult | ApiResponse<DeleteCustomerResult>
    >(API_ENDPOINTS.customers.delete(id));
    return extractData(response.data);
  },
};
