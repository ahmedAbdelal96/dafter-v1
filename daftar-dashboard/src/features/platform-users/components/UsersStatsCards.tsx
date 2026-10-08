"use client";

import { Users, UserCheck, UserX, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UsersStats } from "@/lib/api/types/platform";

interface UsersStatsCardsProps {
  stats: UsersStats;
}

export function UsersStatsCards({ stats }: UsersStatsCardsProps) {
  const t = useTranslations("platformUsers");

  const cards = [
    { key: "total", icon: Users, value: stats.total, color: "text-text-primary", bg: "bg-surface-tertiary" },
    { key: "active", icon: UserCheck, value: stats.active, color: "finance-positive", bg: "finance-positive-soft" },
    { key: "disabled", icon: UserX, value: stats.disabled, color: "finance-risk", bg: "finance-risk-soft" },
    { key: "owners", icon: Shield, value: stats.owners, color: "text-blue-light-700 dark:text-blue-light-300", bg: "bg-blue-light-50 dark:bg-blue-light-500/15" },
  ] as const;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.key} className="rounded-3xl border border-border-light/90 bg-white/90 p-4 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">{t(`stats.${card.key}`)}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary dark:text-white">{card.value}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/70 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
