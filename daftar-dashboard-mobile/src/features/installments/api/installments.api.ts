/**
 * Installments API Layer
 *
 * Pure async functions — no UI state, no React Query hooks.
 * Each function maps to one backend endpoint.
 *
 * ⚠️  List response shape is non-standard:
 *   res.data       = { statusCode, message, data: Contract[], meta: { ... } }
 *   → array:       res.data.data
 *   → pagination:  res.data.meta
 */
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  InstallmentContract,
  InstallmentContractDetail,
  InstallmentsListResponse,
  CreateContractPayload,
  RecordInstallmentPaymentPayload,
  QueryContractsParams,
} from '../types';

export const installmentsApi = {
  /**
   * GET /installments/contracts
   * Returns paginated list. NOTE: meta is at res.data.meta (not inside res.data.data).
   */
  list: async (params?: QueryContractsParams): Promise<InstallmentsListResponse> => {
    const res = await apiClient.get<{
      data: InstallmentContract[];
      meta: InstallmentsListResponse['meta'];
    }>(API_ENDPOINTS.installments.list, { params });
    return {
      data: res.data.data,
      meta: (res.data as any).meta ?? {
        total: res.data.data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 15,
        totalPages: 1,
      },
    };
  },

  /**
   * GET /installments/contracts/:id?includePayments=true
   */
  getOne: async (id: string, includePayments = true): Promise<InstallmentContractDetail> => {
    const res = await apiClient.get<{ data: InstallmentContractDetail }>(
      API_ENDPOINTS.installments.get(id),
      { params: { includePayments: includePayments ? 'true' : 'false' } },
    );
    return res.data.data;
  },

  /**
   * POST /installments/contracts
   */
  create: async (payload: CreateContractPayload): Promise<InstallmentContract> => {
    const res = await apiClient.post<{ data: InstallmentContract }>(
      API_ENDPOINTS.installments.create,
      payload,
    );
    return res.data.data;
  },

  /**
   * POST /installments/contracts/:contractId/payments
   * Records a payment against a specific schedule row.
   */
  recordPayment: async (
    contractId: string,
    payload: RecordInstallmentPaymentPayload,
  ): Promise<InstallmentContractDetail> => {
    const res = await apiClient.post<{ data: InstallmentContractDetail }>(
      API_ENDPOINTS.installments.recordPayment(contractId),
      payload,
    );
    return res.data.data;
  },

  /**
   * PATCH /installments/contracts/:id/cancel
   * OWNER/SUPER_ADMIN only.
   */
  cancel: async (id: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.installments.cancel(id));
  },
};
