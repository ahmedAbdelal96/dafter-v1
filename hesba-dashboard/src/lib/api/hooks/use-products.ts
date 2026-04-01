import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../services/products";
import { PRODUCTS_CACHE } from "./config";
import { productsKeys } from "./query-keys";
import type {
  ProductFilters,
  CreateProductRequest,
  UpdateProductRequest,
} from "../types";

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productsKeys.list(filters),
    queryFn: () => productsApi.getAll(filters),
    staleTime: PRODUCTS_CACHE.list.staleTime,
    gcTime: PRODUCTS_CACHE.list.gcTime,
  });
}

export function useProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: productsKeys.detail(id),
    queryFn: () => productsApi.getById(id),
    staleTime: PRODUCTS_CACHE.single.staleTime,
    gcTime: PRODUCTS_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductRequest) => productsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) =>
      productsApi.update(id, payload),
    onSuccess: (product) => {
      queryClient.setQueryData(productsKeys.detail(product.id), product);
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: productsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}
