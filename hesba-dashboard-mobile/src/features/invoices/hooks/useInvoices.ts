// ─── Invoices Hooks ───────────────────────────────────────────────────────────
// TanStack Query v5 — all server state for invoices.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { invoicesApi } from '../api/invoices.api';
import { customersSnapshotApi } from '../api/customers-snapshot.api';
import type {
  InvoiceQueryParams,
  CreateInvoiceDto,
  RecordPaymentDto,
} from '../types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** Paginated list — params in queryKey for filter-isolated caching */
export function useListInvoices(params?: InvoiceQueryParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.INVOICES, params],
    queryFn: () => invoicesApi.list(params),
  });
}

/** Single invoice with full items array */
export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.INVOICE(id ?? ''),
    queryFn: () => invoicesApi.get(id!),
    enabled: !!id,
  });
}

/** Last N invoices for a customer — used by the duplicate modal */
export function useLastInvoicesForCustomer(
  customerId: string | null,
  limit = 3,
) {
  return useQuery({
    queryKey: QUERY_KEYS.INVOICE_LAST_FOR_CUSTOMER(customerId ?? ''),
    queryFn: () => invoicesApi.getLastForCustomer(customerId!, limit),
    enabled: !!customerId,
  });
}

/** Customer snapshot — balance + overdue, 2-min stale */
export function useCustomerSnapshot(customerId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_SNAPSHOT(customerId ?? ''),
    queryFn: () => customersSnapshotApi.getSnapshot(customerId!),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Frequent products for a customer — top 6, used in create form */
export function useFrequentProducts(customerId: string | null, limit = 6) {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_FREQUENT_PRODUCTS(customerId ?? ''),
    queryFn: () => customersSnapshotApi.getFrequentProducts(customerId!, limit),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInvoiceDto) => invoicesApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

/** Create invoice from an existing deferred sale (idempotent) */
export function useCreateInvoiceFromSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => invoicesApi.fromDeferredSale(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

/** Clone an invoice as a new DRAFT */
export function useDuplicateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.duplicate(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
    },
  });
}

// ── Workflow mutations ─────────────────────────────────────────────────────────

export function useSubmitInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.submit(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(id) });
    },
  });
}

export function useApproveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.approve(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(id) });
    },
  });
}

export function useRejectInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.reject(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(id) });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(id) });
    },
  });
}

export function useRecordInvoicePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RecordPaymentDto }) =>
      invoicesApi.recordPayment(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.INVOICE(id) });
    },
  });
}
