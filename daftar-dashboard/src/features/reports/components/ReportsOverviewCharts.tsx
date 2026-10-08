"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useLocale, useTranslations } from "next-intl";
import { ChartSkeleton } from "@/components/common/LoadingStates";
import type { ReportsSummaryResponse } from "@/lib/api/types";
import { toNumber } from "../utils/reports-format";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ReportsOverviewChartsProps {
  summary: ReportsSummaryResponse;
  loading: boolean;
  onCollectionBreakdownDrilldown?: (payload: {
    flow: "DEFERRED" | "INSTALLMENT";
    metric: "paid" | "remaining" | "overdue";
  }) => void;
  onOverdueDistributionDrilldown?: (flow: "DEFERRED" | "INSTALLMENT") => void;
}

export function ReportsOverviewCharts({
  summary,
  loading,
  onCollectionBreakdownDrilldown,
  onOverdueDistributionDrilldown,
}: ReportsOverviewChartsProps) {
  const t = useTranslations("reports.overview.charts");
  const locale = useLocale();
  const rtl = locale === "ar";

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const barSeries = useMemo(
    () => [
      {
        name: t("series.paid"),
        data: [
          toNumber(summary.deferredSales.paidAmount),
          toNumber(summary.installments.paidAmount),
        ],
      },
      {
        name: t("series.remaining"),
        data: [
          toNumber(summary.deferredSales.remainingAmount),
          toNumber(summary.installments.remainingAmount),
        ],
      },
      {
        name: t("series.overdue"),
        data: [
          toNumber(summary.deferredSales.overdueAmount),
          toNumber(summary.installments.overdueAmount),
        ],
      },
    ],
    [summary.deferredSales.overdueAmount, summary.deferredSales.paidAmount, summary.deferredSales.remainingAmount, summary.installments.overdueAmount, summary.installments.paidAmount, summary.installments.remainingAmount, t]
  );

  const barOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
        fontFamily: "Outfit, sans-serif",
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            if (!onCollectionBreakdownDrilldown) return;

            const flow = config.dataPointIndex === 0 ? "DEFERRED" : "INSTALLMENT";
            const metric =
              config.seriesIndex === 0
                ? "paid"
                : config.seriesIndex === 1
                  ? "remaining"
                  : "overdue";

            onCollectionBreakdownDrilldown({ flow, metric });
          },
        },
      },
      colors: ["#0f9f6e", "#1d4ed8", "#dc2626"],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 8,
          columnWidth: "50%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: [t("categories.deferredSales"), t("categories.installments")],
        labels: {
          style: { colors: "#64748b", fontSize: "12px", fontWeight: 500 },
        },
        axisBorder: { color: "#dbe4f0" },
        axisTicks: { color: "#dbe4f0" },
      },
      yaxis: {
        labels: {
          formatter: (value) => currencyFormatter.format(value),
          style: { colors: "#64748b", fontSize: "12px", fontWeight: 500 },
        },
      },
      legend: {
        position: "top",
        horizontalAlign: rtl ? "right" : "left",
        labels: {
          colors: "#475569",
        },
      },
      grid: {
        borderColor: "#dbe4f0",
        strokeDashArray: 4,
      },
      fill: {
        opacity: 0.95,
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (value) => currencyFormatter.format(Number(value ?? 0)),
        },
      },
      noData: {
        text: t("noData"),
      },
    }),
    [currencyFormatter, onCollectionBreakdownDrilldown, rtl, t]
  );

  const overdueSeries = useMemo(
    () => [
      toNumber(summary.deferredSales.overdueAmount),
      toNumber(summary.installments.overdueAmount),
    ],
    [summary.deferredSales.overdueAmount, summary.installments.overdueAmount]
  );

  const donutOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "donut",
        toolbar: { show: false },
        fontFamily: "Outfit, sans-serif",
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            if (!onOverdueDistributionDrilldown) return;
            const flow = config.dataPointIndex === 0 ? "DEFERRED" : "INSTALLMENT";
            onOverdueDistributionDrilldown(flow);
          },
        },
      },
      colors: ["#dc2626", "#1d4ed8"],
      labels: [t("categories.deferredSales"), t("categories.installments")],
      legend: {
        position: "bottom",
        labels: {
          colors: "#475569",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => `${Number(value ?? 0).toFixed(1)}%`,
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (value) => currencyFormatter.format(Number(value ?? 0)),
        },
      },
      noData: {
        text: t("noData"),
      },
      plotOptions: {
        pie: {
          donut: {
            size: "65%",
          },
        },
      },
    }),
    [currencyFormatter, onOverdueDistributionDrilldown, t]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20">
        <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{t("titles.collectionBreakdown")}</h3>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitles.collectionBreakdown")}</p>
        <div className="mt-4 cursor-pointer">
          <ReactApexChart options={barOptions} series={barSeries} type="bar" height={320} />
        </div>
      </div>

      <div className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20">
        <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{t("titles.overdueDistribution")}</h3>
        <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitles.overdueDistribution")}</p>
        <div className="mt-4 cursor-pointer">
          <ReactApexChart options={donutOptions} series={overdueSeries} type="donut" height={320} />
        </div>
      </div>
    </div>
  );
}
