import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../services/customers";
import { CUSTOMERS_CACHE } from "./config";
import { customersKeys } from "./query-keys";
import type {
  CustomersListResponse,
  CustomerFilters,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "../types";

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: customersKeys.list(filters),
    queryFn: () => customersApi.getAll(filters),
    staleTime: CUSTOMERS_CACHE.list.staleTime,
    gcTime: CUSTOMERS_CACHE.list.gcTime,
  });
}

export function useCustomer(id: string, enabled = true) {
  return useQuery({
    queryKey: customersKeys.detail(id),
    queryFn: () => customersApi.getById(id),
    staleTime: CUSTOMERS_CACHE.single.staleTime,
    gcTime: CUSTOMERS_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCustomerSnapshot(id: string, enabled = true) {
  return useQuery({
    queryKey: customersKeys.snapshot(id),
    queryFn: () => customersApi.getSnapshot(id),
    staleTime: CUSTOMERS_CACHE.single.staleTime,
    gcTime: CUSTOMERS_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerRequest) => customersApi.create(payload),
    onSuccess: (newCustomer) => {
      // Keep UI responsive: update currently cached lists immediately,
      // then rely on invalidation/refetch for canonical server ordering.
      queryClient.setQueriesData<CustomersListResponse>(
        { queryKey: customersKeys.lists() },
        (previous) => {
          if (!previous) return previous;

          const alreadyExists = previous.items.some((item) => item.id === newCustomer.id);
          if (alreadyExists) return previous;

          const nextItems = [newCustomer, ...previous.items].slice(
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

      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerRequest }) =>
      customersApi.update(id, payload),
    onSuccess: (customer) => {
      queryClient.setQueryData(customersKeys.detail(customer.id), customer);
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: customersKeys.detail(id) });
      queryClient.removeQueries({ queryKey: customersKeys.snapshot(id) });
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
    },
  });
}
