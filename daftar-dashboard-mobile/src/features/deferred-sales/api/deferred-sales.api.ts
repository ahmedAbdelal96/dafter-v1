/**
 * Deferred Sales API — HTTP client layer
 *
 * All methods return typed data extracted from the standard ApiResponseDto wrapper:
 *   { statusCode, message, data }
 *
 * Endpoints:
 *   GET    /deferred-sales              → paginated list
 *   GET    /deferred-sales/:id          → detail with payments + partyName
 *   POST   /deferred-sales              → create new deferred sale
 *   POST   /deferred-sales/:id/payments → record a partial/full payment
 *   PATCH  /deferred-sales/:id/cancel   → cancel (sets remaining balance back)
 */
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  DeferredSalesListResponse,
  DeferredSaleDetail,
  DeferredSalesQuery,
  CreateDeferredSalePayload,
  RecordPaymentPayload,
} from '../types';

// ─── Response wrapper (matches ApiResponseDto) ────────────────────────────────

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const deferredSalesApi = {
  /**
   * GET /deferred-sales
   * Supports: status, partyType, partyId, search, dateFrom, dateTo, page, limit
   */
  list: async (params?: DeferredSalesQuery): Promise<DeferredSalesListResponse> => {
    const res = await apiClient.get<ApiResponse<DeferredSalesListResponse>>(
      API_ENDPOINTS.deferredSales.list,
      { params },
    );
    return res.data.data;
  },

  /**
   * GET /deferred-sales/:id
   * Returns: DeferredSale + partyName + payments[]
   */
  getOne: async (id: string): Promise<DeferredSaleDetail> => {
    const res = await apiClient.get<ApiResponse<DeferredSaleDetail>>(
      API_ENDPOINTS.deferredSales.get(id),
    );
    return res.data.data;
  },

  /**
   * POST /deferred-sales
   * Creates a deferred sale and an opening INVOICE ledger entry atomically.
   * Requires: partyType, partyId, totalAmount (>0), dueDate (YYYY-MM-DD)
   */
  create: async (payload: CreateDeferredSalePayload): Promise<DeferredSaleDetail> => {
    const res = await apiClient.post<ApiResponse<DeferredSaleDetail>>(
      API_ENDPOINTS.deferredSales.create,
      payload,
    );
    return res.data.data;
  },

  /**
   * POST /deferred-sales/:id/payments
   * Records a PAYMENT ledger entry and increments paidAmount atomically.
   * Backend validates: amount <= remaining (throws 422 if exceeded).
   */
  recordPayment: async (
    saleId: string,
    payload: RecordPaymentPayload,
  ): Promise<DeferredSaleDetail> => {
    const res = await apiClient.post<ApiResponse<DeferredSaleDetail>>(
      API_ENDPOINTS.deferredSales.recordPayment(saleId),
      payload,
    );
    return res.data.data;
  },

  /**
   * PATCH /deferred-sales/:id/cancel
   * Cancels the sale — reverses the remaining balance in the ledger.
   * Only OWNER can cancel. Returns 204 with no body on success.
   */
  cancel: async (id: string): Promise<void> => {
    await apiClient.patch(`/deferred-sales/${id}/cancel`);
  },
};
