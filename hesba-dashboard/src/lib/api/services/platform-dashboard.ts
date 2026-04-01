import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { isApiEnvelope } from "../contracts";

export type PlatformDashboardPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "year"
  | "last30days";

export type PlatformDashboardChartGranularity = "auto" | "day" | "month";

export interface PlatformDashboardBaseFilters {
  preset?: PlatformDashboardPeriodPreset;
  dateFrom?: string;
  dateTo?: string;
}

export interface PlatformDashboardChartsFilters
  extends PlatformDashboardBaseFilters {
  granularity?: PlatformDashboardChartGranularity;
}

export interface PlatformDashboardHealthFilters
  extends PlatformDashboardBaseFilters {
  limit?: number;
}

export interface PlatformDashboardOverviewResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    preset: string;
  };
  kpis: {
    totalCompanies: number;
    activeCompanies: number;
    suspendedCompanies: number;
    paidCompanies: number;
    trialCompanies: number;
    expiredCompanies: number;
    renewSoonCompanies: number;
    totalUsers: number;
    totalPlans: number;
    activePlans: number;
  };
  trends: {
    companiesCreatedInRange: number;
    subscriptionsCreatedInRange: number;
    revenueCollected: number;
    annualRunRate: number;
  };
}

export interface PlatformDashboardPoint {
  label: string;
  value: number;
}

export interface PlatformDashboardChartsResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    preset: string;
    granularity: string;
  };
  companiesGrowth: PlatformDashboardPoint[];
  subscriptionsGrowth: PlatformDashboardPoint[];
  revenueTrend: PlatformDashboardPoint[];
  planDistribution: Array<{
    label: string;
    companiesCount: number;
    revenue: number;
  }>;
  subscriptionStatusDistribution: Array<{
    label: string;
    value: number;
  }>;
}

export interface PlatformDashboardHealthResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    preset: string;
  };
  recentCompanies: Array<{
    id: string;
    name: string;
    createdAt: string;
    ownerEmail: string | null;
    ownerName: string | null;
    usersCount: number;
    customersCount: number;
    ledgerEntriesCount: number;
    subscriptionStatus: string | null;
    planName: string | null;
  }>;
  expiringSubscriptions: Array<{
    companyId: string;
    companyName: string;
    planName: string;
    billingCycle: string;
    status: string;
    endDate: string;
    daysLeft: number;
    companyActive: boolean;
  }>;
  planWatchlist: Array<{
    planName: string;
    companiesCount: number;
    revenue: number;
  }>;
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  const source = payload as { data?: T } | null | undefined;
  return (source?.data ?? payload) as T;
}

function buildDateParams(filters: PlatformDashboardBaseFilters) {
  if (filters.dateFrom && filters.dateTo) {
    return {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    };
  }

  return {
    preset: filters.preset ?? "month",
  };
}

export const platformDashboardApi = {
  async getOverview(
    filters: PlatformDashboardBaseFilters = {},
  ): Promise<PlatformDashboardOverviewResponse> {
    const response = await httpClient.get(
      API_ENDPOINTS.platformDashboard.overview,
      {
        params: buildDateParams(filters),
      },
    );

    return unwrapEnvelope<PlatformDashboardOverviewResponse>(response.data);
  },

  async getCharts(
    filters: PlatformDashboardChartsFilters = {},
  ): Promise<PlatformDashboardChartsResponse> {
    const response = await httpClient.get(
      API_ENDPOINTS.platformDashboard.charts,
      {
        params: {
          ...buildDateParams(filters),
          granularity: filters.granularity ?? "auto",
        },
      },
    );

    return unwrapEnvelope<PlatformDashboardChartsResponse>(response.data);
  },

  async getHealth(
    filters: PlatformDashboardHealthFilters = {},
  ): Promise<PlatformDashboardHealthResponse> {
    const response = await httpClient.get(
      API_ENDPOINTS.platformDashboard.health,
      {
        params: {
          ...buildDateParams(filters),
          limit: filters.limit ?? 6,
        },
      },
    );

    return unwrapEnvelope<PlatformDashboardHealthResponse>(response.data);
  },
};
