// ─── Suppliers API ────────────────────────────────────────────────────────────
// Pure async functions — one function per endpoint, no UI logic.

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Supplier,
  SuppliersListResponse,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierListParams,
} from '../types';

export const suppliersApi = {
  /**
   * GET /suppliers — paginated list with optional search/filter.
   * Response shape: { data: Supplier[], meta: { total, page, limit, totalPages, hasNext, hasPrev } }
   */
  list: async (params?: SupplierListParams): Promise<SuppliersListResponse> => {
    const res = await apiClient.get<{
      data: Supplier[];
      meta: SuppliersListResponse['meta'];
    }>(
      API_ENDPOINTS.suppliers.list,
      { params },
    );
    return { items: res.data.data, meta: res.data.meta };
  },

  /**
   * GET /suppliers/:id — single supplier with current balance.
   * Includes `balance` field merged from the Balance table.
   */
  get: async (id: string): Promise<Supplier> => {
    const res = await apiClient.get<{ data: Supplier }>(
      API_ENDPOINTS.suppliers.get(id),
    );
    return res.data.data;
  },

  /** POST /suppliers — create a new supplier */
  create: async (dto: CreateSupplierDto): Promise<Supplier> => {
    const res = await apiClient.post<{ data: Supplier }>(
      API_ENDPOINTS.suppliers.create,
      dto,
    );
    return res.data.data;
  },

  /**
   * PATCH /suppliers/:id — update supplier fields.
   * `dto.version` is REQUIRED for optimistic locking.
   * Server returns 409 if version is stale (race condition).
   */
  update: async (id: string, dto: UpdateSupplierDto): Promise<Supplier> => {
    const res = await apiClient.patch<{ data: Supplier }>(
      API_ENDPOINTS.suppliers.update(id),
      dto,
    );
    return res.data.data;
  },

  /**
   * DELETE /suppliers/:id — soft delete.
   * Returns 409 if the supplier has ledger entries (cannot be deleted).
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.suppliers.delete(id));
  },
};
