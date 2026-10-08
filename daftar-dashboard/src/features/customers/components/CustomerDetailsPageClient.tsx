"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import { QueryState } from "@/components/common/QueryState";
import { useCustomer, useCustomerSnapshot } from "@/lib/api/hooks/use-customers";
import { formatMoney } from "../utils/customer-format";
import { CustomerLedgerSection } from "./CustomerLedgerSection";
import { CustomerPricingSection } from "./CustomerPricingSection";
import { CustomerSalesInvoicesSection } from "./CustomerSalesInvoicesSection";

interface CustomerDetailsPageClientProps {
  customerId: string;
}

export function CustomerDetailsPageClient({ customerId }: CustomerDetailsPageClientProps) {
  const t = useTranslations("customers");
  const locale = useLocale();

  const customerQuery = useCustomer(customerId, Boolean(customerId));
  const snapshotQuery = useCustomerSnapshot(customerId, Boolean(customerId));
  const customer = customerQuery.data;
  const snapshot = snapshotQuery.data;
  const currentBalance = snapshot?.currentBalance ?? customer?.balance ?? 0;
  const effectiveCreditLimit = snapshot?.creditLimit ?? customer?.creditLimit ?? null;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white">{t("details.title")}</h1>
            <p className="mt-1 text-sm text-text-secondary dark:text-slate-300">{t("details.subtitle")}</p>
          </div>

          <Link
            href={`/${locale}/customers`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border-light/90 bg-white/80 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft size={16} />
            {t("details.backToList")}
          </Link>
        </div>
      </section>

      <QueryState
        isLoading={customerQuery.isLoading}
        isError={customerQuery.isError}
        errorMessage={customerQuery.error?.message}
        isEmpty={!customerQuery.isLoading && !customer}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        {customer && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <section className="space-y-4 rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 xl:col-span-4">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white">{t("details.infoSectionTitle")}</h2>

              <InfoItem label={t("table.name")} value={customer.name} />
              <InfoItem label={t("table.phone")} value={customer.phone || "-"} />
              <InfoItem label={t("table.address")} value={customer.address || "-"} />
              <InfoItem
                label={t("table.status")}
                value={customer.isActive ? t("status.active") : t("status.inactive")}
                tone={customer.isActive ? "positive" : "neutral"}
              />
              <InfoItem
                label={t("details.currentBalance")}
                value={
                  <FinancialAmount
                    amount={currentBalance}
                    formatted={formatMoney(currentBalance, locale)}
                    variant="card"
                  />
                }
                hint={t("details.currentBalanceHint")}
              />
              <InfoItem
                label={t("form.openingBalance")}
                value={
                  <FinancialAmount
                    amount={customer.openingBalance}
                    formatted={formatMoney(customer.openingBalance, locale)}
                    variant="card"
                  />
                }
              />
              <InfoItem
                label={t("table.creditLimit")}
                value={
                  effectiveCreditLimit === null || effectiveCreditLimit === undefined
                    ? t("table.noLimit")
                    : (
                        <FinancialAmount
                          amount={effectiveCreditLimit}
                          formatted={formatMoney(effectiveCreditLimit, locale)}
                          variant="card"
                          zeroNeutral={false}
                          className="text-blue-light-700 dark:text-blue-light-300"
                        />
                      )
                }
              />
              <InfoItem
                label={t("details.openApprovedInvoices")}
                value={String(snapshot?.openInvoicesCount ?? 0)}
                hint={t("details.openApprovedInvoicesHint")}
              />
              <InfoItem
                label={t("details.meta.createdAt")}
                value={dateFormatter.format(new Date(customer.createdAt))}
              />
              <InfoItem
                label={t("details.meta.updatedAt")}
                value={dateFormatter.format(new Date(customer.updatedAt))}
              />
            </section>

            <div className="space-y-6 xl:col-span-8">
              <CustomerSalesInvoicesSection
                customerId={customer.id}
                customerAddress={customer.address ?? undefined}
              />
              <CustomerPricingSection customerId={customer.id} />
              <CustomerLedgerSection customerId={customer.id} />
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function InfoItem({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "neutral";
  hint?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "finance-positive"
      : tone === "neutral"
      ? "text-text-secondary dark:text-slate-300"
      : "text-text-primary dark:text-white";

  return (
    <div className="rounded-2xl border border-border-light/80 bg-surface-secondary/65 p-3 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className={`mt-1 text-sm font-medium ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
    </div>
  );
}
