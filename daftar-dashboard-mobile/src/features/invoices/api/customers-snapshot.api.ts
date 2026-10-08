// ─── Customer Snapshot API (used inside invoice create form) ──────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type { CustomerSnapshot, FrequentProduct } from '../types';

export const customersSnapshotApi = {
  /** GET /customers/:id/snapshot — balance + overdue summary (2-min cache on server) */
  getSnapshot: async (customerId: string): Promise<CustomerSnapshot> => {
    const res = await apiClient.get<{ data: CustomerSnapshot }>(
      API_ENDPOINTS.customers.snapshot(customerId),
    );
    return res.data.data;
  },

  /** GET /customers/:id/frequent-products?limit=6 — top products for this customer */
  getFrequentProducts: async (
    customerId: string,
    limit = 6,
  ): Promise<FrequentProduct[]> => {
    const res = await apiClient.get<{ data: FrequentProduct[] }>(
      API_ENDPOINTS.customers.frequentProducts(customerId),
      { params: { limit } },
    );
    return res.data.data;
  },
};
