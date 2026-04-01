"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Activity, Building2, CalendarRange, CreditCard, Database, RotateCcw, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import Button from "@/components/ui/button/Button";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePlatformCompany, usePlatformCompanyMetrics, useRestorePlatformCompany } from "@/lib/api/hooks/use-platform";
import { PlatformStatusBadge } from "./PlatformStatusBadge";
import { formatPlatformDate, formatPlanLabel } from "../utils/platform-format";

interface PlatformCompanyDetailsPageClientProps {
  companyId: string;
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border-light/80 bg-surface/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary dark:text-slate-400">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{value}</p>
    </div>
  );
}

export function PlatformCompanyDetailsPageClient({ companyId }: PlatformCompanyDetailsPageClientProps) {
  const t = useTranslations("platformManagement.details");
  const locale = useLocale();
  const [restoring, setRestoring] = useState(false);
  const { showSuccess, handleApiError } = useErrorHandler();
  const restoreMutation = useRestorePlatformCompany();
  const detailsQuery = usePlatformCompany(companyId, Boolean(companyId));
  const metricsQuery = usePlatformCompanyMetrics(companyId, Boolean(companyId));

  const company = detailsQuery.data;
  const metrics = metricsQuery.data;
  const subscription = metrics?.subscription ?? company?.subscriptions?.[0] ?? null;

  const handleRestore = async () => {
    if (!company || !company.isDeleted) return;
    if (!window.confirm(t("restore.confirmPrompt"))) return;

    try {
      setRestoring(true);
      await restoreMutation.mutateAsync({ companyId: company.id });
      showSuccess(t("restore.success"));
      await Promise.all([detailsQuery.refetch(), metricsQuery.refetch()]);
    } catch (error) {
      handleApiError(error, t("restore.error"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border-light/90 bg-white/92 p-6 shadow-theme-sm dark:border-white/8 dark:bg-surface-secondary/88">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">
              {company?.name ?? t("loading")}
            </h1>
          </div>

          <Link
            href={`/${locale}/super-admin/tenants`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border-light/90 bg-white/85 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </div>
        {company?.isDeleted ? (
          <div className="mt-4 flex justify-end">
            <Button
              startIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => void handleRestore()}
              disabled={restoring || restoreMutation.isPending}
            >
              {restoring || restoreMutation.isPending ? t("restore.submitting") : t("restore.action")}
            </Button>
          </div>
        ) : null}
      </section>

      <QueryState
        isLoading={detailsQuery.isLoading || metricsQuery.isLoading}
        isError={detailsQuery.isError || metricsQuery.isError}
        errorMessage={detailsQuery.error?.message ?? metricsQuery.error?.message}
        isEmpty={!detailsQuery.isLoading && !company}
        emptyTitle={t("loading")}
      >
        {company ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm dark:border-white/8 dark:bg-surface-secondary/90">
              <div className="flex flex-col gap-4 border-b border-border-light/80 pb-6 dark:border-white/8 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-text-secondary dark:text-slate-300">{company.phone || t("noPhone")} - {company.currencyCode}</p>
                  <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{company.address || t("noAddress")}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {subscription ? <PlatformStatusBadge status={subscription.status} /> : null}
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${company.isDeleted ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300" : company.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300" : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300"}`}>
                    {company.isDeleted ? t("archived") : company.isActive ? t("active") : t("inactive")}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricTile icon={<Users className="h-4 w-4" />} label={t("metrics.users")} value={metrics?.usersCount ?? company.counts.users} />
                <MetricTile icon={<Building2 className="h-4 w-4" />} label={t("metrics.customers")} value={metrics?.customersCount ?? company.counts.customers} />
                <MetricTile icon={<Building2 className="h-4 w-4" />} label={t("metrics.suppliers")} value={metrics?.suppliersCount ?? company.counts.suppliers} />
                <MetricTile icon={<Users className="h-4 w-4" />} label={t("metrics.employees")} value={metrics?.employeesCount ?? company.counts.employees} />
                <MetricTile icon={<Database className="h-4 w-4" />} label={t("metrics.ledgerEntries")} value={metrics?.ledgerEntriesCount ?? company.counts.ledgerEntries} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-border-light/80 bg-surface/60 p-5 dark:border-white/8 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-white">
                  <CreditCard className="h-4 w-4 text-primary" />
                  {t("subscription.title")}
                </div>
                {subscription ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4"><dt className="text-text-secondary dark:text-slate-400">{t("subscription.plan")}</dt><dd className="font-medium text-text-primary dark:text-white">{formatPlanLabel(subscription.plan?.name, subscription.plan?.billingCycle)}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-text-secondary dark:text-slate-400">{t("subscription.startDate")}</dt><dd className="font-medium text-text-primary dark:text-white">{formatPlatformDate(locale, subscription.startDate)}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-text-secondary dark:text-slate-400">{t("subscription.endDate")}</dt><dd className="font-medium text-text-primary dark:text-white">{formatPlatformDate(locale, subscription.endDate)}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-text-secondary dark:text-slate-400">{t("subscription.paymentStatus")}</dt><dd className="font-medium text-text-primary dark:text-white">{subscription.paymentStatus}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-text-secondary dark:text-slate-400">{t("subscription.autoRenew")}</dt><dd className="font-medium text-text-primary dark:text-white">{subscription.autoRenew ? t("yes") : t("no")}</dd></div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-text-secondary dark:text-slate-300">{t("subscription.empty")}</p>
                )}
              </section>

              <section className="rounded-2xl border border-border-light/80 bg-surface/60 p-5 dark:border-white/8 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-white"><CalendarRange className="h-4 w-4 text-primary" />{t("history.title")}</div>
                <div className="mt-4 space-y-3">
                  {company.subscriptions.length === 0 ? (
                    <p className="text-sm text-text-secondary dark:text-slate-300">{t("history.empty")}</p>
                  ) : (
                    company.subscriptions.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border-light/80 bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-text-primary dark:text-white">{formatPlanLabel(item.plan?.name, item.plan?.billingCycle)}</p>
                            <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">{formatPlatformDate(locale, item.startDate)} - {formatPlatformDate(locale, item.endDate)}</p>
                          </div>
                          <PlatformStatusBadge status={item.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-border-light/80 bg-surface/60 p-5 dark:border-white/8 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-white"><Activity className="h-4 w-4 text-primary" />{t("metadata.title")}</div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-light/80 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]"><dt className="text-text-secondary dark:text-slate-400">{t("metadata.createdAt")}</dt><dd className="font-medium text-text-primary dark:text-white">{formatPlatformDate(locale, company.createdAt)}</dd></div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-light/80 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]"><dt className="text-text-secondary dark:text-slate-400">{t("metadata.updatedAt")}</dt><dd className="font-medium text-text-primary dark:text-white">{formatPlatformDate(locale, company.updatedAt)}</dd></div>
              </dl>
            </section>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
