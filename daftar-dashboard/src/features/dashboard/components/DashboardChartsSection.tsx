"use client";

import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";
import { DashboardAreaChart } from "@/components/charts/dashboard/DashboardAreaChart";
import { DashboardBarChart } from "@/components/charts/dashboard/DashboardBarChart";
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
          <div className="grid grid-cols-2 gap-4 pt-8 text-center"><div><p className="text-xs text-text-secondary">{t("receivablesLabel")}</p><p className="mt-2 text-xl font-semibold">{moneyFormatter(charts.receivablesVsPayables.receivables)}</p></div><div><p className="text-xs text-text-secondary">{t("payablesLabel")}</p><p className="mt-2 text-xl font-semibold">{moneyFormatter(charts.receivablesVsPayables.payables)}</p></div></div>
        )}
      </ComponentCard>
    </div>
  );
}
