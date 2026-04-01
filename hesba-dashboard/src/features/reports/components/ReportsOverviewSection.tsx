"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import Button from "@/components/ui/button/Button";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import type { PartyType, ReportsSummaryResponse } from "@/lib/api/types";
import { toNumber, formatMoney } from "../utils/reports-format";
import { ReportsOverviewCharts } from "./ReportsOverviewCharts";

interface ReportsOverviewSectionProps {
  summary: ReportsSummaryResponse;
  loading: boolean;
  filters: {
    partyType: "all" | PartyType;
    dateFrom: string;
    dateTo: string;
  };
  onPartyTypeChange: (value: "all" | PartyType) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onOpenCollectionsFollowup: () => void;
  onOpenDebtsSummary: () => void;
  onOpenStaffActivity: () => void;
  onCollectionBreakdownDrilldown: (payload: {
    flow: "DEFERRED" | "INSTALLMENT";
    metric: "paid" | "remaining" | "overdue";
  }) => void;
  onOverdueDistributionDrilldown: (flow: "DEFERRED" | "INSTALLMENT") => void;
}

const sectionCardClassName =
  "rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20";

export function ReportsOverviewSection({
  summary,
  loading,
  filters,
  onPartyTypeChange,
  onDateFromChange,
  onDateToChange,
  onOpenCollectionsFollowup,
  onOpenDebtsSummary,
  onOpenStaffActivity,
  onCollectionBreakdownDrilldown,
  onOverdueDistributionDrilldown,
}: ReportsOverviewSectionProps) {
  const t = useTranslations("reports.overview");
  const locale = useLocale();

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.partyTypeAll") },
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
      { value: "EMPLOYEE", label: t("filters.partyTypeEmployee") },
    ],
    [t]
  );

  const deferredPaidRate =
    toNumber(summary.deferredSales.totalAmount) <= 0
      ? 0
      : Math.min(
          100,
          (toNumber(summary.deferredSales.paidAmount) / toNumber(summary.deferredSales.totalAmount)) * 100
        );

  const installmentsPaidRate =
    toNumber(summary.installments.totalAmount) <= 0
      ? 0
      : Math.min(
          100,
          (toNumber(summary.installments.paidAmount) / toNumber(summary.installments.totalAmount)) * 100
        );

  return (
    <section className="space-y-4">
      <div className={sectionCardClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{t("title")}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary dark:text-slate-300">{t("subtitle")}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Combobox
            value={filters.partyType}
            options={partyTypeOptions}
            searchable={false}
            placeholder={t("filters.partyType")}
            searchPlaceholder={t("filters.partyType")}
            onChange={(value) => onPartyTypeChange((value as "all" | PartyType | undefined) ?? "all")}
          />
          <DatePicker
            id="reports-overview-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={filters.dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />
          <DatePicker
            id="reports-overview-date-to"
            placeholder={t("filters.dateTo")}
            defaultDate={filters.dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title={t("cards.totalReceivables")}
          amount={summary.totalReceivables}
          value={formatMoney(summary.totalReceivables, locale)}
          loading={loading}
          onClick={onOpenDebtsSummary}
        />
        <SummaryCard
          title={t("cards.deferredRemaining")}
          amount={summary.deferredSales.remainingAmount}
          value={formatMoney(summary.deferredSales.remainingAmount, locale)}
          loading={loading}
          onClick={onOpenCollectionsFollowup}
        />
        <SummaryCard
          title={t("cards.installmentsRemaining")}
          amount={summary.installments.remainingAmount}
          value={formatMoney(summary.installments.remainingAmount, locale)}
          loading={loading}
          onClick={onOpenCollectionsFollowup}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProgressPanel
          title={t("panels.deferredProgress")}
          subtitle={t("panels.deferredProgressSubtitle", {
            total: summary.deferredSales.total,
            overdue: summary.deferredSales.overdueCount,
          })}
          progress={deferredPaidRate}
          leftLabel={t("panels.paid")}
          leftAmount={summary.deferredSales.paidAmount}
          leftValue={formatMoney(summary.deferredSales.paidAmount, locale)}
          rightLabel={t("panels.remaining")}
          rightAmount={summary.deferredSales.remainingAmount}
          rightValue={formatMoney(summary.deferredSales.remainingAmount, locale)}
          warningLabel={t("panels.overdueAmount")}
          warningAmount={summary.deferredSales.overdueAmount}
          warningValue={formatMoney(summary.deferredSales.overdueAmount, locale)}
          loading={loading}
          onClick={onOpenCollectionsFollowup}
        />

        <ProgressPanel
          title={t("panels.installmentsProgress")}
          subtitle={t("panels.installmentsProgressSubtitle", {
            total: summary.installments.activeContracts,
            overdue: summary.installments.overdueSchedules,
          })}
          progress={installmentsPaidRate}
          leftLabel={t("panels.paid")}
          leftAmount={summary.installments.paidAmount}
          leftValue={formatMoney(summary.installments.paidAmount, locale)}
          rightLabel={t("panels.remaining")}
          rightAmount={summary.installments.remainingAmount}
          rightValue={formatMoney(summary.installments.remainingAmount, locale)}
          warningLabel={t("panels.overdueAmount")}
          warningAmount={summary.installments.overdueAmount}
          warningValue={formatMoney(summary.installments.overdueAmount, locale)}
          loading={loading}
          onClick={onOpenCollectionsFollowup}
        />
      </div>

      <ReportsOverviewCharts
        summary={summary}
        loading={loading}
        onCollectionBreakdownDrilldown={onCollectionBreakdownDrilldown}
        onOverdueDistributionDrilldown={onOverdueDistributionDrilldown}
      />

      <div className={sectionCardClassName}>
        <p className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">{t("actions.title")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={onOpenCollectionsFollowup}>
            {t("actions.openCollectionsFollowup")}
          </Button>
          <Button variant="outline" onClick={onOpenDebtsSummary}>
            {t("actions.openDebtsSummary")}
          </Button>
          <Button variant="outline" onClick={onOpenStaffActivity}>
            {t("actions.openStaffActivity")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  amount,
  value,
  loading,
  onClick,
}: {
  title: string;
  amount: string | number;
  value: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  const isInteractive = typeof onClick === "function" && !loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={`rounded-3xl border border-border-light/90 bg-white/94 p-4 text-start shadow-sm shadow-slate-200/60 transition backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20 ${
        isInteractive
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
          : "cursor-default"
      }`}
    >
      <p className="text-sm text-text-secondary dark:text-slate-300">{title}</p>
      <div className="mt-2">
        {loading ? (
          <p className="text-lg font-semibold text-slate-400 dark:text-slate-500">...</p>
        ) : (
          <FinancialAmount amount={amount} formatted={value} variant="card" className="text-lg" />
        )}
      </div>
    </button>
  );
}

function ProgressPanel({
  title,
  subtitle,
  progress,
  leftLabel,
  leftAmount,
  leftValue,
  rightLabel,
  rightAmount,
  rightValue,
  warningLabel,
  warningAmount,
  warningValue,
  loading,
  onClick,
}: {
  title: string;
  subtitle: string;
  progress: number;
  leftLabel: string;
  leftAmount: string | number;
  leftValue: string;
  rightLabel: string;
  rightAmount: string | number;
  rightValue: string;
  warningLabel: string;
  warningAmount: string | number;
  warningValue: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  const isInteractive = typeof onClick === "function" && !loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={`rounded-3xl border border-border-light/90 bg-white/94 p-5 text-start shadow-sm shadow-slate-200/60 transition backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 dark:shadow-black/20 ${
        isInteractive
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
          : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-slate-300">{subtitle}</p>
        </div>
        <div className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/12">
          {progress.toFixed(2)}%
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ValueBlock label={leftLabel} amount={leftAmount} value={leftValue} loading={loading} />
        <ValueBlock label={rightLabel} amount={rightAmount} value={rightValue} loading={loading} />
      </div>

      <div className="mt-3 rounded-2xl border border-danger-200/80 bg-danger-50/80 p-3 dark:border-danger-500/20 dark:bg-danger-500/10">
        <p className="text-xs font-medium text-danger-700 dark:text-danger-300">{warningLabel}</p>
        {loading ? (
          <p className="mt-1 text-sm font-semibold text-danger-800 dark:text-danger-200">...</p>
        ) : (
          <FinancialAmount
            amount={warningAmount}
            formatted={warningValue}
            variant="card"
            className="mt-1 text-sm text-danger-800 dark:text-danger-200"
            zeroNeutral={false}
          />
        )}
      </div>
    </button>
  );
}

function ValueBlock({
  label,
  amount,
  value,
  loading,
}: {
  label: string;
  amount: string | number;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-light/80 bg-slate-50/80 p-3 dark:border-white/8 dark:bg-white/[0.03]">
      <p className="text-xs font-medium text-text-secondary dark:text-slate-400">{label}</p>
      {loading ? (
        <p className="mt-1 text-sm font-semibold text-slate-400 dark:text-slate-500">...</p>
      ) : (
        <FinancialAmount amount={amount} formatted={value} variant="card" className="mt-1 text-sm" />
      )}
    </div>
  );
}
