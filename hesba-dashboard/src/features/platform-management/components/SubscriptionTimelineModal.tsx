"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, CreditCard, History, Repeat } from "lucide-react";
import { QueryState } from "@/components/common/QueryState";
import { Modal } from "@/components/ui/modal";
import { usePlatformCompany } from "@/lib/api/hooks/use-platform";
import { PlatformStatusBadge } from "./PlatformStatusBadge";
import { formatPlatformDate, formatPlanLabel, formatRelativeDays } from "../utils/platform-format";

interface SubscriptionTimelineModalProps {
  companyId: string | null;
  open: boolean;
  onClose: () => void;
}

function paymentStatusColor(status: string) {
  switch (status) {
    case "PAID":
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300";
    case "FAILED":
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300";
    case "REFUNDED":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300";
    default:
      return "bg-surface-tertiary text-text-secondary dark:bg-white/[0.05] dark:text-slate-300";
  }
}

export function SubscriptionTimelineModal({
  companyId,
  open,
  onClose,
}: SubscriptionTimelineModalProps) {
  const t = useTranslations("platformManagement.subscriptions.timeline");
  const locale = useLocale();
  const companyQuery = usePlatformCompany(companyId ?? "", open);

  const timelineItems = useMemo(() => {
    const subscriptions = companyQuery.data?.subscriptions ?? [];
    return [...subscriptions].sort((a, b) => {
      const left = new Date(b.createdAt || b.startDate).getTime();
      const right = new Date(a.createdAt || a.startDate).getTime();
      return left - right;
    });
  }, [companyQuery.data?.subscriptions]);

  const companyName = companyQuery.data?.name ?? t("fallbackCompany");

  return (
    <Modal isOpen={open} onClose={onClose} className="mx-auto w-full max-w-4xl p-6 sm:p-8">
      <div className="space-y-5">
        <div className="border-b border-border-light/80 pb-5 dark:border-white/8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-slate-300">
            {companyName}
          </p>
        </div>

        <QueryState
          isLoading={companyQuery.isLoading}
          isError={companyQuery.isError}
          errorMessage={companyQuery.error?.message}
          isEmpty={!companyQuery.isLoading && timelineItems.length === 0}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        >
          <div className="space-y-4">
            {timelineItems.map((item) => {
              const daysLeft = formatRelativeDays(item.endDate);
              const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border-light/80 bg-surface/60 p-5 dark:border-white/8 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-text-primary dark:text-white">
                        {formatPlanLabel(item.plan?.name, item.plan?.billingCycle)}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
                        {t("createdAt", { date: formatPlatformDate(locale, item.createdAt) })}
                      </p>
                    </div>
                    <PlatformStatusBadge status={item.status} />
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-xl border border-border-light/80 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
                      <dt className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
                        <CalendarRange className="h-4 w-4 text-primary" />
                        {t("period")}
                      </dt>
                      <dd className="mt-2 font-medium text-text-primary dark:text-white">
                        {formatPlatformDate(locale, item.startDate)} - {formatPlatformDate(locale, item.endDate)}
                      </dd>
                      <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">
                        {daysLeft === null ? t("noExpiry") : t("daysLeft", { count: daysLeft })}
                      </p>
                      {isExpiringSoon ? (
                        <p className="mt-1 text-xs font-semibold text-warning-700 dark:text-warning-300">
                          {t("expiringSoon")}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-border-light/80 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
                      <dt className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
                        <CreditCard className="h-4 w-4 text-primary" />
                        {t("paymentStatus")}
                      </dt>
                      <dd className="mt-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusColor(item.paymentStatus)}`}>
                          {t(`payment.${item.paymentStatus}`)}
                        </span>
                      </dd>
                    </div>

                    <div className="rounded-xl border border-border-light/80 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
                      <dt className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
                        <Repeat className="h-4 w-4 text-primary" />
                        {t("autoRenew")}
                      </dt>
                      <dd className="mt-2 font-medium text-text-primary dark:text-white">
                        {item.autoRenew ? t("yes") : t("no")}
                      </dd>
                    </div>

                    <div className="rounded-xl border border-border-light/80 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
                      <dt className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
                        <History className="h-4 w-4 text-primary" />
                        {t("updatedAt")}
                      </dt>
                      <dd className="mt-2 font-medium text-text-primary dark:text-white">
                        {formatPlatformDate(locale, item.updatedAt ?? item.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </QueryState>
      </div>
    </Modal>
  );
}

