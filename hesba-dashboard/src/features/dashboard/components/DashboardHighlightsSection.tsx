"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import type { DashboardHighlightsResponse } from "@/lib/api/services/dashboard";
import { formatMoney } from "../utils/dashboard-format";

interface DashboardHighlightsSectionProps {
  highlights?: DashboardHighlightsResponse;
  locale: string;
  currencyCode: string;
  isLoading?: boolean;
}

function HighlightsSkeleton() {
  return <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-2xl bg-surface-tertiary" />)}</div>;
}

function RowLink({ href, title, subtitle, value }: { href: string; title: string; subtitle: string; value: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl border border-border-light/80 px-4 py-3 transition hover:border-primary/25 hover:bg-primary-light/50 dark:border-white/8 dark:hover:bg-white/[0.03]">
      <div>
        <p className="text-sm font-semibold text-text-primary dark:text-white">{title}</p>
        <p className="mt-1 text-xs text-text-secondary dark:text-slate-300">{subtitle}</p>
      </div>
      <div className="text-sm font-semibold text-primary">{value}</div>
    </Link>
  );
}

export function DashboardHighlightsSection({ highlights, locale, currencyCode, isLoading }: DashboardHighlightsSectionProps) {
  const t = useTranslations("dashboard.highlights");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <ComponentCard title={t("topCustomersTitle")} desc={t("topCustomersDescription")}>
        {isLoading || !highlights ? (
          <HighlightsSkeleton />
        ) : (
          <div className="space-y-3">
            {highlights.topCustomers.map((item) => (
              <RowLink
                key={item.id}
                href={`/customers/${item.id}`}
                title={item.name}
                subtitle={t("outstandingBalance", { amount: formatMoney(item.outstandingBalance, locale, currencyCode) })}
                value={formatMoney(item.totalSales, locale, currencyCode)}
              />
            ))}
          </div>
        )}
      </ComponentCard>

      <ComponentCard title={t("topProductsTitle")} desc={t("topProductsDescription")}>
        {isLoading || !highlights ? (
          <HighlightsSkeleton />
        ) : (
          <div className="space-y-3">
            {highlights.topProducts.map((item, index) => (
              <RowLink
                key={`${item.id ?? item.name}-${index}`}
                href={item.id ? `/products/${item.id}` : "/products"}
                title={item.name}
                subtitle={t("quantitySold", { quantity: item.quantitySold })}
                value={formatMoney(item.salesAmount, locale, currencyCode)}
              />
            ))}
          </div>
        )}
      </ComponentCard>

      <ComponentCard title={t("topEmployeesTitle")} desc={t("topEmployeesDescription")}>
        {isLoading || !highlights ? (
          <HighlightsSkeleton />
        ) : (
          <div className="space-y-3">
            {highlights.topEmployees.map((item) => (
              <RowLink
                key={item.id}
                href={`/users`}
                title={item.name}
                subtitle={t("employeeMeta", { invoices: item.invoicesCount, collections: formatMoney(item.collectionsAmount, locale, currencyCode) })}
                value={formatMoney(item.salesAmount, locale, currencyCode)}
              />
            ))}
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
