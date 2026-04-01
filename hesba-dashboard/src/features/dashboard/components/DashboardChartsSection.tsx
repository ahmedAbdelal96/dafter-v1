"use client";

import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import { DashboardAreaChart } from "@/components/charts/dashboard/DashboardAreaChart";
import { DashboardBarChart } from "@/components/charts/dashboard/DashboardBarChart";
import { DashboardDonutChart } from "@/components/charts/dashboard/DashboardDonutChart";
import type { DashboardChartsResponse } from "@/lib/api/services/dashboard";
import { formatMoney } from "../utils/dashboard-format";

interface DashboardChartsSectionProps {
  charts?: DashboardChartsResponse;
  locale: string;
  currencyCode: string;
  isLoading?: boolean;
}

function DashboardChartSkeleton() {
  return <div className="h-[320px] animate-pulse rounded-2xl bg-surface-tertiary" />;
}

export function DashboardChartsSection({ charts, locale, currencyCode, isLoading }: DashboardChartsSectionProps) {
  const t = useTranslations("dashboard.charts");
  const categories = charts?.salesTrend.map((item) => item.label) ?? [];
  const moneyFormatter = (value: number) => formatMoney(value, locale, currencyCode);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ComponentCard title={t("salesExpensesTitle")} desc={t("salesExpensesDescription")}>
        {isLoading || !charts ? (
          <DashboardChartSkeleton />
        ) : (
          <DashboardAreaChart
            categories={categories}
            series={[
              { name: t("salesSeries"), data: charts.salesTrend.map((item) => item.value) },
              { name: t("expensesSeries"), data: charts.expensesTrend.map((item) => item.value) },
            ]}
            valueFormatter={moneyFormatter}
          />
        )}
      </ComponentCard>

      <ComponentCard title={t("collectionsTitle")} desc={t("collectionsDescription")}>
        {isLoading || !charts ? (
          <DashboardChartSkeleton />
        ) : (
          <DashboardBarChart
            categories={charts.collectionsTrend.map((item) => item.label)}
            series={[{ name: t("collectionsSeries"), data: charts.collectionsTrend.map((item) => item.value) }]}
            valueFormatter={moneyFormatter}
          />
        )}
      </ComponentCard>

      <ComponentCard title={t("balancesTitle")} desc={t("balancesDescription")}>
        {isLoading || !charts ? (
          <DashboardChartSkeleton />
        ) : (
          <DashboardDonutChart
            labels={[t("receivablesLabel"), t("payablesLabel")]}
            series={[charts.receivablesVsPayables.receivables, charts.receivablesVsPayables.payables]}
            valueFormatter={moneyFormatter}
          />
        )}
      </ComponentCard>

      <ComponentCard title={t("salesDistributionTitle")} desc={t("salesDistributionDescription")}>
        {isLoading || !charts ? (
          <DashboardChartSkeleton />
        ) : (
          <DashboardDonutChart
            labels={[t("cashLabel"), t("deferredLabel"), t("installmentLabel")]}
            series={[
              charts.salesDistribution.cash,
              charts.salesDistribution.deferred,
              charts.salesDistribution.installment,
            ]}
            valueFormatter={moneyFormatter}
          />
        )}
      </ComponentCard>
    </div>
  );
}
