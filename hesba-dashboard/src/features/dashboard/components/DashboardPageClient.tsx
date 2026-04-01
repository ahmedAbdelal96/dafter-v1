"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCashReconciliationSummary,
  useDashboardAlerts,
  useDashboardCharts,
  useDashboardHighlights,
  useDashboardOverview,
} from "@/lib/api/hooks";
import type {
  DashboardBaseFilters,
  DashboardPeriodPreset,
} from "@/lib/api/services/dashboard";
import { DashboardFilters } from "./DashboardFilters";
import { DashboardOverviewGrid } from "./DashboardOverviewGrid";
import { DashboardChartsSection } from "./DashboardChartsSection";
import { DashboardHighlightsSection } from "./DashboardHighlightsSection";
import { DashboardAlertsSection } from "./DashboardAlertsSection";
import { DashboardClient } from "./DashboardClient";

function buildFilters(
  preset: DashboardPeriodPreset,
  dateFrom: string,
  dateTo: string,
): DashboardBaseFilters {
  if (dateFrom && dateTo) {
    return { dateFrom, dateTo };
  }

  return { preset };
}

export function DashboardPageClient() {
  const t = useTranslations("dashboard.page");
  const locale = useLocale();
  const [preset, setPreset] = useState<DashboardPeriodPreset>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const baseFilters = useMemo(
    () => buildFilters(preset, dateFrom, dateTo),
    [preset, dateFrom, dateTo],
  );

  const overviewQuery = useDashboardOverview(baseFilters);
  const chartsQuery = useDashboardCharts({ ...baseFilters, granularity: "auto" });
  const highlightsQuery = useDashboardHighlights({ ...baseFilters, limit: 5 });
  const alertsQuery = useDashboardAlerts({ ...baseFilters, limit: 8 });
  const operationalCashSummaryQuery = useCashReconciliationSummary({
    dateFrom: baseFilters.dateFrom,
    dateTo: baseFilters.dateTo,
  });

  const currencyCode = overviewQuery.data?.company.currencyCode ?? "EGP";
  const isLoading =
    overviewQuery.isLoading ||
    chartsQuery.isLoading ||
    highlightsQuery.isLoading ||
    alertsQuery.isLoading;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border-light/90 bg-white/92 p-6 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              {t("eyebrow")}
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary dark:text-white">
              {t("heading")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-slate-300">
              {t("subheading", { company: overviewQuery.data?.company.name ?? t("companyFallback") })}
            </p>
          </div>
          <div className="rounded-2xl bg-primary-light px-4 py-3 text-sm text-primary dark:bg-white/[0.04] dark:text-slate-200">
            <p className="font-semibold">{t("periodLabel")}</p>
            <p className="mt-1">{overviewQuery.data ? `${overviewQuery.data.period.dateFrom} - ${overviewQuery.data.period.dateTo}` : t("loading")}</p>
          </div>
        </div>
      </section>

      <DashboardFilters
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={(value) => {
          setPreset(value);
          setDateFrom("");
          setDateTo("");
        }}
        onDateFromChange={(value) => {
          setDateFrom(value);
        }}
        onDateToChange={(value) => {
          setDateTo(value);
        }}
        onReset={() => {
          setPreset("month");
          setDateFrom("");
          setDateTo("");
        }}
      />

      <DashboardOverviewGrid overview={overviewQuery.data} locale={locale} isLoading={isLoading} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-theme-sm dark:border-amber-700/40 dark:bg-amber-900/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              {t("operationalCash.badge")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {t("operationalCash.title")}
            </h2>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
              {t("operationalCash.subtitle")}
            </p>
          </div>
          <Link
            href={`/${locale}/settings/cash-reconciliation`}
            className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-900/30"
          >
            {t("operationalCash.openAction")}
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.totalRecords")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.totalRecords ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.closedDays")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.closedCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.openDrafts")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.draftCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t("operationalCash.totalVariance")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-900 dark:text-amber-100">
              {operationalCashSummaryQuery.data?.totals.totalVariance ?? 0}
            </p>
          </div>
        </div>
      </section>

      <DashboardChartsSection
        charts={chartsQuery.data}
        locale={locale}
        currencyCode={currencyCode}
        isLoading={chartsQuery.isLoading}
      />

      <DashboardHighlightsSection
        highlights={highlightsQuery.data}
        locale={locale}
        currencyCode={currencyCode}
        isLoading={highlightsQuery.isLoading}
      />

      <DashboardAlertsSection
        alerts={alertsQuery.data?.items}
        locale={locale}
        currencyCode={currencyCode}
        isLoading={alertsQuery.isLoading}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white">
            {t("quickAccessTitle")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{t("quickAccessDescription")}</p>
        </div>
        <DashboardClient />
      </section>
    </div>
  );
}
