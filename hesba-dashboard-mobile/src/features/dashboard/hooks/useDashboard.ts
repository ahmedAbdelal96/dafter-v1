/**
 * Dashboard Query Hooks — Daftar Mobile
 *
 * useOverview  — main KPIs + operations + alert counts for the selected period.
 * useAlerts    — detailed alert items; only fetched when overview shows > 0 alerts.
 *
 * Both hooks accept a DashboardPeriodPreset that is included in the queryKey,
 * so switching periods triggers a fresh fetch while caching each period separately.
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_CONFIG, API_ENDPOINTS } from '@/lib/api/config';
import { apiClient } from '@/lib/api/client';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardPeriodPreset } from '../types';

// ─── Overview hook ─────────────────────────────────────────────────────────────

/**
 * Fetches KPIs, operation counts, and alert counts from GET /dashboard/overview.
 * This is the primary data source for the home screen.
 *
 * @param preset  Period preset — controls the date range on the backend.
 *                Defaults to 'month'. Changing it rekeys the query.
 */
export function useOverview(preset: DashboardPeriodPreset = 'month') {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_OVERVIEW(preset),
    queryFn: () => dashboardApi.getOverview({ preset }),
    staleTime: QUERY_CONFIG.staleTime,
    gcTime:    QUERY_CONFIG.gcTime,
  });
}

// ─── Alerts hook ──────────────────────────────────────────────────────────────

/**
 * Fetches detailed alert items from GET /dashboard/alerts.
 *
 * The `enabled` flag should be derived from the overview's alert counts:
 *   const totalAlerts = alerts.overdueDeferredSales + alerts.overdueInstallments + ...
 *   enabled = totalAlerts > 0
 *
 * This prevents an unnecessary request when the merchant has a clean book.
 *
 * @param preset   Same period preset as overview for consistency.
 * @param enabled  Whether to actually fire the request (default true).
 */
export function useAlerts(
  preset: DashboardPeriodPreset = 'month',
  enabled = true,
) {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_ALERTS(preset),
    queryFn: () => dashboardApi.getAlerts({ preset }),
    enabled,
    staleTime: QUERY_CONFIG.staleTime,
    gcTime:    QUERY_CONFIG.gcTime,
  });
}

// ─── Receivables snapshot hook (P3-FE-1) ──────────────────────────────────────

/** Fetches receivables summary including pendingInvoicesCount + overdueCustomersCount */
export function useReceivables() {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_RECEIVABLES,
    queryFn: () => dashboardApi.getReceivables(),
    staleTime: QUERY_CONFIG.staleTime,
    gcTime:    QUERY_CONFIG.gcTime,
  });
}

// ─── Overdue customers hook (P3-FE-1, F6.2) ───────────────────────────────────

/** Top N overdue customers sorted by amount */
export function useOverdueCustomers(limit = 5) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CUSTOMERS_OVERDUE, limit],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>(
        API_ENDPOINTS.customers.overdue,
        { params: { sort: 'amount', limit } },
      );
      return (res.data?.data ?? []) as Array<{
        customerId: string;
        customerName: string;
        overdueAmount: string;
        ageBucket: string;
        invoiceCount: number;
      }>;
    },
    staleTime: QUERY_CONFIG.staleTime,
    gcTime:    QUERY_CONFIG.gcTime,
  });
}
