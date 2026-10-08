"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/lib/api/hooks/use-auth";
import { usePermission } from "@/hooks/usePermission";

type HubCard = {
  titleKey: string;
  descKey: string;
  actionKey: string;
  href: string;
  icon: React.ReactNode;
};

function UserIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6v12m3-9.75a2.25 2.25 0 00-2.25-2.25h-1.5A2.25 2.25 0 009 8.25c0 1.243 1.007 2.25 2.25 2.25h1.5A2.25 2.25 0 0115 12.75 2.25 2.25 0 0112.75 15h-1.5A2.25 2.25 0 019 12.75m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PercentIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.5 19.5l15-15m-11.25 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7.5 7.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export function SettingsHubClient() {
  const t = useTranslations("settings");
  const { locale } = useParams<{ locale: string }>();
  const userQuery = useCurrentUser();
  const { hasPermission } = usePermission();
  const user = userQuery.data;

  const cards: HubCard[] = [
    {
      titleKey: "hub.profileCard.title",
      descKey: "hub.profileCard.description",
      actionKey: "hub.profileCard.action",
      href: `/${locale}/settings/profile`,
      icon: <UserIcon />,
    },
    {
      titleKey: "hub.subscriptionCard.title",
      descKey: "hub.subscriptionCard.description",
      actionKey: "hub.subscriptionCard.action",
      href: `/${locale}/settings/subscription`,
      icon: <CreditCardIcon />,
    },
    {
      titleKey: "hub.usersCard.title",
      descKey: "hub.usersCard.description",
      actionKey: "hub.usersCard.action",
      href: `/${locale}/users`,
      icon: <UsersIcon />,
    },
    {
      titleKey: "hub.notificationsCard.title",
      descKey: "hub.notificationsCard.description",
      actionKey: "hub.notificationsCard.action",
      href: `/${locale}/notifications`,
      icon: <BellIcon />,
    },
    {
      titleKey: "hub.companyCard.title",
      descKey: "hub.companyCard.description",
      actionKey: "hub.companyCard.action",
      href: `/${locale}/settings/company`,
      icon: <BuildingIcon />,
    },
    {
      titleKey: "hub.cashReconciliationCard.title",
      descKey: "hub.cashReconciliationCard.description",
      actionKey: "hub.cashReconciliationCard.action",
      href: `/${locale}/settings/cash-reconciliation`,
      icon: <CashIcon />,
    },
    ...(hasPermission("tax_setup.view")
      ? [
          {
            titleKey: "hub.taxSetupCard.title",
            descKey: "hub.taxSetupCard.description",
            actionKey: "hub.taxSetupCard.action",
            href: `/${locale}/settings/tax-setup`,
            icon: <PercentIcon />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border-light bg-white p-5 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
        <h1 className="text-2xl font-bold text-text-primary">{t("hub.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("hub.subtitle")}</p>

        {/* User info pill */}
        {user && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 dark:border-border-strong dark:bg-surface-tertiary">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {(user.fullName ?? user.email ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {user.fullName ?? user.email}
              </p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
            <span className="inline-flex items-center rounded-lg bg-primary-light px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/10">
              {user.role}
            </span>
          </div>
        )}
      </div>

      {/* Hub cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col gap-4 rounded-2xl border border-border-light bg-white p-5 shadow-theme-sm transition-colors hover:border-primary/20 hover:shadow-theme-md dark:border-border-strong dark:bg-surface-secondary dark:hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/10">
                {card.icon}
              </div>
              <span className="mt-1 text-text-muted transition-colors group-hover:text-primary">
                <ChevronIcon />
              </span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-text-primary">
                {t(card.titleKey as Parameters<typeof t>[0])}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t(card.descKey as Parameters<typeof t>[0])}
              </p>
            </div>

            <span className="text-sm font-medium text-primary">
              {t(card.actionKey as Parameters<typeof t>[0])} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
