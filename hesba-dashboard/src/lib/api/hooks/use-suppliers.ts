import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { suppliersApi } from "../services/suppliers";
import { SUPPLIERS_CACHE } from "./config";
import { suppliersKeys } from "./query-keys";
import type {
  SuppliersListResponse,
  SupplierFilters,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from "../types";

export function useSuppliers(filters: SupplierFilters) {
  return useQuery({
    queryKey: suppliersKeys.list(filters),
    queryFn: () => suppliersApi.getAll(filters),
    staleTime: SUPPLIERS_CACHE.list.staleTime,
    gcTime: SUPPLIERS_CACHE.list.gcTime,
  });
}

export function useSupplier(id: string, enabled = true) {
  return useQuery({
    queryKey: suppliersKeys.detail(id),
    queryFn: () => suppliersApi.getById(id),
    staleTime: SUPPLIERS_CACHE.single.staleTime,
    gcTime: SUPPLIERS_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupplierRequest) => suppliersApi.create(payload),
    onSuccess: (newSupplier) => {
      queryClient.setQueriesData<SuppliersListResponse>(
        { queryKey: suppliersKeys.lists() },
        (previous) => {
          if (!previous) return previous;

          const alreadyExists = previous.items.some((item) => item.id === newSupplier.id);
          if (alreadyExists) return previous;

          const nextItems = [newSupplier, ...previous.items].slice(
            0,
            Math.max(previous.meta.limit, 1)
          );

          return {
            items: nextItems,
            meta: {
              ...previous.meta,
              total: previous.meta.total + 1,
              totalPages: Math.max(
                1,
                Math.ceil((previous.meta.total + 1) / Math.max(previous.meta.limit, 1))
              ),
            },
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupplierRequest }) =>
      suppliersApi.update(id, payload),
    onSuccess: (supplier) => {
      queryClient.setQueryData(suppliersKeys.detail(supplier.id), supplier);
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: suppliersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
    },
  });
}
