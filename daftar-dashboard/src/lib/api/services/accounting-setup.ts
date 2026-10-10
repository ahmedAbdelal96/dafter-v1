import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type { ApiResponse } from "../types";
import type { AccountingAccount, AccountingReadiness } from "../types/operations";

export const accountingSetupApi = {
  async accounts(): Promise<AccountingAccount[]> {
    const response = await httpClient.get<ApiResponse<AccountingAccount[]>>(
      API_ENDPOINTS.accounting.accounts,
    );
    return extractData(response.data);
  },

  async readiness(postingDate?: string): Promise<AccountingReadiness> {
    const response = await httpClient.get<ApiResponse<AccountingReadiness>>(
      API_ENDPOINTS.accountingBootstrap.readiness,
      { params: { postingDate } },
    );
    return extractData(response.data);
  },
};
