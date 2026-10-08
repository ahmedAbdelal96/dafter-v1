"use client";

import type { SVGProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import type { ExpensesSummaryResponse } from "@/lib/api/types";
import { formatMoney } from "../utils/expense-format";

interface ExpensesSummaryCardsProps {
  summary?: ExpensesSummaryResponse;
}

function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20a1 1 0 0 1 1 1v2H6.5A2.5 2.5 0 0 0 4 10.5v6A2.5 2.5 0 0 0 6.5 19H21v2a1 1 0 0 1-1 1H5.5A2.5 2.5 0 0 1 3 19.5z" />
      <path d="M21 8v10H6.5A1.5 1.5 0 0 1 5 16.5v-7A1.5 1.5 0 0 1 6.5 8z" />
      <circle cx="16.5" cy="13" r="1" />
    </svg>
  );
}

function ListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

export function ExpensesSummaryCards({ summary }: ExpensesSummaryCardsProps) {
  const t = useTranslations("expenses");
  const locale = useLocale();

  const totalAmount = summary?.totalAmount ?? "0";
  const count = summary?.count ?? 0;
  const topCategories = (summary?.byCategory ?? []).slice(0, 3);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <StatsCard
        title={t("summary.totalAmount")}
        value={formatMoney(totalAmount, locale)}
        isMonetary
        icon={WalletIcon}
        iconColor="text-primary"
        iconBgColor="bg-primary/10"
      />
      <StatsCard
        title={t("summary.count")}
        value={String(count)}
        icon={ListIcon}
        iconColor="text-success-700"
        iconBgColor="bg-success-500/12"
      />
      {topCategories.length > 0 ? (
        topCategories.map((item) => (
          <StatsCard
            key={item.category}
            title={t(`categories.${item.category}`)}
            value={formatMoney(item.total, locale)}
            isMonetary
            subtitle={t("summary.itemsCount", { count: item.count })}
            icon={WalletIcon}
            iconColor="text-warning-700"
            iconBgColor="bg-warning-500/12"
          />
        ))
      ) : (
        <StatsCard
          title={t("summary.noCategoryBreakdown")}
          value={t("summary.noData")}
          icon={ListIcon}
          iconColor="text-text-secondary"
          iconBgColor="bg-surface-tertiary"
        />
      )}
    </section>
  );
}
