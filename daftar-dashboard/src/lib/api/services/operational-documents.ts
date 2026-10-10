import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type { ApiResponse } from "../types";
import type {
  PaginationMeta,
  PurchaseDocument,
  PurchaseDocumentInput,
  SalesCreditNote,
  SalesCreditNoteInput,
  SalesInvoice,
  SalesInvoiceInput,
  SupplierCreditNote,
  SupplierCreditNoteInput,
} from "../types/operations";

type ListResponse<T> = ApiResponse<T[]> & { meta?: PaginationMeta };

function normalizeList<T>(payload: ListResponse<T>, page = 1): {
  items: T[];
  meta: PaginationMeta;
} {
  const items = extractData(payload);
  return {
    items,
    meta: payload.meta ?? {
      total: items.length,
      page,
      limit: Math.max(items.length, 1),
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
}

export const salesApi = {
  async list(params?: Record<string, string | number | undefined>) {
    const response = await httpClient.get<ListResponse<SalesInvoice>>(
      API_ENDPOINTS.sales.invoices.list,
      { params },
    );
    return normalizeList(response.data, Number(params?.page ?? 1));
  },

  async get(id: string): Promise<SalesInvoice> {
    const response = await httpClient.get<ApiResponse<SalesInvoice>>(
      API_ENDPOINTS.sales.invoices.get(id),
    );
    return extractData(response.data);
  },

  async create(payload: SalesInvoiceInput): Promise<SalesInvoice> {
    const response = await httpClient.post<ApiResponse<SalesInvoice>>(
      API_ENDPOINTS.sales.invoices.create,
      payload,
    );
    return extractData(response.data);
  },

  async update(id: string, payload: SalesInvoiceInput): Promise<SalesInvoice> {
    const response = await httpClient.patch<ApiResponse<SalesInvoice>>(
      API_ENDPOINTS.sales.invoices.update(id),
      payload,
    );
    return extractData(response.data);
  },

  async post(id: string, postingDate: string): Promise<SalesInvoice> {
    const response = await httpClient.post<ApiResponse<SalesInvoice>>(
      API_ENDPOINTS.sales.invoices.post(id),
      { postingDate, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },

  async remove(id: string): Promise<{ id: string }> {
    const response = await httpClient.delete<ApiResponse<{ id: string }>>(
      API_ENDPOINTS.sales.invoices.delete(id),
    );
    return extractData(response.data);
  },
};

export const salesCreditNotesApi = {
  async list(params?: Record<string, string | undefined>) {
    const response = await httpClient.get<ListResponse<SalesCreditNote>>(
      API_ENDPOINTS.sales.creditNotes.list,
      { params },
    );
    return normalizeList(response.data);
  },

  async get(id: string): Promise<SalesCreditNote> {
    const response = await httpClient.get<ApiResponse<SalesCreditNote>>(
      API_ENDPOINTS.sales.creditNotes.get(id),
    );
    return extractData(response.data);
  },

  async create(payload: SalesCreditNoteInput): Promise<SalesCreditNote> {
    const response = await httpClient.post<ApiResponse<SalesCreditNote>>(
      API_ENDPOINTS.sales.creditNotes.create,
      payload,
    );
    return extractData(response.data);
  },

  async update(id: string, payload: SalesCreditNoteInput): Promise<SalesCreditNote> {
    const response = await httpClient.patch<ApiResponse<SalesCreditNote>>(
      API_ENDPOINTS.sales.creditNotes.update(id),
      payload,
    );
    return extractData(response.data);
  },

  async post(id: string, postingDate: string): Promise<SalesCreditNote> {
    const response = await httpClient.post<ApiResponse<SalesCreditNote>>(
      API_ENDPOINTS.sales.creditNotes.post(id),
      { postingDate, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },
};

export const purchasesApi = {
  async listPurchaseOrders(params?: Record<string, string | undefined>): Promise<PurchaseDocument[]> {
    const response = await httpClient.get<ApiResponse<PurchaseDocument[]>>(
      API_ENDPOINTS.purchases.purchaseOrders.list,
      { params },
    );
    return extractData(response.data);
  },

  async getPurchaseOrder(id: string): Promise<PurchaseDocument> {
    const response = await httpClient.get<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.purchaseOrders.get(id),
    );
    return extractData(response.data);
  },

  async createPurchaseOrder(payload: PurchaseDocumentInput): Promise<PurchaseDocument> {
    const response = await httpClient.post<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.purchaseOrders.create,
      payload,
    );
    return extractData(response.data);
  },

  async approvePurchaseOrder(id: string): Promise<PurchaseDocument> {
    const response = await httpClient.post<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.purchaseOrders.approve(id),
    );
    return extractData(response.data);
  },

  async convertPurchaseOrder(id: string): Promise<PurchaseDocument> {
    const response = await httpClient.post<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.purchaseOrders.convert(id),
    );
    return extractData(response.data);
  },

  async listSupplierInvoices(params?: Record<string, string | undefined>): Promise<PurchaseDocument[]> {
    const response = await httpClient.get<ApiResponse<PurchaseDocument[]>>(
      API_ENDPOINTS.purchases.supplierInvoices.list,
      { params },
    );
    return extractData(response.data);
  },

  async getSupplierInvoice(id: string): Promise<PurchaseDocument> {
    const response = await httpClient.get<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.supplierInvoices.get(id),
    );
    return extractData(response.data);
  },

  async createSupplierInvoice(payload: PurchaseDocumentInput): Promise<PurchaseDocument> {
    const response = await httpClient.post<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.supplierInvoices.create,
      payload,
    );
    return extractData(response.data);
  },

  async postSupplierInvoice(id: string, postingDate: string): Promise<PurchaseDocument> {
    const response = await httpClient.post<ApiResponse<PurchaseDocument>>(
      API_ENDPOINTS.purchases.supplierInvoices.post(id),
      { postingDate, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },

  async listSupplierCreditNotes(params?: Record<string, string | undefined>) {
    const response = await httpClient.get<ListResponse<SupplierCreditNote>>(
      API_ENDPOINTS.purchases.supplierCreditNotes.list,
      { params },
    );
    return normalizeList(response.data);
  },

  async getSupplierCreditNote(id: string): Promise<SupplierCreditNote> {
    const response = await httpClient.get<ApiResponse<SupplierCreditNote>>(
      API_ENDPOINTS.purchases.supplierCreditNotes.get(id),
    );
    return extractData(response.data);
  },

  async createSupplierCreditNote(payload: SupplierCreditNoteInput): Promise<SupplierCreditNote> {
    const response = await httpClient.post<ApiResponse<SupplierCreditNote>>(
      API_ENDPOINTS.purchases.supplierCreditNotes.create,
      payload,
    );
    return extractData(response.data);
  },

  async updateSupplierCreditNote(id: string, payload: SupplierCreditNoteInput): Promise<SupplierCreditNote> {
    const response = await httpClient.patch<ApiResponse<SupplierCreditNote>>(
      API_ENDPOINTS.purchases.supplierCreditNotes.get(id),
      payload,
    );
    return extractData(response.data);
  },

  async postSupplierCreditNote(id: string, postingDate: string): Promise<SupplierCreditNote> {
    const response = await httpClient.post<ApiResponse<SupplierCreditNote>>(
      API_ENDPOINTS.purchases.supplierCreditNotes.post(id),
      { postingDate, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },
};
