// ─── Invoices API ─────────────────────────────────────────────────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Invoice,
  InvoiceListItem,
  InvoiceListResponse,
  InvoiceListMeta,
  InvoiceQueryParams,
  InvoiceSummary,
  CreateInvoiceDto,
  RecordPaymentDto,
} from '../types';

export const invoicesApi = {
  /** GET /invoices — paginated list */
  list: async (params?: InvoiceQueryParams): Promise<InvoiceListResponse> => {
    const res = await apiClient.get<{
      data: { items: InvoiceListItem[]; meta: InvoiceListMeta };
    }>(API_ENDPOINTS.invoices.list, { params });
    return res.data.data;
  },

  /** GET /invoices/:id — full detail with items */
  get: async (id: string): Promise<Invoice> => {
    const res = await apiClient.get<{ data: Invoice }>(
      API_ENDPOINTS.invoices.get(id),
    );
    return res.data.data;
  },

  /** POST /invoices — create with line items (starts as DRAFT) */
  create: async (dto: CreateInvoiceDto): Promise<Invoice> => {
    const res = await apiClient.post<{ data: Invoice }>(
      API_ENDPOINTS.invoices.create,
      dto,
    );
    return res.data.data;
  },

  /** POST /invoices/from-deferred-sale/:saleId — idempotent, 409 if done */
  fromDeferredSale: async (saleId: string): Promise<Invoice> => {
    const res = await apiClient.post<{ data: Invoice }>(
      API_ENDPOINTS.invoices.fromDeferredSale(saleId),
    );
    return res.data.data;
  },

  /** POST /invoices/duplicate/:invoiceId — clone as new DRAFT with today's date */
  duplicate: async (invoiceId: string): Promise<Invoice> => {
    const res = await apiClient.post<{ data: Invoice }>(
      API_ENDPOINTS.invoices.duplicate(invoiceId),
    );
    return res.data.data;
  },

  /** GET /invoices/customer/:customerId/last?limit=3 */
  getLastForCustomer: async (
    customerId: string,
    limit = 3,
  ): Promise<InvoiceSummary[]> => {
    const res = await apiClient.get<{ data: InvoiceSummary[] }>(
      API_ENDPOINTS.invoices.customerLast(customerId),
      { params: { limit } },
    );
    return res.data.data;
  },

  /** DELETE /invoices/:id — soft delete */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.invoices.delete(id));
  },

  // ── Workflow transitions ───────────────────────────────────────────────────

  /** PATCH /invoices/:id/submit — DRAFT → PENDING_APPROVAL */
  submit: async (id: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.invoices.submit(id));
  },

  /** PATCH /invoices/:id/approve — PENDING_APPROVAL → APPROVED + ledger effect */
  approve: async (id: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.invoices.approve(id));
  },

  /** PATCH /invoices/:id/reject — → REJECTED (no financial effect) */
  reject: async (id: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.invoices.reject(id));
  },

  /** PATCH /invoices/:id/cancel — reverses ledger if was APPROVED */
  cancel: async (id: string): Promise<void> => {
    await apiClient.patch(API_ENDPOINTS.invoices.cancel(id));
  },

  /** POST /invoices/:id/payments — record direct payment on this invoice */
  recordPayment: async (id: string, dto: RecordPaymentDto): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.invoices.recordPayment(id), dto);
  },
};
