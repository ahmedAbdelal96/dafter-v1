// ─── Customers API ────────────────────────────────────────────────────────────
// Pure async functions — one function per endpoint, no UI logic.

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Customer,
  CustomersListResponse,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerListParams,
} from '../types';

export const customersApi = {
  /**
   * GET /customers — paginated list with optional search/filter.
   * Returns { items: Customer[], meta: { total, page, limit, totalPages, hasNext, hasPrev } }
   */
  list: async (params?: CustomerListParams): Promise<CustomersListResponse> => {
    const res = await apiClient.get<{
      data: Customer[];
      meta: CustomersListResponse['meta'];
    }>(
      API_ENDPOINTS.customers.list,
      { params },
    );
    return { items: res.data.data, meta: res.data.meta };
  },

  /**
   * GET /customers/:id — single customer with current balance.
   * Includes `balance` field merged from the Balance table.
   */
  get: async (id: string): Promise<Customer> => {
    const res = await apiClient.get<{ data: Customer }>(
      API_ENDPOINTS.customers.get(id),
    );
    return res.data.data;
  },

  /** POST /customers — create a new customer */
  create: async (dto: CreateCustomerDto): Promise<Customer> => {
    const res = await apiClient.post<{ data: Customer }>(
      API_ENDPOINTS.customers.create,
      dto,
    );
    return res.data.data;
  },

  /**
   * PATCH /customers/:id — update customer fields.
   * `dto.version` is REQUIRED for optimistic locking.
   * Server returns 409 if version is stale (race condition).
   */
  update: async (id: string, dto: UpdateCustomerDto): Promise<Customer> => {
    const res = await apiClient.patch<{ data: Customer }>(
      API_ENDPOINTS.customers.update(id),
      dto,
    );
    return res.data.data;
  },

  /**
   * DELETE /customers/:id — soft delete.
   * Returns 409 if the customer has ledger entries (cannot be deleted).
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.customers.delete(id));
  },
};
