import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  CreateInstallmentContractRequest,
  InstallmentContractDetails,
  InstallmentContractRecord,
  InstallmentPaymentRecord,
  InstallmentsFilters,
  InstallmentsListMeta,
  InstallmentsListResponse,
  InstallmentsScheduleFilters,
  InstallmentsScheduleListResponse,
  InstallmentScheduleListRecord,
  RecordInstallmentPaymentRequest,
} from "../types";

type InstallmentsListApiPayload =
  | (ApiResponse<InstallmentContractRecord[]> & { meta?: Partial<InstallmentsListMeta> })
  | ApiEnvelope<InstallmentContractRecord[]>;

type InstallmentsScheduleApiPayload =
  | (ApiResponse<InstallmentScheduleListRecord[]> & { meta?: Partial<InstallmentsListMeta> })
  | ApiEnvelope<InstallmentScheduleListRecord[]>;

type InstallmentDetailsApiPayload =
  | ApiResponse<InstallmentContractDetails>
  | ApiEnvelope<InstallmentContractDetails>;

type RecordPaymentApiPayload =
  | ApiResponse<InstallmentPaymentRecord>
  | ApiEnvelope<InstallmentPaymentRecord>;

type ListContainer<T> = {
  data?: T[];
  items?: T[];
  meta?: Partial<InstallmentsListMeta>;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMeta(
  meta: Partial<InstallmentsListMeta> | undefined,
  totalFallback: number,
  pageFallback: number,
  limitFallback: number,
): InstallmentsListMeta {
  const page = Math.max(1, toNumber(meta?.page, pageFallback));
  const limit = Math.max(1, toNumber(meta?.limit, limitFallback));
  const total = Math.max(0, toNumber(meta?.total, totalFallback));
  const totalPages = Math.max(1, toNumber(meta?.totalPages, Math.ceil(total / Math.max(limit, 1))));

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: Boolean(meta?.hasNext ?? page < totalPages),
    hasPrev: Boolean(meta?.hasPrev ?? page > 1),
  };
}

function unwrapListPayload<T>(payload: unknown): { items: T[]; meta: InstallmentsListMeta } {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: normalizeMeta(undefined, payload.length, 1, Math.max(payload.length, 1)),
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      items: [],
      meta: normalizeMeta(undefined, 0, 1, 10),
    };
  }

  const candidate = payload as ListContainer<T>;

  if (isApiEnvelope<unknown>(candidate)) {
    const data = candidate.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        meta: normalizeMeta(candidate.meta, data.length, 1, 10),
      };
    }

    if (data && typeof data === "object") {
      const nested = data as ListContainer<T>;
      const items = Array.isArray(nested.items)
        ? nested.items
        : Array.isArray(nested.data)
          ? nested.data
          : [];

      const nestedMeta = nested.meta ?? {
        total: nested.total,
        page: nested.page,
        limit: nested.limit,
        totalPages: nested.totalPages,
      };

      return {
        items,
        meta: normalizeMeta(nestedMeta, items.length, 1, 10),
      };
    }
  }

  const items = Array.isArray(candidate.items)
    ? candidate.items
    : Array.isArray(candidate.data)
      ? candidate.data
      : [];

  const metaSource = candidate.meta ?? {
    total: candidate.total,
    page: candidate.page,
    limit: candidate.limit,
    totalPages: candidate.totalPages,
  };

  return {
    items,
    meta: normalizeMeta(metaSource, items.length, 1, 10),
  };
}

export const installmentsApi = {
  async getContracts(filters?: InstallmentsFilters): Promise<InstallmentsListResponse> {
    const response = await httpClient.get<InstallmentsListApiPayload>(
      API_ENDPOINTS.installments.listContracts,
      { params: filters },
    );

    return unwrapListPayload<InstallmentContractRecord>(response.data);
  },

  async getContractById(id: string, includePayments = false): Promise<InstallmentContractDetails> {
    const response = await httpClient.get<InstallmentDetailsApiPayload>(
      API_ENDPOINTS.installments.getContract(id),
      {
        params: {
          includePayments: includePayments ? "true" : "false",
        },
      },
    );

    return extractData(response.data);
  },

  async getSchedule(filters: InstallmentsScheduleFilters): Promise<InstallmentsScheduleListResponse> {
    const response = await httpClient.get<InstallmentsScheduleApiPayload>(
      API_ENDPOINTS.installments.schedule,
      { params: filters },
    );

    return unwrapListPayload<InstallmentScheduleListRecord>(response.data);
  },

  async createContract(payload: CreateInstallmentContractRequest): Promise<InstallmentContractDetails> {
    const response = await httpClient.post<InstallmentDetailsApiPayload>(
      API_ENDPOINTS.installments.createContract,
      payload,
    );

    return extractData(response.data);
  },

  async recordPayment(id: string, payload: RecordInstallmentPaymentRequest): Promise<InstallmentPaymentRecord> {
    const response = await httpClient.post<RecordPaymentApiPayload>(
      API_ENDPOINTS.installments.recordPayment(id),
      payload,
    );

    return extractData(response.data);
  },

  async cancelContract(id: string): Promise<void> {
    await httpClient.patch(API_ENDPOINTS.installments.cancelContract(id));
  },
};
