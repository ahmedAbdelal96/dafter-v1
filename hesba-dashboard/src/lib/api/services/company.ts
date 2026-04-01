import httpClient from "../http-client";
import { API_ENDPOINTS } from "@/lib/api/config";

export interface MyCompanySubscription {
  id: string;
  status: string;
  endDate: string | null;
  autoRenew: boolean;
  plan: { id: string; name: string; tier: string };
}

export interface MyCompany {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currencyCode: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  subscriptions: MyCompanySubscription[];
}

export interface UpdateMyCompanyPayload {
  name?: string;
  phone?: string;
  address?: string;
  currencyCode?: string;
}

export const companyApi = {
  async getMe(): Promise<MyCompany> {
    const res = await httpClient.get<{ data: MyCompany }>(API_ENDPOINTS.companies.me);
    return res.data.data;
  },

  async updateMe(payload: UpdateMyCompanyPayload): Promise<MyCompany> {
    const res = await httpClient.patch<{ data: MyCompany }>(
      API_ENDPOINTS.companies.me,
      payload,
    );
    return res.data.data;
  },
};
