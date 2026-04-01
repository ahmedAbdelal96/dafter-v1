// ─── Products Query Hooks ─────────────────────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { productsApi } from '../api/products.api';
import type { ProductsQuery } from '../types';

/** Paginated products list with optional filters */
export function useProducts(params?: ProductsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, params ?? {}],
    queryFn: () => productsApi.list(params),
  });
}

/** Single product detail — only fetches when id is provided */
export function useProduct(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT(id ?? ''),
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  });
}
