import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/reports";
import { ACCOUNTING_CACHE } from "./config";
import { reportsKeys } from "./query-keys";
import type {
  AgingFilters,
  CashFlowFilters,
  CriticalAlertsFilters,
  ReportsSummaryFilters,
  CollectionsFollowupFilters,
  DebtsSummaryFilters,
  ExpensesAnalyticsFilters,
  OperationalPerformanceFilters,
  ProductsPerformanceFilters,
  ProfitLossFilters,
  ReportsLedgerStatementFilters,
  SalesDetailedFilters,
  SimpleLedgerFilters,
  StaffActivityFilters,
} from "../types";

export function useReportsSummary(filters: ReportsSummaryFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.summary(filters),
    queryFn: () => reportsApi.getSummary(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useProfitLossReport(filters: ProfitLossFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.profitLoss(filters),
    queryFn: () => reportsApi.getProfitLoss(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useCashFlowReport(filters: CashFlowFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.cashFlow(filters),
    queryFn: () => reportsApi.getCashFlow(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useCustomersAgingReport(filters: AgingFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.customersAging(filters),
    queryFn: () => reportsApi.getCustomersAging(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useSuppliersAgingReport(filters: AgingFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.suppliersAging(filters),
    queryFn: () => reportsApi.getSuppliersAging(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useSalesDetailedReport(filters: SalesDetailedFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.salesDetailed(filters),
    queryFn: () => reportsApi.getSalesDetailed(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useExpensesAnalyticsReport(filters: ExpensesAnalyticsFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.expensesAnalytics(filters),
    queryFn: () => reportsApi.getExpensesAnalytics(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useProductsPerformanceReport(filters: ProductsPerformanceFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.productsPerformance(filters),
    queryFn: () => reportsApi.getProductsPerformance(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useOperationalPerformanceReport(
  filters: OperationalPerformanceFilters,
  enabled = true
) {
  return useQuery({
    queryKey: reportsKeys.operationalPerformance(filters),
    queryFn: () => reportsApi.getOperationalPerformance(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useCriticalAlertsReport(filters: CriticalAlertsFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.criticalAlerts(filters),
    queryFn: () => reportsApi.getCriticalAlerts(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useLedgerStatementReport(filters: ReportsLedgerStatementFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.ledgerStatement(filters),
    queryFn: () => reportsApi.getLedgerStatement(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled: enabled && Boolean(filters.partyType) && Boolean(filters.partyId),
  });
}

export function useCollectionsFollowupReport(
  filters: CollectionsFollowupFilters,
  enabled = true
) {
  return useQuery({
    queryKey: reportsKeys.collectionsFollowup(filters),
    queryFn: () => reportsApi.getCollectionsFollowup(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useDebtsSummaryReport(filters: DebtsSummaryFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.debtsSummary(filters),
    queryFn: () => reportsApi.getDebtsSummary(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useStaffActivityReport(filters: StaffActivityFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.staffActivity(filters),
    queryFn: () => reportsApi.getStaffActivity(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled,
  });
}

export function useSimpleLedgerReport(filters: SimpleLedgerFilters, enabled = true) {
  return useQuery({
    queryKey: reportsKeys.simpleLedger(filters),
    queryFn: () => reportsApi.getSimpleLedger(filters),
    staleTime: ACCOUNTING_CACHE.reports.staleTime,
    gcTime: ACCOUNTING_CACHE.reports.gcTime,
    enabled: enabled && Boolean(filters.partyType) && Boolean(filters.partyId),
  });
}
