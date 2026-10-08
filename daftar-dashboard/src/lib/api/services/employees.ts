import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  Employee,
  EmployeeFilters,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeesListMeta,
  EmployeesListResponse,
} from "../types";

type EmployeesListApiPayload =
  | (ApiResponse<Employee[]> & { meta?: EmployeesListMeta })
  | ApiEnvelope<{ items: Employee[]; meta: EmployeesListMeta }>;

type DeleteEmployeeResult = { id: string; deleted: boolean };

function isStructuredEmployeesList(
  value: unknown
): value is { items: Employee[]; meta: EmployeesListMeta } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && Boolean(candidate.meta);
}

function isEmployeesListContainer(
  value: unknown
): value is { items: Employee[]; meta?: EmployeesListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

function isArrayDataWithMeta(
  value: unknown
): value is { data: Employee[]; meta?: EmployeesListMeta } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { data?: unknown }).data);
}

function normalizeEmployeesList(payload: EmployeesListApiPayload): EmployeesListResponse {
  if (Array.isArray(payload)) {
    return {
      items: payload as Employee[],
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

  if (isEmployeesListContainer(payload)) {
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

  if (isApiEnvelope<unknown>(payload) && isStructuredEmployeesList(payload.data)) {
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

export const employeesApi = {
  async getAll(filters?: EmployeeFilters): Promise<EmployeesListResponse> {
    const response = await httpClient.get<EmployeesListApiPayload>(
      API_ENDPOINTS.employees.list,
      { params: filters }
    );
    return normalizeEmployeesList(response.data);
  },

  async getById(id: string): Promise<Employee> {
    const response = await httpClient.get<Employee | ApiResponse<Employee>>(
      API_ENDPOINTS.employees.get(id)
    );
    return extractData(response.data);
  },

  async create(data: CreateEmployeeRequest): Promise<Employee> {
    const response = await httpClient.post<Employee | ApiResponse<Employee>>(
      API_ENDPOINTS.employees.create,
      data
    );
    return extractData(response.data);
  },

  async update(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const response = await httpClient.patch<Employee | ApiResponse<Employee>>(
      API_ENDPOINTS.employees.update(id),
      data
    );
    return extractData(response.data);
  },

  async delete(id: string): Promise<DeleteEmployeeResult> {
    const response = await httpClient.delete<
      DeleteEmployeeResult | ApiResponse<DeleteEmployeeResult>
    >(API_ENDPOINTS.employees.delete(id));
    return extractData(response.data);
  },
};
