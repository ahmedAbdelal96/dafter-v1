import { useQuery } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { dashboardKeys } from "./query-keys";
import { dashboardApi } from "../services/dashboard";
import type {
  DashboardAlertsFilters,
  DashboardBaseFilters,
  DashboardChartsFilters,
  DashboardHighlightsFilters,
} from "../services/dashboard";

export function useDashboardOverview(filters: DashboardBaseFilters, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.overview(filters),
    queryFn: () => dashboardApi.getOverview(filters),
    staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
    gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
    enabled,
  });
}

export function useDashboardCharts(filters: DashboardChartsFilters, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.charts(filters),
    queryFn: () => dashboardApi.getCharts(filters),
    staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
    gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
    enabled,
  });
}

export function useDashboardHighlights(filters: DashboardHighlightsFilters, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.highlights(filters),
    queryFn: () => dashboardApi.getHighlights(filters),
    staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
    gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
    enabled,
  });
}

export function useDashboardAlerts(filters: DashboardAlertsFilters, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.alerts(filters),
    queryFn: () => dashboardApi.getAlerts(filters),
    staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
    gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
    enabled,
  });
}
