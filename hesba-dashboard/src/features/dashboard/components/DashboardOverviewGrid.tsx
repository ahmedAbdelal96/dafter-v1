"use client";

import type { SVGProps } from "react";
import { useTranslations } from "next-intl";
import { StatsCard } from "./StatsCard";
import type { DashboardOverviewResponse } from "@/lib/api/services/dashboard";
import { formatCompactNumber, formatMoney } from "../utils/dashboard-format";

function ChartBarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20v-4" />
    </svg>
  );
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

function WarningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3 2.8 19a1 1 0 0 0 .87 1.5h16.66A1 1 0 0 0 21.2 19z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="16.8" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 20a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path d="M6 20a3.5 3.5 0 0 0-3-2" />
      <path d="M18 20a3.5 3.5 0 0 1 3-2" />
    </svg>
  );
}

interface DashboardOverviewGridProps {
  overview?: DashboardOverviewResponse;
  locale: string;
  isLoading?: boolean;
}

export function DashboardOverviewGrid({ overview, locale, isLoading }: DashboardOverviewGridProps) {
  const t = useTranslations("dashboard.cards");
  const currencyCode = overview?.company.currencyCode ?? "EGP";

  const cards = [
    {
      title: t("totalSales"),
      value: formatMoney(overview?.kpis.totalSales, locale, currencyCode),
      isMonetary: true,
      subtitle: t("invoicesCount", { count: overview?.operations.invoicesCount ?? 0 }),
      icon: ChartBarIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      title: t("collectionAmount"),
      value: formatMoney(overview?.kpis.collectionAmount, locale, currencyCode),
      isMonetary: true,
      subtitle: t("cashNetFlow"),
      icon: WalletIcon,
      iconColor: "text-success-700",
      iconBgColor: "bg-success-500/12",
    },
    {
      title: t("totalExpenses"),
      value: formatMoney(overview?.kpis.totalExpenses, locale, currencyCode),
      isMonetary: true,
      subtitle: t("payables", { count: formatMoney(overview?.kpis.payables, locale, currencyCode) }),
      icon: WarningIcon,
      iconColor: "text-warning-700",
      iconBgColor: "bg-warning-500/12",
    },
    {
      title: t("activeCustomers"),
      value: formatCompactNumber(overview?.operations.activeCustomers ?? 0, locale),
      subtitle: t("productsEmployees", {
        products: overview?.operations.activeProducts ?? 0,
        employees: overview?.operations.activeEmployees ?? 0,
      }),
      icon: PeopleIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      title: t("netProfit"),
      value: formatMoney(overview?.kpis.netProfit, locale, currencyCode),
      isMonetary: true,
      subtitle: t("receivables", { amount: formatMoney(overview?.kpis.receivables, locale, currencyCode) }),
      icon: ChartBarIcon,
      iconColor: "text-success-700",
      iconBgColor: "bg-success-500/12",
    },
    {
      title: t("cashNetFlow"),
      value: formatMoney(overview?.kpis.cashNetFlow, locale, currencyCode),
      isMonetary: true,
      subtitle: t("deferredInstallments", {
        deferred: overview?.operations.deferredSalesCount ?? 0,
        installments: overview?.operations.installmentContractsCount ?? 0,
      }),
      icon: WalletIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      title: t("overdueCount"),
      value: formatCompactNumber(overview?.operations.overdueCount ?? 0, locale),
      subtitle: t("overdueBreakdown", {
        deferred: overview?.alerts.overdueDeferredSales ?? 0,
        installments: overview?.alerts.overdueInstallments ?? 0,
      }),
      icon: WarningIcon,
      iconColor: "text-error-700",
      iconBgColor: "bg-error-500/12",
    },
    {
      title: t("creditRisk"),
      value: formatCompactNumber(overview?.alerts.customersNearCreditLimit ?? 0, locale),
      subtitle: t("criticalNegativeBalances", { count: overview?.alerts.criticalNegativeBalances ?? 0 }),
      icon: PeopleIcon,
      iconColor: "text-warning-700",
      iconBgColor: "bg-warning-500/12",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatsCard key={card.title} {...card} isLoading={isLoading} />
      ))}
    </div>
  );
}
