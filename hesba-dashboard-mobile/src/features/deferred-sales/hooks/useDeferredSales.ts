/**
 * Deferred Sales — React Query Hooks
 *
 * Hook inventory:
 *   useListDeferredSales(query)  — paginated list, re-fetches when query changes
 *   useDetailDeferredSale(id)    — single sale + payments (enabled only when id present)
 *   useCreateDeferredSale()      — mutation: POST /deferred-sales
 *   useRecordPayment()           — mutation: POST /deferred-sales/:id/payments
 *   useCancelDeferredSale()      — mutation: PATCH /deferred-sales/:id/cancel
 *
 * Cache invalidation strategy:
 *   - After create  → invalidate DEFERRED_SALES list
 *   - After payment → invalidate list + specific detail (balance changes)
 *   - After cancel  → invalidate list + specific detail
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_CONFIG, shouldRetry } from '@/lib/api/config';
import { deferredSalesApi } from '../api/deferred-sales.api';
import type {
  DeferredSalesQuery,
  CreateDeferredSalePayload,
  RecordPaymentPayload,
} from '../types';

// ─── List ─────────────────────────────────────────────────────────────────────

export function useListDeferredSales(query?: DeferredSalesQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DEFERRED_SALES, query] as const,
    queryFn: () => deferredSalesApi.list(query),
    staleTime: QUERY_CONFIG.staleTime,
    gcTime: QUERY_CONFIG.gcTime,
    retry: shouldRetry,
  });
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export function useDetailDeferredSale(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.DEFERRED_SALE(id ?? ''),
    queryFn: () => deferredSalesApi.getOne(id!),
    enabled: !!id,
    staleTime: QUERY_CONFIG.staleTime,
    gcTime: QUERY_CONFIG.gcTime,
    retry: shouldRetry,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateDeferredSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDeferredSalePayload) =>
      deferredSalesApi.create(payload),
    onSuccess: () => {
      // Bust the list so the new entry appears immediately
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEFERRED_SALES });
    },
  });
}

// ─── Record Payment ───────────────────────────────────────────────────────────

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      saleId,
      payload,
    }: {
      saleId: string;
      payload: RecordPaymentPayload;
    }) => deferredSalesApi.recordPayment(saleId, payload),
    onSuccess: (_data, variables) => {
      // Invalidate both list (status/balance may change) and specific detail
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEFERRED_SALES });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DEFERRED_SALE(variables.saleId),
      });
    },
  });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function useCancelDeferredSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deferredSalesApi.cancel(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEFERRED_SALES });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DEFERRED_SALE(id),
      });
    },
  });
}
