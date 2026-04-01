"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import ComponentCard from "@/components/common/ComponentCard";
import type { DashboardAlertItem } from "@/lib/api/services/dashboard";
import { formatDate, formatMoney } from "../utils/dashboard-format";

interface DashboardAlertsSectionProps {
  alerts?: DashboardAlertItem[];
  locale: string;
  currencyCode: string;
  isLoading?: boolean;
}

function severityColor(severity: DashboardAlertItem["severity"]) {
  if (severity === "high") return "error" as const;
  if (severity === "medium") return "warning" as const;
  return "info" as const;
}

export function DashboardAlertsSection({ alerts, locale, currencyCode, isLoading }: DashboardAlertsSectionProps) {
  const t = useTranslations("dashboard.alerts");

  return (
    <ComponentCard title={t("title")} desc={t("description")}>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-18 animate-pulse rounded-2xl bg-surface-tertiary" />)}</div>
      ) : alerts?.length ? (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={`${alert.type}-${alert.entityId ?? index}`} className="rounded-2xl border border-border-light/80 px-4 py-4 dark:border-white/8">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-text-primary dark:text-white">{alert.title}</h4>
                    <Badge color={severityColor(alert.severity)} size="sm">{t(`severity.${alert.severity}`)}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-slate-300">{alert.description}</p>
                </div>
                <div className="space-y-1 text-sm text-text-secondary dark:text-slate-300 md:text-end">
                  {alert.amount ? <p className="font-semibold text-text-primary dark:text-white">{formatMoney(alert.amount, locale, currencyCode)}</p> : null}
                  {alert.dueDate ? <p>{t("dueDate", { date: formatDate(alert.dueDate, locale) })}</p> : null}
                  {alert.entityType ? <p>{t("entityType", { type: alert.entityType })}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-light px-6 py-10 text-center text-sm text-text-secondary dark:border-white/10 dark:text-slate-300">
          {t("empty")}
        </div>
      )}
    </ComponentCard>
  );
}
