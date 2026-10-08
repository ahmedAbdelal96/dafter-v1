import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type {
  ApiResponse,
  LedgerStatementFilters,
  LedgerStatementResponse,
  CreateLedgerEntryRequest,
  LedgerStatementItem,
} from "../types";

type DeleteLedgerEntryResult = null;

function normalizeStatementData(payload: unknown): LedgerStatementResponse {
  if (!payload || typeof payload !== "object") {
    return {
      partyInfo: null,
      currentBalance: "0.00",
      openingBalanceForPeriod: "0.00",
      closingBalanceForPeriod: "0.00",
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    };
  }

  const source = payload as Partial<LedgerStatementResponse>;
  const items = Array.isArray(source.items)
    ? (source.items as LedgerStatementItem[])
    : [];

  return {
    partyInfo: source.partyInfo ?? null,
    currentBalance: source.currentBalance ?? "0.00",
    openingBalanceForPeriod: source.openingBalanceForPeriod ?? "0.00",
    closingBalanceForPeriod: source.closingBalanceForPeriod ?? "0.00",
    items,
    total: Number(source.total ?? items.length),
    page: Number(source.page ?? 1),
    limit: Number(source.limit ?? 20),
  };
}

export const ledgerApi = {
  async getStatement(filters: LedgerStatementFilters): Promise<LedgerStatementResponse> {
    const response = await httpClient.get<
      LedgerStatementResponse | ApiResponse<LedgerStatementResponse>
    >(API_ENDPOINTS.ledger.statement, { params: filters });

    const extracted = extractData(response.data);
    return normalizeStatementData(extracted);
  },

  async createEntry(payload: CreateLedgerEntryRequest) {
    const response = await httpClient.post<
      CreateLedgerEntryRequest | ApiResponse<CreateLedgerEntryRequest>
    >(API_ENDPOINTS.ledger.create, payload);
    return extractData(response.data);
  },

  async deleteEntry(id: string): Promise<DeleteLedgerEntryResult> {
    const response = await httpClient.delete<
      DeleteLedgerEntryResult | ApiResponse<DeleteLedgerEntryResult>
    >(API_ENDPOINTS.ledger.delete(id));
    return extractData(response.data);
  },
};
