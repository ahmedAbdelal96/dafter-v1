// ─── Employees API ────────────────────────────────────────────────────────────
// Pure async functions — one function per endpoint, no UI logic.

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Employee,
  EmployeesListResponse,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeListParams,
} from '../types';

export const employeesApi = {
  /**
   * GET /employees — paginated list with optional search/filter.
   * Response shape: { data: Employee[], meta: { total, page, limit, totalPages, hasNext, hasPrev } }
   */
  list: async (params?: EmployeeListParams): Promise<EmployeesListResponse> => {
    const res = await apiClient.get<{
      data: Employee[];
      meta: EmployeesListResponse['meta'];
    }>(
      API_ENDPOINTS.employees.list,
      { params },
    );
    return { items: res.data.data, meta: res.data.meta };
  },

  /**
   * GET /employees/:id — single employee with current balance.
   * Includes `balance` field merged from the Balance table.
   */
  get: async (id: string): Promise<Employee> => {
    const res = await apiClient.get<{ data: Employee }>(
      API_ENDPOINTS.employees.get(id),
    );
    return res.data.data;
  },

  /** POST /employees — create a new employee */
  create: async (dto: CreateEmployeeDto): Promise<Employee> => {
    const res = await apiClient.post<{ data: Employee }>(
      API_ENDPOINTS.employees.create,
      dto,
    );
    return res.data.data;
  },

  /**
   * PATCH /employees/:id — update employee fields.
   * `dto.version` is REQUIRED for optimistic locking.
   * Server returns 409 if version is stale (race condition).
   */
  update: async (id: string, dto: UpdateEmployeeDto): Promise<Employee> => {
    const res = await apiClient.patch<{ data: Employee }>(
      API_ENDPOINTS.employees.update(id),
      dto,
    );
    return res.data.data;
  },

  /**
   * DELETE /employees/:id — soft delete.
   * Returns 409 if the employee has ledger entries (cannot be deleted).
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.employees.delete(id));
  },
};
