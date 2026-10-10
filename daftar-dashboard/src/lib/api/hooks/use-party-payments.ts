import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerPaymentsApi, supplierPaymentsApi } from "../services/party-payments";
import { partyPaymentsKeys, salesOperationsKeys, purchaseOperationsKeys } from "./query-keys";
import type { PaymentInput } from "../types/operations";

export function useCustomerPayments(filters?: Record<string, string | undefined>, enabled = true) {
  return useQuery({ queryKey: partyPaymentsKeys.customer(filters), queryFn: () => customerPaymentsApi.list(filters), enabled });
}

export function useCustomerOpenItems(partnerId?: string) {
  return useQuery({ queryKey: partyPaymentsKeys.customerOpenItems(partnerId), queryFn: () => customerPaymentsApi.openItems(partnerId ?? ""), enabled: Boolean(partnerId) });
}

export function useCreateCustomerPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentInput) => customerPaymentsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all });
      void queryClient.invalidateQueries({ queryKey: salesOperationsKeys.all });
    },
  });
}

export function usePostCustomerPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate }: { id: string; postingDate: string }) => customerPaymentsApi.post(id, postingDate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useUpdateCustomerPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaymentInput }) => customerPaymentsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useReverseCustomerPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate, reason }: { id: string; postingDate: string; reason: string }) => customerPaymentsApi.reverse(id, postingDate, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useReconcileCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerPaymentsApi.reconcile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useSupplierPayments(filters?: Record<string, string | undefined>, enabled = true) {
  return useQuery({ queryKey: partyPaymentsKeys.supplier(filters), queryFn: () => supplierPaymentsApi.list(filters), enabled });
}

export function useSupplierOpenItems(partnerId?: string) {
  return useQuery({ queryKey: partyPaymentsKeys.supplierOpenItems(partnerId), queryFn: () => supplierPaymentsApi.openItems(partnerId ?? ""), enabled: Boolean(partnerId) });
}

export function useCreateSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentInput) => supplierPaymentsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all });
      void queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all });
    },
  });
}

export function usePostSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate }: { id: string; postingDate: string }) => supplierPaymentsApi.post(id, postingDate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useUpdateSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaymentInput }) => supplierPaymentsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useReverseSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate, reason }: { id: string; postingDate: string; reason: string }) => supplierPaymentsApi.reverse(id, postingDate, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}

export function useReconcileSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierPaymentsApi.reconcile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all }),
  });
}
