// ─── Products Mutation Hooks ──────────────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { productsApi } from '../api/products.api';
import type { CreateProductDto, UpdateProductDto } from '../types';

function extractErrorMessage(error: unknown): string {
  const e = error as any;
  return e?.response?.data?.message ?? e?.message ?? 'Unknown error';
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductDto) => productsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
    },
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateProductDto) => productsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
    },
  });
}

/** Toggle isActive — convenience wrapper around update */
export function useToggleProductActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => productsApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
    },
  });
}

export { extractErrorMessage };
