import { useQuery } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { platformDashboardKeys } from "./query-keys";
import { platformDashboardApi } from "../services/platform-dashboard";
import type {
  PlatformDashboardBaseFilters,
  PlatformDashboardChartsFilters,
  PlatformDashboardHealthFilters,
} from "../services/platform-dashboard";

const PLATFORM_DASHBOARD_QUERY_OPTIONS = {
  staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
  gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function usePlatformDashboardOverview(
  filters: PlatformDashboardBaseFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: platformDashboardKeys.overview(filters),
    queryFn: () => platformDashboardApi.getOverview(filters),
    enabled,
    ...PLATFORM_DASHBOARD_QUERY_OPTIONS,
  });
}

export function usePlatformDashboardCharts(
  filters: PlatformDashboardChartsFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: platformDashboardKeys.charts(filters),
    queryFn: () => platformDashboardApi.getCharts(filters),
    enabled,
    ...PLATFORM_DASHBOARD_QUERY_OPTIONS,
  });
}

export function usePlatformDashboardHealth(
  filters: PlatformDashboardHealthFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: platformDashboardKeys.health(filters),
    queryFn: () => platformDashboardApi.getHealth(filters),
    enabled,
    ...PLATFORM_DASHBOARD_QUERY_OPTIONS,
  });
}
