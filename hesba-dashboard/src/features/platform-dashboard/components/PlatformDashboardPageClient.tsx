"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  usePlatformDashboardCharts,
  usePlatformDashboardHealth,
  usePlatformDashboardOverview,
} from "@/lib/api/hooks/use-platform-dashboard";
import type {
  PlatformDashboardBaseFilters,
  PlatformDashboardPeriodPreset,
} from "@/lib/api/services/platform-dashboard";
import { PlatformDashboardFilters } from "./PlatformDashboardFilters";
import { PlatformDashboardOverviewGrid } from "./PlatformDashboardOverviewGrid";
import { PlatformDashboardChartsSection } from "./PlatformDashboardChartsSection";
import { PlatformDashboardHealthSection } from "./PlatformDashboardHealthSection";
import { PlatformDashboardQuickLinks } from "./PlatformDashboardQuickLinks";

function buildFilters(
  preset: PlatformDashboardPeriodPreset,
  dateFrom: string,
  dateTo: string,
): PlatformDashboardBaseFilters {
  if (dateFrom && dateTo) {
    return { dateFrom, dateTo };
  }

  return { preset };
}

export function PlatformDashboardPageClient() {
  const t = useTranslations("platformDashboard.page");
  const locale = useLocale();
  const [preset, setPreset] = useState<PlatformDashboardPeriodPreset>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const baseFilters = useMemo(
    () => buildFilters(preset, dateFrom, dateTo),
    [preset, dateFrom, dateTo],
  );

  const overviewQuery = usePlatformDashboardOverview(baseFilters);
  const chartsQuery = usePlatformDashboardCharts({
    ...baseFilters,
    granularity: "auto",
  });
  const healthQuery = usePlatformDashboardHealth({
    ...baseFilters,
    limit: 6,
  });

  const firstError =
    overviewQuery.error ?? chartsQuery.error ?? healthQuery.error ?? null;
  const isLoading =
    overviewQuery.isLoading || chartsQuery.isLoading || healthQuery.isLoading;

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
              {t("subheading")}
            </p>
          </div>
          <div className="rounded-2xl bg-primary-light px-4 py-3 text-sm text-primary dark:bg-white/[0.04] dark:text-slate-200">
            <p className="font-semibold">{t("periodLabel")}</p>
            <p className="mt-1">
              {overviewQuery.data
                ? `${overviewQuery.data.period.dateFrom} - ${overviewQuery.data.period.dateTo}`
                : t("loading")}
            </p>
          </div>
        </div>
      </section>

      <PlatformDashboardFilters
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={(value) => {
          setPreset(value);
          setDateFrom("");
          setDateTo("");
        }}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={() => {
          setPreset("month");
          setDateFrom("");
          setDateTo("");
        }}
      />

      {firstError ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
          {t("error")}
        </div>
      ) : null}

      <PlatformDashboardOverviewGrid
        overview={overviewQuery.data}
        locale={locale}
        currencyCode="USD"
        isLoading={isLoading}
      />

      <PlatformDashboardChartsSection
        charts={chartsQuery.data}
        locale={locale}
        currencyCode="USD"
        isLoading={chartsQuery.isLoading}
      />

      <PlatformDashboardHealthSection
        health={healthQuery.data}
        locale={locale}
        currencyCode="USD"
        isLoading={healthQuery.isLoading}
      />

      <PlatformDashboardQuickLinks />
    </div>
  );
}
