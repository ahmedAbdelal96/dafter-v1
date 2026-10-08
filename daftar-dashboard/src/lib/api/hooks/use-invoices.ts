import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "../services/invoices";
import { ACCOUNTING_CACHE } from "./config";
import { customersKeys, invoicesKeys, ledgerKeys, suppliersKeys } from "./query-keys";
import type { CreateInvoiceRequest, InvoicesFilters, RecordInvoicePaymentRequest } from "../types";

export function useInvoices(filters: InvoicesFilters, enabled = true) {
  return useQuery({
    queryKey: invoicesKeys.list(filters),
    queryFn: () => invoicesApi.getAll(filters),
    staleTime: ACCOUNTING_CACHE.invoices.staleTime,
    gcTime: ACCOUNTING_CACHE.invoices.gcTime,
    enabled,
  });
}

export function useInvoice(id: string, enabled = true) {
  return useQuery({
    queryKey: invoicesKeys.detail(id),
    queryFn: () => invoicesApi.getById(id),
    staleTime: ACCOUNTING_CACHE.invoices.staleTime,
    gcTime: ACCOUNTING_CACHE.invoices.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoiceRequest) => invoicesApi.create(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });

      if (payload.partyType === "SUPPLIER") {
        queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(payload.partyId) });
        queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      } else if (payload.partyType === "CUSTOMER") {
        queryClient.invalidateQueries({ queryKey: customersKeys.detail(payload.partyId) });
        queryClient.invalidateQueries({ queryKey: customersKeys.snapshot(payload.partyId) });
        queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      }
    },
  });
}

export function useCreateAndApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoiceRequest) => invoicesApi.createAndApprove(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });

      if (payload.partyType === "SUPPLIER") {
        queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(payload.partyId) });
        queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      } else if (payload.partyType === "CUSTOMER") {
        queryClient.invalidateQueries({ queryKey: customersKeys.detail(payload.partyId) });
        queryClient.invalidateQueries({ queryKey: customersKeys.snapshot(payload.partyId) });
        queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      }
    },
  });
}

export function useCreateInvoiceFromDeferredSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (saleId: string) => invoicesApi.createFromDeferredSale(saleId),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoicesKeys.detail(invoice.id), invoice);
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: invoicesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
      queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customersKeys.details() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
    },
  });
}

function invalidateInvoiceLifecycleState(
  queryClient: ReturnType<typeof useQueryClient>,
  invoiceId: string,
) {
  queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
  queryClient.invalidateQueries({ queryKey: invoicesKeys.detail(invoiceId) });
  queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
  queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
  queryClient.invalidateQueries({ queryKey: customersKeys.details() });
  queryClient.invalidateQueries({ queryKey: customersKeys.snapshots() });
  queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() });
  queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.submit(id),
    onSuccess: (_, id) => {
      invalidateInvoiceLifecycleState(queryClient, id);
    },
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.approve(id),
    onSuccess: (_, id) => {
      invalidateInvoiceLifecycleState(queryClient, id);
    },
  });
}

export function useRejectInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.reject(id),
    onSuccess: (_, id) => {
      invalidateInvoiceLifecycleState(queryClient, id);
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: (_, id) => {
      invalidateInvoiceLifecycleState(queryClient, id);
    },
  });
}

export function useRecordInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordInvoicePaymentRequest }) =>
      invoicesApi.recordPayment(id, payload),
    onSuccess: (_, variables) => {
      invalidateInvoiceLifecycleState(queryClient, variables.id);
    },
  });
}
