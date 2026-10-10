"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { QueryState } from "@/components/common/QueryState";
import { useAccountingAccounts, useAccountingReadiness } from "@/lib/api/hooks/use-accounting-setup";

export function AccountingSetupPageClient() {
  const t = useTranslations("operations.accounting");
  const readinessQuery = useAccountingReadiness();
  const accountsQuery = useAccountingAccounts();
  const accounts = accountsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
      </div>
      <QueryState
        isLoading={readinessQuery.isLoading}
        isError={readinessQuery.isError}
        errorMessage={readinessQuery.error?.message}
        errorAction={{ label: t("retry"), onClick: () => void readinessQuery.refetch() }}
        isEmpty={!readinessQuery.data}
        emptyTitle={t("notAvailable")}
        emptyDescription={t("notAvailableDescription")}
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">{t("readiness")}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {t(`statuses.${readinessQuery.data?.status ?? "BLOCKED"}`)}
              </p>
            </div>
            <span className={readinessQuery.data?.isReady ? "rounded-full bg-success-50 px-3 py-1 text-sm text-success-700" : "rounded-full bg-warning-50 px-3 py-1 text-sm text-warning-700"}>
              {readinessQuery.data?.isReady ? t("ready") : t("actionRequired")}
            </span>
          </div>
          {readinessQuery.data?.baseCurrencyCode ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              {t("baseCurrency")}: <span dir="ltr">{readinessQuery.data.baseCurrencyCode}</span>
            </p>
          ) : null}
          {readinessQuery.data?.missingRequirements?.length ? (
            <div className="mt-4 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
              <p className="font-medium">{t("missing")}</p>
              <ul className="mt-2 list-disc space-y-1 ps-5">
                {readinessQuery.data.missingRequirements.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      </QueryState>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("accounts")}</h2>
            <p className="text-sm text-gray-500">{t("accountsHint")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void accountsQuery.refetch()}>{t("refresh")}</Button>
        </div>
        <QueryState
          isLoading={accountsQuery.isLoading}
          isError={accountsQuery.isError}
          errorMessage={accountsQuery.error?.message}
          isEmpty={accounts.length === 0}
          emptyTitle={t("noAccounts")}
          emptyDescription={t("noAccountsDescription")}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-3 py-3">{t("code")}</th>
                  <th className="px-3 py-3">{t("name")}</th>
                  <th className="px-3 py-3">{t("type")}</th>
                  <th className="px-3 py-3">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-3 font-mono" dir="ltr">{account.code}</td>
                    <td className="px-3 py-3">{account.name}</td>
                    <td className="px-3 py-3">{account.accountType ?? "—"}</td>
                    <td className="px-3 py-3">{account.isActive === false ? t("inactive") : t("active")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </section>
    </div>
  );
}
