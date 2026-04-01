// ─── Customers Hooks ──────────────────────────────────────────────────────────
// All server state managed via TanStack Query v5.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { customersApi } from '../api/customers.api';
import type { CreateCustomerDto, UpdateCustomerDto, CustomerListParams } from '../types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** Paginated list with optional search/filter. Params are part of the query key. */
export function useListCustomers(params?: CustomerListParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CUSTOMERS, params],
    queryFn: () => customersApi.list(params),
  });
}

/** Single customer detail (includes current balance). Skips if id is null. */
export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER(id ?? ''),
    queryFn: () => customersApi.get(id!),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerDto) => customersApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCustomerDto }) =>
      customersApi.update(id, dto),
    onSuccess: (_, { id }) => {
      // Invalidate both the list and the specific item cache
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMER(id) });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}
