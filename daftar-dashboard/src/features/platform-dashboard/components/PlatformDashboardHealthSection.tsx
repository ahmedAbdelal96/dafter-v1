"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import ComponentCard from "@/components/common/ComponentCard";
import type { PlatformDashboardHealthResponse } from "@/lib/api/services/platform-dashboard";
import {
  formatCompactNumber,
  formatDate,
  formatMoney,
} from "@/features/dashboard/utils/dashboard-format";

interface PlatformDashboardHealthSectionProps {
  health?: PlatformDashboardHealthResponse;
  locale: string;
  currencyCode?: string;
  isLoading?: boolean;
}

function statusBadgeColor(status: string | null) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "TRIAL") return "info" as const;
  if (status === "SUSPENDED") return "warning" as const;
  return "error" as const;
}

function HealthSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-surface-tertiary" />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-light px-6 py-10 text-center text-sm text-text-secondary dark:border-white/10 dark:text-slate-300">
      {label}
    </div>
  );
}

export function PlatformDashboardHealthSection({
  health,
  locale,
  currencyCode = "USD",
  isLoading,
}: PlatformDashboardHealthSectionProps) {
  const t = useTranslations("platformDashboard.health");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <ComponentCard title={t("recentCompaniesTitle")} desc={t("recentCompaniesDescription")}>
        {isLoading ? (
          <HealthSkeleton />
        ) : health?.recentCompanies.length ? (
          <div className="space-y-3">
            {health.recentCompanies.map((company) => (
              <div
                key={company.id}
                className="rounded-2xl border border-border-light/80 px-4 py-4 dark:border-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white">
                      {company.name}
                    </h4>
                    <p className="text-xs text-text-secondary dark:text-slate-300">
                      {company.ownerEmail ?? t("ownerFallback")}
                    </p>
                  </div>
                  <Badge color={statusBadgeColor(company.subscriptionStatus)} size="sm">
                    {company.subscriptionStatus
                      ? t(`status.${company.subscriptionStatus}`)
                      : t("status.NONE")}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-secondary dark:text-slate-300">
                  <div>
                    <p>{t("usersLabel")}</p>
                    <p className="mt-1 font-semibold text-text-primary dark:text-white">
                      {formatCompactNumber(company.usersCount, locale)}
                    </p>
                  </div>
                  <div>
                    <p>{t("customersLabel")}</p>
                    <p className="mt-1 font-semibold text-text-primary dark:text-white">
                      {formatCompactNumber(company.customersCount, locale)}
                    </p>
                  </div>
                  <div>
                    <p>{t("ledgerLabel")}</p>
                    <p className="mt-1 font-semibold text-text-primary dark:text-white">
                      {formatCompactNumber(company.ledgerEntriesCount, locale)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-text-secondary dark:text-slate-300">
                  {t("createdAt", { date: formatDate(company.createdAt, locale) })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={t("empty")} />
        )}
      </ComponentCard>

      <ComponentCard title={t("expiringTitle")} desc={t("expiringDescription")}>
        {isLoading ? (
          <HealthSkeleton />
        ) : health?.expiringSubscriptions.length ? (
          <div className="space-y-3">
            {health.expiringSubscriptions.map((subscription) => (
              <div
                key={`${subscription.companyId}-${subscription.endDate}`}
                className="rounded-2xl border border-border-light/80 px-4 py-4 dark:border-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white">
                      {subscription.companyName}
                    </h4>
                    <p className="mt-1 text-xs text-text-secondary dark:text-slate-300">
                      {subscription.planName}
                    </p>
                  </div>
                  <Badge color={statusBadgeColor(subscription.status)} size="sm">
                    {t(`status.${subscription.status}`)}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-text-secondary dark:text-slate-300">
                  <span>{t("daysLeft", { count: subscription.daysLeft })}</span>
                  <span>{formatDate(subscription.endDate, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={t("empty")} />
        )}
      </ComponentCard>

      <ComponentCard title={t("plansWatchlistTitle")} desc={t("plansWatchlistDescription")}>
        {isLoading ? (
          <HealthSkeleton />
        ) : health?.planWatchlist.length ? (
          <div className="space-y-3">
            {health.planWatchlist.map((plan) => (
              <div
                key={plan.planName}
                className="rounded-2xl border border-border-light/80 px-4 py-4 dark:border-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white">
                      {plan.planName}
                    </h4>
                    <p className="mt-1 text-xs text-text-secondary dark:text-slate-300">
                      {t("companiesOnPlan", {
                        count: formatCompactNumber(plan.companiesCount, locale),
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {formatMoney(plan.revenue, locale, currencyCode)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label={t("empty")} />
        )}
      </ComponentCard>
    </div>
  );
}
