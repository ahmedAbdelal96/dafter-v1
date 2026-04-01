"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/common/ComponentCard";

const QUICK_LINKS = [
  { key: "tenants", href: "/super-admin/tenants" },
  { key: "subscriptions", href: "/super-admin/subscriptions" },
] as const;

export function PlatformDashboardQuickLinks() {
  const t = useTranslations("platformDashboard.quickLinks");

  return (
    <ComponentCard title={t("title")} desc={t("description")}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="group rounded-2xl border border-border-light/80 bg-white/70 px-5 py-4 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-theme-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <p className="text-sm font-semibold text-text-primary transition group-hover:text-primary dark:text-white">
              {t(`${link.key}.title`)}
            </p>
            <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">
              {t(`${link.key}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </ComponentCard>
  );
}
