import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";
import httpClient from "../http-client";
import type { FeatureCatalogResponse, MyEntitlementsResponse } from "../types";

function unwrapEnvelope<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  const source = payload as { data?: T } | null | undefined;
  return (source?.data ?? payload) as T;
}

export const entitlementsApi = {
  async getMine(): Promise<MyEntitlementsResponse> {
    const response = await httpClient.get(API_ENDPOINTS.entitlements.mine);
    return unwrapEnvelope<MyEntitlementsResponse>(response.data);
  },

  async getFeatureCatalog(): Promise<FeatureCatalogResponse> {
    const response = await httpClient.get(API_ENDPOINTS.entitlements.featureCatalog);
    return unwrapEnvelope<FeatureCatalogResponse>(response.data);
  },
};
