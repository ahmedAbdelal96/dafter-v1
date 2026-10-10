import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type { ApiResponse } from "../types";
import type {
  BusinessPartner,
  BusinessPartnerFilters,
  BusinessPartnerInput,
  PaginationMeta,
} from "../types/operations";

type BusinessPartnerListResponse = ApiResponse<BusinessPartner[]> & {
  meta?: PaginationMeta;
};

export const businessPartnersApi = {
  async getAll(filters?: BusinessPartnerFilters): Promise<{
    items: BusinessPartner[];
    meta: PaginationMeta;
  }> {
    const response = await httpClient.get<BusinessPartnerListResponse>(
      API_ENDPOINTS.businessPartners.list,
      { params: filters },
    );
    const items = extractData(response.data);
    const meta = response.data.meta ?? {
      total: items.length,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? Math.max(items.length, 1),
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    return { items, meta };
  },

  async getById(id: string): Promise<BusinessPartner> {
    const response = await httpClient.get<ApiResponse<BusinessPartner>>(
      API_ENDPOINTS.businessPartners.get(id),
    );
    return extractData(response.data);
  },

  async create(payload: BusinessPartnerInput): Promise<BusinessPartner> {
    const response = await httpClient.post<ApiResponse<BusinessPartner>>(
      API_ENDPOINTS.businessPartners.create,
      payload,
    );
    return extractData(response.data);
  },

  async update(
    id: string,
    payload: Partial<BusinessPartnerInput> & { version: number },
  ): Promise<BusinessPartner> {
    const response = await httpClient.patch<ApiResponse<BusinessPartner>>(
      API_ENDPOINTS.businessPartners.update(id),
      payload,
    );
    return extractData(response.data);
  },

  async setActive(
    id: string,
    payload: { isActive: boolean; version: number },
  ): Promise<BusinessPartner> {
    const response = await httpClient.patch<ApiResponse<BusinessPartner>>(
      API_ENDPOINTS.businessPartners.setActive(id),
      payload,
    );
    return extractData(response.data);
  },
};
