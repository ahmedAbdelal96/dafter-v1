"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import { QueryState } from "@/components/common/QueryState";
import { useMyEntitlements } from "@/lib/api/hooks/use-entitlements";
import type { EntitlementQuotaType } from "@/lib/api/types";

const QUOTA_KEYS: EntitlementQuotaType[] = [
  "users",
  "customers",
  "suppliers",
  "employees",
  "ledgerEntries",
];

function statusBadgeColor(status: string): "success" | "warning" | "error" | "light" {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "success";
    case "TRIAL":
      return "warning";
    case "EXPIRED":
    case "SUSPENDED":
    case "CANCELLED":
      return "error";
    default:
      return "light";
  }
}

export function SubscriptionPageClient() {
  const t = useTranslations("entitlements");

  const entitlementsQuery = useMyEntitlements();
  const data = entitlementsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("page.title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("page.subtitle")}</p>
      </section>

      <QueryState
        isLoading={entitlementsQuery.isLoading}
        isError={entitlementsQuery.isError}
        errorMessage={entitlementsQuery.error?.message}
        isEmpty={!entitlementsQuery.isLoading && !data}
        emptyTitle={t("page.empty.title")}
        emptyDescription={t("page.empty.description")}
      >
        {data && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Plan card */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("page.planSection")}
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("page.planName")}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{data.planName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("page.status")}</span>
                  <Badge color={statusBadgeColor(data.subscriptionStatus)}>
                    {t(`page.statusValues.${data.subscriptionStatus}`, {
                      defaultValue: data.subscriptionStatus,
                    })}
                  </Badge>
                </div>

                {data.endDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("page.endDate")}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      }).format(new Date(data.endDate))}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Features card */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("page.featuresSection")}
              </h2>

              {data.features.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("page.noFeatures")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Quotas — full width */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("page.quotasSection")}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {QUOTA_KEYS.map((key) => {
                  const quota = data.quotas[key];
                  if (!quota) return null;

                  const pct = quota.isUnlimited ? null : (quota.usagePercent ?? 0);
                  const barColor =
                    quota.isAtLimit
                      ? "bg-red-500"
                      : (pct ?? 0) >= 80
                      ? "bg-yellow-400"
                      : "bg-primary-500";

                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-100 p-3 dark:border-gray-700"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t(`entities.${key}`)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {quota.isUnlimited
                            ? t("page.unlimited")
                            : `${quota.current} / ${quota.limit}`}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        {!quota.isUnlimited && pct !== null && (
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        )}
                        {quota.isUnlimited && (
                          <div className="h-full w-full rounded-full bg-primary-200 dark:bg-primary-800" />
                        )}
                      </div>

                      {quota.isAtLimit && (
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          {t("errors.planLimitReached", { entity: t(`entities.${key}`) })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}
