/**
 * Installments React Query Hooks
 *
 * All queries and mutations for the installments module.
 * Every mutation invalidates relevant cache keys on success.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { installmentsApi } from '../api/installments.api';
import type {
  QueryContractsParams,
  CreateContractPayload,
  RecordInstallmentPaymentPayload,
} from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Paginated list of installment contracts.
 * Query key includes all filter params so different filters stay cache-isolated.
 */
export function useListInstallments(query?: QueryContractsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INSTALLMENTS, query],
    queryFn: () => installmentsApi.list(query),
  });
}

/**
 * Single contract detail with schedules + payments.
 * Only fetches when `contractId` is set.
 */
export function useDetailInstallment(contractId: string | null) {
  return useQuery({
    queryKey: contractId ? QUERY_KEYS.INSTALLMENT(contractId) : ['installments', 'none'],
    queryFn: () => installmentsApi.getOne(contractId!, true),
    enabled: !!contractId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new installment contract.
 * Invalidates the list cache on success.
 */
export function useCreateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContractPayload) => installmentsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INSTALLMENTS });
    },
  });
}

/**
 * Record a payment against a contract schedule row.
 * Invalidates list + specific contract detail on success.
 */
export function useRecordInstallmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      payload,
    }: {
      contractId: string;
      payload: RecordInstallmentPaymentPayload;
    }) => installmentsApi.recordPayment(contractId, payload),
    onSuccess: (_data, { contractId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INSTALLMENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INSTALLMENT(contractId) });
    },
  });
}

/**
 * Cancel an installment contract (OWNER only).
 * Invalidates list + specific contract detail on success.
 */
export function useCancelInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => installmentsApi.cancel(contractId),
    onSuccess: (_data, contractId) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INSTALLMENTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INSTALLMENT(contractId) });
    },
  });
}
