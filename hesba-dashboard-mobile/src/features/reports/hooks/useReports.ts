import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { reportsApi } from '../api/reports.api';
import type { SummaryParams, CollectionParams, DateRangeParams, LedgerStatementParams } from '../types';

const REPORTS_STALE_TIME_MS = 5 * 60 * 1000;
const REPORTS_GC_TIME_MS = 30 * 60 * 1000;

function normalizeDateRangeParams(params?: DateRangeParams): DateRangeParams {
  return {
    ...(params?.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params?.dateTo ? { dateTo: params.dateTo } : {}),
  };
}

/** Financial summary (no required params) */
export function useReportsSummary(params?: SummaryParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_SUMMARY, params ?? {}],
    queryFn: () => reportsApi.getSummary(params),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

/** Overdue accounts - no date filter, always shows all overdue */
export function useOverdueReport() {
  return useQuery({
    queryKey: QUERY_KEYS.REPORTS_OVERDUE,
    queryFn: () => reportsApi.getOverdue(),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

/** Upcoming payment schedule for a date range */
export function useCollectionSchedule(params: CollectionParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_COLLECTION, params],
    queryFn: () => reportsApi.getCollectionSchedule(params),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useProfitLossReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_PROFIT_LOSS, normalizedParams],
    queryFn: () => reportsApi.getProfitLoss(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useCashFlowReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_CASH_FLOW, normalizedParams],
    queryFn: () => reportsApi.getCashFlow(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useCustomersAgingReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_CUSTOMERS_AGING, normalizedParams],
    queryFn: () => reportsApi.getCustomersAging(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useSuppliersAgingReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_SUPPLIERS_AGING, normalizedParams],
    queryFn: () => reportsApi.getSuppliersAging(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useSalesDetailedReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_SALES_DETAILED, normalizedParams],
    queryFn: () => reportsApi.getSalesDetailed(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useCollectionsFollowupReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_COLLECTIONS_FOLLOWUP, normalizedParams],
    queryFn: () => reportsApi.getCollectionsFollowup(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useExpensesAnalyticsReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_EXPENSES_ANALYTICS, normalizedParams],
    queryFn: () => reportsApi.getExpensesAnalytics(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useDebtsSummaryReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_DEBTS_SUMMARY, normalizedParams],
    queryFn: () => reportsApi.getDebtsSummary(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useProductsPerformanceReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_PRODUCTS_PERFORMANCE, normalizedParams],
    queryFn: () => reportsApi.getProductsPerformance(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useOperationalPerformanceReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_OPERATIONAL_PERFORMANCE, normalizedParams],
    queryFn: () => reportsApi.getOperationalPerformance(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useCriticalAlertsReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_CRITICAL_ALERTS, normalizedParams],
    queryFn: () => reportsApi.getCriticalAlerts(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

export function useStaffActivityReport(params?: DateRangeParams) {
  const normalizedParams = normalizeDateRangeParams(params);
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_STAFF_ACTIVITY, normalizedParams],
    queryFn: () => reportsApi.getStaffActivity(normalizedParams),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}

/** Ledger statement for a specific party — only fetches when partyId is provided */
export function useLedgerStatementReport(params: LedgerStatementParams | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.REPORTS_LEDGER_STATEMENT, params],
    queryFn: () => reportsApi.getLedgerStatement(params!),
    enabled: params !== null && Boolean(params.partyId),
    staleTime: REPORTS_STALE_TIME_MS,
    gcTime: REPORTS_GC_TIME_MS,
  });
}
