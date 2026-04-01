"use client";

import { useLocale, useTranslations } from "next-intl";
import { Activity, Building2, CalendarRange, CreditCard, Database, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { usePlatformCompany, usePlatformCompanyMetrics } from "@/lib/api/hooks/use-platform";
import { PlatformStatusBadge } from "./PlatformStatusBadge";
import { formatPlatformDate, formatPlanLabel } from "../utils/platform-format";

interface PlatformCompanyDetailsModalProps {
  companyId: string | null;
  open: boolean;
  onClose: () => void;
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

export function PlatformCompanyDetailsModal({ companyId, open, onClose }: PlatformCompanyDetailsModalProps) {
  const t = useTranslations("platformManagement.details");
  const locale = useLocale();
  const detailsQuery = usePlatformCompany(companyId ?? "", open);
  const metricsQuery = usePlatformCompanyMetrics(companyId ?? "", open);

  const company = detailsQuery.data;
  const metrics = metricsQuery.data;
  const isLoading = detailsQuery.isLoading || metricsQuery.isLoading;
  const subscription = metrics?.subscription ?? company?.subscriptions?.[0] ?? null;

  return (
    <Modal isOpen={open} onClose={onClose} className="mx-auto w-full max-w-5xl p-6 sm:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-border-light/80 pb-6 dark:border-white/8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{company?.name ?? t("loading")}</h2>
            <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">{company?.phone || t("noPhone")} · {company?.currencyCode || "-"}</p>
            <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{company?.address || t("noAddress")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {subscription ? <PlatformStatusBadge status={subscription.status} /> : null}
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${company?.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300" : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300"}`}>
              {company?.isActive ? t("active") : t("inactive")}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border-light/80 bg-surface/60 p-6 text-sm text-text-secondary dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-300">{t("loading")}</div>
        ) : null}

        {!isLoading && company ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricTile icon={<Users className="h-4 w-4" />} label={t("metrics.users")} value={metrics?.usersCount ?? company.counts.users} />
              <MetricTile icon={<Building2 className="h-4 w-4" />} label={t("metrics.customers")} value={metrics?.customersCount ?? company.counts.customers} />
              <MetricTile icon={<Building2 className="h-4 w-4" />} label={t("metrics.suppliers")} value={metrics?.suppliersCount ?? company.counts.suppliers} />
              <MetricTile icon={<Users className="h-4 w-4" />} label={t("metrics.employees")} value={metrics?.employeesCount ?? company.counts.employees} />
              <MetricTile icon={<Database className="h-4 w-4" />} label={t("metrics.ledgerEntries")} value={metrics?.ledgerEntriesCount ?? company.counts.ledgerEntries} />
            </div>

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
          </>
        ) : null}
      </div>
    </Modal>
  );
}

