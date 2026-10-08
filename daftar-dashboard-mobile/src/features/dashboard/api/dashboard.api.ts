/**
 * Dashboard API Layer — Daftar Mobile
 *
 * Calls the 4 backend dashboard endpoints.
 * Currently used: overview + alerts (sufficient for the main dashboard screen).
 * charts + highlights are wired but not called yet (future enhancement).
 *
 * ⚠️  Never throws to callers — returns typed empty fallbacks on failure so the
 *     screen always renders. React Query's isError flag signals the failed state.
 */

import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  DashboardOverview,
  DashboardAlertsResponse,
  DashboardQueryParams,
} from '../types';

// ─── API response envelope ────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  data: T;
  message: string;
}

// ─── Safe coercion helpers ─────────────────────────────────────────────────────

function toStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '0';
}

function toInt(v: unknown): number {
  if (typeof v === 'number') return Math.round(v);
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  return 0;
}

// ─── Empty fallbacks ──────────────────────────────────────────────────────────

const EMPTY_OVERVIEW: DashboardOverview = {
  company: { id: '', name: '', currencyCode: 'EGP' },
  period:  { dateFrom: '', dateTo: '', preset: 'month' },
  kpis: {
    totalSales:       '0',
    totalExpenses:    '0',
    netProfit:        '0',
    collectionAmount: '0',
    receivables:      '0',
    payables:         '0',
    cashNetFlow:      '0',
  },
  operations: {
    invoicesCount:             0,
    deferredSalesCount:        0,
    installmentContractsCount: 0,
    overdueCount:              0,
    activeCustomers:           0,
    activeProducts:            0,
    activeEmployees:           0,
  },
  alerts: {
    overdueDeferredSales:      0,
    overdueInstallments:       0,
    customersNearCreditLimit:  0,
    criticalNegativeBalances:  0,
  },
};

const EMPTY_ALERTS: DashboardAlertsResponse = { items: [] };

// ─── API object ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  /**
   * GET /dashboard/overview
   *
   * Returns KPIs, operation counts, and alert counts for the selected period.
   * This is the primary endpoint for the dashboard home screen.
   * Returns EMPTY_OVERVIEW gracefully on any network or API error.
   */
  async getOverview(params: DashboardQueryParams = {}): Promise<DashboardOverview> {
    try {
      const res = await apiClient.get<ApiEnvelope<DashboardOverview>>(
        API_ENDPOINTS.dashboard.overview,
        { params: { preset: 'month', ...params } },
      );

      const d = res.data?.data;
      if (!d) return EMPTY_OVERVIEW;

      // Defensively normalise every field — backend response is trusted but
      // we guard against missing fields during API evolution.
      return {
        company: {
          id:           d.company?.id ?? '',
          name:         d.company?.name ?? '',
          currencyCode: d.company?.currencyCode ?? 'EGP',
        },
        period: {
          dateFrom: d.period?.dateFrom ?? '',
          dateTo:   d.period?.dateTo ?? '',
          preset:   d.period?.preset ?? 'month',
        },
        kpis: {
          totalSales:       toStr(d.kpis?.totalSales),
          totalExpenses:    toStr(d.kpis?.totalExpenses),
          netProfit:        toStr(d.kpis?.netProfit),
          collectionAmount: toStr(d.kpis?.collectionAmount),
          receivables:      toStr(d.kpis?.receivables),
          payables:         toStr(d.kpis?.payables),
          cashNetFlow:      toStr(d.kpis?.cashNetFlow),
        },
        operations: {
          invoicesCount:             toInt(d.operations?.invoicesCount),
          deferredSalesCount:        toInt(d.operations?.deferredSalesCount),
          installmentContractsCount: toInt(d.operations?.installmentContractsCount),
          overdueCount:              toInt(d.operations?.overdueCount),
          activeCustomers:           toInt(d.operations?.activeCustomers),
          activeProducts:            toInt(d.operations?.activeProducts),
          activeEmployees:           toInt(d.operations?.activeEmployees),
        },
        alerts: {
          overdueDeferredSales:     toInt(d.alerts?.overdueDeferredSales),
          overdueInstallments:      toInt(d.alerts?.overdueInstallments),
          customersNearCreditLimit: toInt(d.alerts?.customersNearCreditLimit),
          criticalNegativeBalances: toInt(d.alerts?.criticalNegativeBalances),
        },
      };
    } catch {
      return EMPTY_OVERVIEW;
    }
  },

  /**
   * GET /dashboard/alerts
   *
   * Returns detailed alert items (overdue parties, credit risks, etc.).
   * Called separately from overview so the alert section can load lazily.
   */
  async getAlerts(params: DashboardQueryParams = {}): Promise<DashboardAlertsResponse> {
    try {
      const res = await apiClient.get<ApiEnvelope<DashboardAlertsResponse>>(
        API_ENDPOINTS.dashboard.alerts,
        { params: { preset: 'month', limit: 10, ...params } },
      );
      return res.data?.data ?? EMPTY_ALERTS;
    } catch {
      return EMPTY_ALERTS;
    }
  },

  /** GET /dashboard/receivables — receivables summary + pending invoices count */
  async getReceivables(): Promise<{
    totalReceivables: string;
    overdueAmount: string;
    dueToday: string;
    dueThisWeek: string;
    overdueCustomersCount: number;
    pendingInvoicesCount: number;
  }> {
    try {
      const res = await apiClient.get<ApiEnvelope<any>>(
        API_ENDPOINTS.dashboard.receivables,
      );
      const d = res.data?.data ?? {};
      return {
        totalReceivables:    toStr(d.totalReceivables),
        overdueAmount:       toStr(d.overdueAmount),
        dueToday:            toStr(d.dueToday),
        dueThisWeek:         toStr(d.dueThisWeek),
        overdueCustomersCount: toInt(d.overdueCustomersCount),
        pendingInvoicesCount:  toInt(d.pendingInvoicesCount),
      };
    } catch {
      return {
        totalReceivables: '0', overdueAmount: '0',
        dueToday: '0', dueThisWeek: '0',
        overdueCustomersCount: 0, pendingInvoicesCount: 0,
      };
    }
  },
};
