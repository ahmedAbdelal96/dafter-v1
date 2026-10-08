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
import { PlatformDashboardFilters } from "@/features/platform-dashboard/components/PlatformDashboardFilters";
import {
  formatCompactNumber,
  formatMoney,
} from "@/features/dashboard/utils/dashboard-format";

function buildFilters(
  preset: PlatformDashboardPeriodPreset,
  dateFrom: string,
  dateTo: string,
): PlatformDashboardBaseFilters {
  if (dateFrom && dateTo) return { dateFrom, dateTo };
  return { preset };
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "success" | "warning" | "error";
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    success: "text-success-700",
    warning: "text-warning-700",
    error: "text-error-700",
  };
  const bgMap: Record<string, string> = {
    primary: "bg-primary/[0.07]",
    success: "bg-success-500/[0.07]",
    warning: "bg-warning-500/[0.07]",
    error: "bg-error-500/[0.07]",
  };

  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl ${bgMap[accent]} p-5`}
    >
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${colorMap[accent]}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

// ─── Plan distribution table ───────────────────────────────────────────────────

function PlanDistributionTable({
  data,
  locale,
  currencyCode,
}: {
  data: Array<{ label: string; companiesCount: number; revenue: number }>;
  locale: string;
  currencyCode: string;
}) {
  const t = useTranslations("platformAnalytics");

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        {t("noData")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-secondary">
            <th className="pb-2 font-medium">{t("plan")}</th>
            <th className="pb-2 font-medium text-right">{t("companies")}</th>
            <th className="pb-2 font-medium text-right">{t("revenue")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.label}
              className="border-b border-border/40 last:border-0"
            >
              <td className="py-2 font-medium text-text-primary">{row.label}</td>
              <td className="py-2 text-right text-text-secondary">
                {formatCompactNumber(row.companiesCount, locale)}
              </td>
              <td className="py-2 text-right font-semibold text-primary">
                {formatMoney(row.revenue, locale, currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Expiring subscriptions list ─────────────────────────────────────────────

function ExpiringList({
  data,
}: {
  data: Array<{
    companyName: string;
    planName: string;
    endDate: string;
    daysLeft: number;
    status: string;
  }>;
}) {
  const t = useTranslations("platformAnalytics");

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        {t("noData")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {data.map((item, idx) => (
        <li key={idx} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {item.companyName}
            </p>
            <p className="text-xs text-text-secondary">{item.planName}</p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              item.daysLeft <= 7
                ? "bg-error-500/10 text-error-700"
                : item.daysLeft <= 30
                ? "bg-warning-500/10 text-warning-700"
                : "bg-success-500/10 text-success-700"
            }`}
          >
            {t("daysLeft", { count: item.daysLeft })}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Subscription status distribution bar ─────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success-500",
  TRIAL: "bg-primary",
  SUSPENDED: "bg-warning-500",
  EXPIRED: "bg-error-500",
  DISABLED: "bg-gray-400",
};

function StatusDistributionBar({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  const t = useTranslations("platformDashboard.charts.statusLabels");
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {data.map((seg) => (
          <div
            key={seg.label}
            className={`${STATUS_COLORS[seg.label] ?? "bg-gray-400"}`}
            style={{ width: `${(seg.value / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {data.map((seg) => (
          <li key={seg.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span
              className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[seg.label] ?? "bg-gray-400"}`}
            />
            {t(seg.label as keyof typeof t)} — {seg.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlatformAnalyticsPageClient() {
  const t = useTranslations("platformAnalytics");
  const locale = useLocale();
  const currencyCode = "USD";

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
  const healthQuery = usePlatformDashboardHealth({ ...baseFilters, limit: 10 });

  const ov = overviewQuery.data;
  const ch = chartsQuery.data;
  const hl = healthQuery.data;

  const isLoading =
    overviewQuery.isLoading || chartsQuery.isLoading || healthQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <section className="rounded-[2rem] border border-border-light/90 bg-white/92 p-6 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
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
        </div>
      </section>

      {/* Filters */}
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

      {/* Revenue + subscription KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label={t("metrics.revenue")}
          value={
            isLoading
              ? "—"
              : formatMoney(ov?.trends.revenueCollected ?? 0, locale, currencyCode)
          }
          sub={
            isLoading
              ? undefined
              : `ARR: ${formatMoney(ov?.trends.annualRunRate ?? 0, locale, currencyCode)}`
          }
          accent="success"
        />
        <MetricCard
          label={t("metrics.paidCompanies")}
          value={isLoading ? "—" : formatCompactNumber(ov?.kpis.paidCompanies ?? 0, locale)}
          sub={isLoading ? undefined : `${t("metrics.trial")}: ${ov?.kpis.trialCompanies ?? 0}`}
          accent="primary"
        />
        <MetricCard
          label={t("metrics.renewSoon")}
          value={isLoading ? "—" : formatCompactNumber(ov?.kpis.renewSoonCompanies ?? 0, locale)}
          sub={isLoading ? undefined : `${t("metrics.suspended")}: ${ov?.kpis.suspendedCompanies ?? 0}`}
          accent="warning"
        />
        <MetricCard
          label={t("metrics.expired")}
          value={isLoading ? "—" : formatCompactNumber(ov?.kpis.expiredCompanies ?? 0, locale)}
          sub={isLoading ? undefined : `${t("metrics.newInPeriod")}: ${ov?.trends.companiesCreatedInRange ?? 0}`}
          accent="error"
        />
      </div>

      {/* Subscription status distribution + plan distribution */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Status distribution */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-theme-xs dark:border-white/8 dark:bg-surface-secondary">
          <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            {t("statusDistribution.title")}
          </h2>
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
          ) : (
            <StatusDistributionBar
              data={ch?.subscriptionStatusDistribution ?? []}
            />
          )}
        </div>

        {/* Plan distribution */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-theme-xs dark:border-white/8 dark:bg-surface-secondary">
          <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            {t("planDistribution.title")}
          </h2>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
          ) : (
            <PlanDistributionTable
              data={ch?.planDistribution ?? []}
              locale={locale}
              currencyCode={currencyCode}
            />
          )}
        </div>
      </div>

      {/* Expiring subscriptions */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-theme-xs dark:border-white/8 dark:bg-surface-secondary">
        <h2 className="mb-1 text-base font-semibold text-text-primary dark:text-white">
          {t("expiring.title")}
        </h2>
        <p className="mb-4 text-xs text-text-secondary">{t("expiring.sub")}</p>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        ) : (
          <ExpiringList data={hl?.expiringSubscriptions ?? []} />
        )}
      </div>

      {/* Plan watchlist */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-theme-xs dark:border-white/8 dark:bg-surface-secondary">
        <h2 className="mb-1 text-base font-semibold text-text-primary dark:text-white">
          {t("planWatchlist.title")}
        </h2>
        <p className="mb-4 text-xs text-text-secondary">{t("planWatchlist.sub")}</p>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        ) : (
          <PlanDistributionTable
            data={(hl?.planWatchlist ?? []).map((p) => ({
              label: p.planName,
              companiesCount: p.companiesCount,
              revenue: p.revenue,
            }))}
            locale={locale}
            currencyCode={currencyCode}
          />
        )}
      </div>
    </div>
  );
}
