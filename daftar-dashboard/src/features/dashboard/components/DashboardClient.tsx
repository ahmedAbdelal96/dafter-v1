"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const quickModules = [
  { key: "customers", href: "/customers" },
  { key: "suppliers", href: "/suppliers" },
  { key: "invoices", href: "/invoices" },
  { key: "expenses", href: "/expenses" },
  { key: "deferredSales", href: "/deferred-sales" },
  { key: "installments", href: "/installments" },
  { key: "ledger", href: "/ledger" },
  { key: "reports", href: "/reports" },
];

export function DashboardClient() {
  const t = useTranslations("dashboard.quickModules");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {quickModules.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-2xl border border-border-light bg-surface-secondary p-5 shadow-theme-sm transition-shadow hover:border-primary/20 hover:shadow-theme-md dark:border-border-strong dark:bg-surface-secondary dark:hover:border-primary/30"
        >
          <h3 className="text-base font-semibold tracking-tight text-text-primary dark:text-white">
            {t(`${item.key}.title`)}
          </h3>
          <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">
            {t(`${item.key}.description`)}
          </p>
        </Link>
      ))}
    </div>
  );
}
