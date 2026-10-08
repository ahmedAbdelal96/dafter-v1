"use client";

import type { SVGProps } from "react";
import { useTranslations } from "next-intl";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import type { PlatformDashboardOverviewResponse } from "@/lib/api/services/platform-dashboard";
import {
  formatCompactNumber,
  formatMoney,
} from "@/features/dashboard/utils/dashboard-format";

function BuildingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10h.01" />
      <path d="M9 14h.01" />
      <path d="M15 10h.01" />
      <path d="M15 14h.01" />
    </svg>
  );
}

function CreditCardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 20a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path d="M5 20a3 3 0 0 0-2-1.5" />
      <path d="M19 20a3 3 0 0 1 2-1.5" />
    </svg>
  );
}

function PulseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 12h4l2.2-5 4.3 10L16 12h5" />
    </svg>
  );
}

interface PlatformDashboardOverviewGridProps {
  overview?: PlatformDashboardOverviewResponse;
  locale: string;
  currencyCode?: string;
  isLoading?: boolean;
}

export function PlatformDashboardOverviewGrid({
  overview,
  locale,
  currencyCode = "USD",
  isLoading,
}: PlatformDashboardOverviewGridProps) {
  const t = useTranslations("platformDashboard.cards");

  const cards = [
    {
      title: t("totalCompanies"),
      value: formatCompactNumber(overview?.kpis.totalCompanies ?? 0, locale),
      subtitle: t("activeCompanies", {
        count: overview?.kpis.activeCompanies ?? 0,
      }),
      icon: BuildingsIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      title: t("paidCompanies"),
      value: formatCompactNumber(overview?.kpis.paidCompanies ?? 0, locale),
      subtitle: t("trialCompanies", {
        count: overview?.kpis.trialCompanies ?? 0,
      }),
      icon: CreditCardIcon,
      iconColor: "text-success-700",
      iconBgColor: "bg-success-500/12",
    },
    {
      title: t("totalUsers"),
      value: formatCompactNumber(overview?.kpis.totalUsers ?? 0, locale),
      subtitle: t("plansSummary", {
        total: overview?.kpis.totalPlans ?? 0,
        active: overview?.kpis.activePlans ?? 0,
      }),
      icon: UsersIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      title: t("renewSoon"),
      value: formatCompactNumber(overview?.kpis.renewSoonCompanies ?? 0, locale),
      subtitle: t("suspendedCompanies", {
        count: overview?.kpis.suspendedCompanies ?? 0,
      }),
      icon: PulseIcon,
      iconColor: "text-warning-700",
      iconBgColor: "bg-warning-500/12",
    },
    {
      title: t("revenueCollected"),
      value: formatMoney(
        overview?.trends.revenueCollected ?? 0,
        locale,
        currencyCode,
      ),
      isMonetary: true,
      subtitle: t("annualRunRate", {
        amount: formatMoney(
          overview?.trends.annualRunRate ?? 0,
          locale,
          currencyCode,
        ),
      }),
      icon: CreditCardIcon,
      iconColor: "text-success-700",
      iconBgColor: "bg-success-500/12",
    },
    {
      title: t("companiesCreated"),
      value: formatCompactNumber(
        overview?.trends.companiesCreatedInRange ?? 0,
        locale,
      ),
      subtitle: t("subscriptionsCreated", {
        count: overview?.trends.subscriptionsCreatedInRange ?? 0,
      }),
      icon: BuildingsIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
    },
    {
      title: t("expiredCompanies"),
      value: formatCompactNumber(overview?.kpis.expiredCompanies ?? 0, locale),
      subtitle: t("statusWatch", {
        active: overview?.kpis.paidCompanies ?? 0,
        suspended: overview?.kpis.suspendedCompanies ?? 0,
      }),
      icon: PulseIcon,
      iconColor: "text-error-700",
      iconBgColor: "bg-error-500/12",
    },
    {
      title: t("activePlans"),
      value: formatCompactNumber(overview?.kpis.activePlans ?? 0, locale),
      subtitle: t("platformCoverage", {
        count: overview?.kpis.totalCompanies ?? 0,
      }),
      icon: UsersIcon,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/10",
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
