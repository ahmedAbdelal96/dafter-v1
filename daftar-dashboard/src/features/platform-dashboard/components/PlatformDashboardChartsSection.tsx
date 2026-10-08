"use client";

import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import { DashboardAreaChart } from "@/components/charts/dashboard/DashboardAreaChart";
import { DashboardBarChart } from "@/components/charts/dashboard/DashboardBarChart";
import { DashboardDonutChart } from "@/components/charts/dashboard/DashboardDonutChart";
import type { PlatformDashboardChartsResponse } from "@/lib/api/services/platform-dashboard";
import {
  formatCompactNumber,
  formatMoney,
} from "@/features/dashboard/utils/dashboard-format";

interface PlatformDashboardChartsSectionProps {
  charts?: PlatformDashboardChartsResponse;
  locale: string;
  currencyCode?: string;
  isLoading?: boolean;
}

function ChartSkeleton() {
  return <div className="h-[320px] animate-pulse rounded-2xl bg-surface-tertiary" />;
}

export function PlatformDashboardChartsSection({
  charts,
  locale,
  currencyCode = "USD",
  isLoading,
}: PlatformDashboardChartsSectionProps) {
  const t = useTranslations("platformDashboard.charts");
  const categories = charts?.companiesGrowth.map((item) => item.label) ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ComponentCard title={t("growthTitle")} desc={t("growthDescription")}>
        {isLoading || !charts ? (
          <ChartSkeleton />
        ) : (
          <DashboardAreaChart
            categories={categories}
            series={[
              {
                name: t("companiesSeries"),
                data: charts.companiesGrowth.map((item) => item.value),
              },
              {
                name: t("subscriptionsSeries"),
                data: charts.subscriptionsGrowth.map((item) => item.value),
              },
            ]}
            valueFormatter={(value) => formatCompactNumber(value, locale)}
          />
        )}
      </ComponentCard>

      <ComponentCard title={t("revenueTitle")} desc={t("revenueDescription")}>
        {isLoading || !charts ? (
          <ChartSkeleton />
        ) : (
          <DashboardBarChart
            categories={charts.revenueTrend.map((item) => item.label)}
            series={[
              {
                name: t("revenueSeries"),
                data: charts.revenueTrend.map((item) => item.value),
              },
            ]}
            valueFormatter={(value) => formatMoney(value, locale, currencyCode)}
          />
        )}
      </ComponentCard>

      <ComponentCard title={t("plansTitle")} desc={t("plansDescription")}>
        {isLoading || !charts ? (
          <ChartSkeleton />
        ) : (
          <DashboardDonutChart
            labels={charts.planDistribution.map((item) => item.label)}
            series={charts.planDistribution.map((item) => item.companiesCount)}
            valueFormatter={(value) => formatCompactNumber(value, locale)}
          />
        )}
      </ComponentCard>

      <ComponentCard title={t("statusTitle")} desc={t("statusDescription")}>
        {isLoading || !charts ? (
          <ChartSkeleton />
        ) : (
          <DashboardDonutChart
            labels={charts.subscriptionStatusDistribution.map((item) =>
              t(`statusLabels.${item.label}`),
            )}
            series={charts.subscriptionStatusDistribution.map((item) => item.value)}
            valueFormatter={(value) => formatCompactNumber(value, locale)}
          />
        )}
      </ComponentCard>
    </div>
  );
}
