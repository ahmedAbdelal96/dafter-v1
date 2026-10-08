import { useQuery } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { entitlementsKeys } from "./query-keys";
import { entitlementsApi } from "../services/entitlements";

const ENTITLEMENTS_QUERY_OPTIONS = {
  staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
  gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function useMyEntitlements(enabled = true) {
  return useQuery({
    queryKey: entitlementsKeys.mine(),
    queryFn: () => entitlementsApi.getMine(),
    enabled,
    ...ENTITLEMENTS_QUERY_OPTIONS,
  });
}

export function useFeatureCatalog(enabled = true) {
  return useQuery({
    queryKey: entitlementsKeys.featureCatalog(),
    queryFn: () => entitlementsApi.getFeatureCatalog(),
    enabled,
    ...ENTITLEMENTS_QUERY_OPTIONS,
  });
}
