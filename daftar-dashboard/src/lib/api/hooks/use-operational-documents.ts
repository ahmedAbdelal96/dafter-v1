import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, salesApi, salesCreditNotesApi } from "../services/operational-documents";
import { businessPartnersKeys, partyPaymentsKeys, purchaseOperationsKeys, salesOperationsKeys } from "./query-keys";
import type { PurchaseDocumentInput, SalesCreditNoteInput, SalesInvoiceInput, SupplierCreditNoteInput } from "../types/operations";

export function useSalesInvoices(filters?: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: salesOperationsKeys.invoices(filters), queryFn: () => salesApi.list(filters) });
}

export function useSalesInvoice(id: string, enabled = true) {
  return useQuery({ queryKey: salesOperationsKeys.invoice(id), queryFn: () => salesApi.get(id), enabled: enabled && Boolean(id) });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalesInvoiceInput) => salesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesOperationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessPartnersKeys.all });
    },
  });
}

export function usePostSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate }: { id: string; postingDate: string }) => salesApi.post(id, postingDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesOperationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all });
    },
  });
}

export function useDeleteSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesOperationsKeys.all }),
  });
}

export function useSalesCreditNotes(filters?: Record<string, string | undefined>) {
  return useQuery({ queryKey: salesOperationsKeys.creditNotes(filters), queryFn: () => salesCreditNotesApi.list(filters) });
}

export function useCreateSalesCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalesCreditNoteInput) => salesCreditNotesApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesOperationsKeys.all }),
  });
}

export function usePostSalesCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate }: { id: string; postingDate: string }) => salesCreditNotesApi.post(id, postingDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesOperationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all });
    },
  });
}

export function usePurchaseOrders(filters?: Record<string, string | undefined>) {
  return useQuery({ queryKey: purchaseOperationsKeys.orders(filters), queryFn: () => purchasesApi.listPurchaseOrders(filters) });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PurchaseDocumentInput) => purchasesApi.createPurchaseOrder(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all }),
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.approvePurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all }),
  });
}

export function useConvertPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.convertPurchaseOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all }),
  });
}

export function useSupplierInvoices(filters?: Record<string, string | undefined>) {
  return useQuery({ queryKey: purchaseOperationsKeys.invoices(filters), queryFn: () => purchasesApi.listSupplierInvoices(filters) });
}

export function useCreateSupplierInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PurchaseDocumentInput) => purchasesApi.createSupplierInvoice(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all }),
  });
}

export function usePostSupplierInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate }: { id: string; postingDate: string }) => purchasesApi.postSupplierInvoice(id, postingDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all });
    },
  });
}

export function useSupplierCreditNotes(filters?: Record<string, string | undefined>) {
  return useQuery({ queryKey: purchaseOperationsKeys.creditNotes(filters), queryFn: () => purchasesApi.listSupplierCreditNotes(filters) });
}

export function useSupplierInvoice(id: string, enabled = true) {
  return useQuery({ queryKey: purchaseOperationsKeys.invoices({ id }), queryFn: () => purchasesApi.getSupplierInvoice(id), enabled: enabled && Boolean(id) });
}

export function useCreateSupplierCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierCreditNoteInput) => purchasesApi.createSupplierCreditNote(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all }),
  });
}

export function usePostSupplierCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, postingDate }: { id: string; postingDate: string }) => purchasesApi.postSupplierCreditNote(id, postingDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchaseOperationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: partyPaymentsKeys.all });
    },
  });
}
