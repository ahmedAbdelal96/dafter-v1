// ─── Suppliers Hooks ──────────────────────────────────────────────────────────
// All server state managed via TanStack Query v5.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { suppliersApi } from '../api/suppliers.api';
import type { CreateSupplierDto, UpdateSupplierDto, SupplierListParams } from '../types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** Paginated list with optional search/filter. Params are part of the query key. */
export function useListSuppliers(params?: SupplierListParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.SUPPLIERS, params],
    queryFn: () => suppliersApi.list(params),
  });
}

/** Single supplier detail (includes current balance). Skips if id is null. */
export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.SUPPLIER(id ?? ''),
    queryFn: () => suppliersApi.get(id!),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSupplierDto) => suppliersApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSupplierDto }) =>
      suppliersApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIER(id) });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS });
    },
  });
}
