"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import { QueryState } from "@/components/common/QueryState";
import { useEmployee } from "@/lib/api/hooks/use-employees";
import { formatMoney } from "../utils/employee-format";
import { EmployeeLedgerSection } from "./EmployeeLedgerSection";

interface EmployeeDetailsPageClientProps {
  employeeId: string;
}

export function EmployeeDetailsPageClient({ employeeId }: EmployeeDetailsPageClientProps) {
  const t = useTranslations("employees");
  const locale = useLocale();

  const employeeQuery = useEmployee(employeeId, Boolean(employeeId));
  const employee = employeeQuery.data;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("details.title")}</h1>
            <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{t("details.subtitle")}</p>
          </div>

          <Link
            href={`/${locale}/employees`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border-light/90 bg-white/80 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft size={16} />
            {t("details.backToList")}
          </Link>
        </div>
      </section>

      <QueryState
        isLoading={employeeQuery.isLoading}
        isError={employeeQuery.isError}
        errorMessage={employeeQuery.error?.message}
        isEmpty={!employeeQuery.isLoading && !employee}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        {employee && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <section className="space-y-4 rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 xl:col-span-4">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white">{t("details.infoSectionTitle")}</h2>

              <InfoItem label={t("table.name")} value={employee.name} />
              <InfoItem label={t("table.phone")} value={employee.phone || "-"} />
              <InfoItem label={t("table.jobTitle")} value={employee.jobTitle || "-"} />
              <InfoItem
                label={t("table.status")}
                value={employee.isActive ? t("status.active") : t("status.inactive")}
                tone={employee.isActive ? "positive" : "neutral"}
              />
              <InfoItem
                label={t("table.openingBalance")}
                value={
                  <FinancialAmount
                    amount={employee.openingBalance}
                    formatted={formatMoney(employee.openingBalance, locale)}
                    variant="card"
                  />
                }
              />
              <InfoItem
                label={t("table.balance")}
                value={
                  <FinancialAmount
                    amount={employee.balance}
                    formatted={formatMoney(employee.balance, locale)}
                    variant="card"
                  />
                }
              />
              <InfoItem
                label={t("details.meta.createdAt")}
                value={dateFormatter.format(new Date(employee.createdAt))}
              />
              <InfoItem
                label={t("details.meta.updatedAt")}
                value={dateFormatter.format(new Date(employee.updatedAt))}
              />
            </section>

            <div className="space-y-6 xl:col-span-8">
              <EmployeeLedgerSection employeeId={employee.id} />
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function InfoItem({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "finance-positive"
      : tone === "neutral"
      ? "text-text-secondary dark:text-slate-300"
      : "text-text-primary dark:text-white";

  return (
    <div className="rounded-2xl border border-border-light/80 bg-surface-secondary/65 p-3 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className={`mt-1 text-sm font-medium ${toneClass}`}>{value}</div>
    </div>
  );
}


