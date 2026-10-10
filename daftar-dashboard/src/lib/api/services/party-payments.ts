import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type { ApiResponse } from "../types";
import type { OpenItem, PaymentInput, PaymentRecord } from "../types/operations";

export const customerPaymentsApi = {
  async list(params?: Record<string, string | undefined>): Promise<PaymentRecord[]> {
    const response = await httpClient.get<ApiResponse<PaymentRecord[]>>(
      API_ENDPOINTS.customerPayments.list,
      { params },
    );
    return extractData(response.data);
  },

  async get(id: string): Promise<PaymentRecord> {
    const response = await httpClient.get<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.customerPayments.get(id),
    );
    return extractData(response.data);
  },

  async openItems(businessPartnerId: string): Promise<OpenItem[]> {
    const response = await httpClient.get<ApiResponse<OpenItem[]>>(
      API_ENDPOINTS.customerPayments.openItems,
      { params: { businessPartnerId } },
    );
    return extractData(response.data);
  },

  async create(payload: PaymentInput): Promise<PaymentRecord> {
    const response = await httpClient.post<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.customerPayments.create,
      payload,
    );
    return extractData(response.data);
  },

  async update(id: string, payload: PaymentInput): Promise<PaymentRecord> {
    const response = await httpClient.patch<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.customerPayments.update(id),
      payload,
    );
    return extractData(response.data);
  },

  async post(id: string, postingDate: string): Promise<PaymentRecord> {
    const response = await httpClient.post<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.customerPayments.post(id),
      { postingDate, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },

  async reverse(id: string, postingDate: string, reason: string): Promise<PaymentRecord> {
    const response = await httpClient.post<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.customerPayments.reverse(id),
      { postingDate, reason, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },

  async reconcile(payload: { debitJournalLineId: string; creditJournalLineId: string; amount: string; postingDate: string }): Promise<Record<string, string>> {
    const response = await httpClient.post<ApiResponse<Record<string, string>>>(API_ENDPOINTS.customerPayments.reconciliations, { ...payload, idempotencyKey: crypto.randomUUID() });
    return extractData(response.data);
  },
};

export const supplierPaymentsApi = {
  async list(params?: Record<string, string | undefined>): Promise<PaymentRecord[]> {
    const response = await httpClient.get<ApiResponse<PaymentRecord[]>>(
      API_ENDPOINTS.supplierPayments.list,
      { params },
    );
    return extractData(response.data);
  },

  async openItems(businessPartnerId: string): Promise<OpenItem[]> {
    const response = await httpClient.get<ApiResponse<OpenItem[]>>(
      API_ENDPOINTS.supplierPayments.openItems,
      { params: { businessPartnerId } },
    );
    return extractData(response.data);
  },

  async get(id: string): Promise<PaymentRecord> {
    const response = await httpClient.get<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.supplierPayments.get(id),
    );
    return extractData(response.data);
  },

  async create(payload: PaymentInput): Promise<PaymentRecord> {
    const response = await httpClient.post<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.supplierPayments.create,
      payload,
    );
    return extractData(response.data);
  },

  async update(id: string, payload: PaymentInput): Promise<PaymentRecord> {
    const response = await httpClient.patch<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.supplierPayments.update(id),
      payload,
    );
    return extractData(response.data);
  },

  async post(id: string, postingDate: string): Promise<PaymentRecord> {
    const response = await httpClient.post<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.supplierPayments.post(id),
      { postingDate, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },

  async reverse(id: string, postingDate: string, reason: string): Promise<PaymentRecord> {
    const response = await httpClient.post<ApiResponse<PaymentRecord>>(
      API_ENDPOINTS.supplierPayments.reverse(id),
      { postingDate, reason, idempotencyKey: crypto.randomUUID() },
    );
    return extractData(response.data);
  },

  async reconcile(payload: { debitJournalLineId: string; creditJournalLineId: string; amount: string; postingDate: string }): Promise<Record<string, string>> {
    const response = await httpClient.post<ApiResponse<Record<string, string>>>(API_ENDPOINTS.supplierPayments.reconciliations, { ...payload, idempotencyKey: crypto.randomUUID() });
    return extractData(response.data);
  },
};
