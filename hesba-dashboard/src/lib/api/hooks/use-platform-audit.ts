import { useQuery } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { platformKeys } from "./query-keys";
import {
  platformAuditApi,
  type PlatformAuditFilters,
  type PlatformAuditLookupsFilters,
} from "../services/platform-audit";

const PLATFORM_AUDIT_QUERY_OPTIONS = {
  staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
  gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function usePlatformAuditLogs(
  filters: PlatformAuditFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: platformKeys.auditLogs(filters),
    queryFn: () => platformAuditApi.list(filters),
    enabled,
    ...PLATFORM_AUDIT_QUERY_OPTIONS,
  });
}

export function usePlatformAuditLookups(
  filters: PlatformAuditLookupsFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: platformKeys.auditLookups(filters),
    queryFn: () => platformAuditApi.listLookups(filters),
    enabled,
    ...PLATFORM_AUDIT_QUERY_OPTIONS,
  });
}
