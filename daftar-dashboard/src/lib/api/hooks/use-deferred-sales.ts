import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { customersKeys, deferredSalesKeys, invoicesKeys, ledgerKeys, suppliersKeys, employeesKeys } from "./query-keys";
import { deferredSalesApi } from "../services/deferred-sales";
import type { CreateDeferredSaleRequest, DeferredSalesFilters, RecordDeferredPaymentRequest } from "../types";

export function useDeferredSales(filters: DeferredSalesFilters, enabled = true) {
  return useQuery({
    queryKey: deferredSalesKeys.list(filters),
    queryFn: () => deferredSalesApi.getAll(filters),
    staleTime: ACCOUNTING_CACHE.deferredSales.staleTime,
    gcTime: ACCOUNTING_CACHE.deferredSales.gcTime,
    enabled,
  });
}

export function useDeferredSale(id: string, enabled = true) {
  return useQuery({
    queryKey: deferredSalesKeys.detail(id),
    queryFn: () => deferredSalesApi.getById(id),
    staleTime: ACCOUNTING_CACHE.deferredSales.staleTime,
    gcTime: ACCOUNTING_CACHE.deferredSales.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateDeferredSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDeferredSaleRequest) => deferredSalesApi.create(payload),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: deferredSalesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });

      if (sale.partyType === "CUSTOMER") {
        queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
        queryClient.invalidateQueries({ queryKey: customersKeys.detail(sale.partyId) });
      }
      if (sale.partyType === "SUPPLIER") {
        queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
        queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(sale.partyId) });
      }
      if (sale.partyType === "EMPLOYEE") {
        queryClient.invalidateQueries({ queryKey: employeesKeys.lists() });
        queryClient.invalidateQueries({ queryKey: employeesKeys.detail(sale.partyId) });
      }
    },
  });
}

export function useRecordDeferredPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordDeferredPaymentRequest }) =>
      deferredSalesApi.recordPayment(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: deferredSalesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deferredSalesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
      queryClient.invalidateQueries({ queryKey: customersKeys.details() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
      queryClient.invalidateQueries({ queryKey: employeesKeys.details() });
    },
  });
}

export function useCancelDeferredSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deferredSalesApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: deferredSalesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deferredSalesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
      queryClient.invalidateQueries({ queryKey: customersKeys.details() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
      queryClient.invalidateQueries({ queryKey: employeesKeys.details() });
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
    },
  });
}
