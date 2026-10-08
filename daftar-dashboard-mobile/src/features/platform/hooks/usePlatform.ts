import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_CONFIG, shouldRetry } from '@/lib/api/config';
import { platformApi } from '../api/platform.api';
import type {
  CompanyQuery,
  PlatformAuditFilters,
  PlatformAuditLookupsFilters,
  PlatformStats,
  PlatformUserQuery,
} from '../types';

export function useCompanies(params?: CompanyQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_COMPANIES, params],
    queryFn: () => platformApi.listCompanies(params),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function useCompany(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_COMPANY(id ?? ''),
    queryFn: () => platformApi.getCompany(id!),
    enabled: !!id,
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function useCompanyMetrics(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_COMPANY_METRICS(id ?? ''),
    queryFn: () => platformApi.getCompanyMetrics(id!),
    enabled: !!id,
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function usePlans(includeInactive = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_PLANS, { includeInactive }],
    queryFn: () => platformApi.listPlans(includeInactive),
    staleTime: 10 * 60 * 1000, // Plans change rarely — 10-min cache
    retry: shouldRetry,
  });
}

/**
 * Platform stats — 4 parallel count queries using limit=1.
 * Each returns meta.total for that status bucket.
 */
export function usePlatformStats() {
  const all = useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_STATS, 'all'],
    queryFn: () => platformApi.listCompanies({ limit: 1 }),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
  const active = useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_STATS, 'active'],
    queryFn: () => platformApi.listCompanies({ limit: 1, subscriptionStatus: 'ACTIVE' }),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
  const trial = useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_STATS, 'trial'],
    queryFn: () => platformApi.listCompanies({ limit: 1, subscriptionStatus: 'TRIAL' }),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
  const suspended = useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_STATS, 'suspended'],
    queryFn: () => platformApi.listCompanies({ limit: 1, subscriptionStatus: 'SUSPENDED' }),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
  const expired = useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_STATS, 'expired'],
    queryFn: () => platformApi.listCompanies({ limit: 1, subscriptionStatus: 'EXPIRED' }),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });

  const isLoading =
    all.isLoading || active.isLoading || trial.isLoading ||
    suspended.isLoading || expired.isLoading;

  const stats: PlatformStats = {
    total: all.data?.meta?.total ?? 0,
    active: active.data?.meta?.total ?? 0,
    trial: trial.data?.meta?.total ?? 0,
    suspended: suspended.data?.meta?.total ?? 0,
    expired: expired.data?.meta?.total ?? 0,
  };

  return { stats, isLoading };
}

export function usePlatformCapabilities() {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_CAPABILITIES,
    queryFn: () => platformApi.getCapabilities(),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function usePlatformAuditLogs(filters: PlatformAuditFilters, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_AUDIT_LOGS, filters],
    queryFn: () => platformApi.listAuditLogs(filters),
    enabled,
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function usePlatformAuditLookups(
  filters: PlatformAuditLookupsFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_AUDIT_LOOKUPS, filters],
    queryFn: () => platformApi.getAuditLookups(filters),
    enabled,
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function usePlatformSettings(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_SETTINGS,
    queryFn: () => platformApi.getSettings(),
    enabled,
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

export function usePlatformFeatureFlags(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_FEATURE_FLAGS,
    queryFn: () => platformApi.getFeatureFlags(),
    enabled,
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
  });
}

/** Paginated list of users belonging to a specific company */
export function usePlatformUsers(query: PlatformUserQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PLATFORM_USERS(query.companyId), query],
    queryFn: () => platformApi.listPlatformUsers(query),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
    enabled: !!query.companyId,
  });
}

/** Total / active / disabled / staff counts for one company */
export function usePlatformUserStats(companyId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_USER_STATS(companyId ?? ''),
    queryFn: () => platformApi.getPlatformUserStats(companyId!),
    staleTime: QUERY_CONFIG.staleTime,
    retry: shouldRetry,
    enabled: !!companyId,
  });
}
