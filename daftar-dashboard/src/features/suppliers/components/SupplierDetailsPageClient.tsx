"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import { QueryState } from "@/components/common/QueryState";
import { useSupplier } from "@/lib/api/hooks/use-suppliers";
import { formatMoney } from "../utils/supplier-format";
import { SupplierLedgerSection } from "./SupplierLedgerSection";
import { SupplierPurchaseInvoicesSection } from "./SupplierPurchaseInvoicesSection";

interface SupplierDetailsPageClientProps {
  supplierId: string;
}

export function SupplierDetailsPageClient({ supplierId }: SupplierDetailsPageClientProps) {
  const t = useTranslations("suppliers");
  const locale = useLocale();

  const supplierQuery = useSupplier(supplierId, Boolean(supplierId));
  const supplier = supplierQuery.data;

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
            href={`/${locale}/suppliers`}
            className="inline-flex items-center gap-2 rounded-2xl border border-border-light/90 bg-white/80 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-white dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft size={16} />
            {t("details.backToList")}
          </Link>
        </div>
      </section>

      <QueryState
        isLoading={supplierQuery.isLoading}
        isError={supplierQuery.isError}
        errorMessage={supplierQuery.error?.message}
        isEmpty={!supplierQuery.isLoading && !supplier}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        {supplier && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <section className="space-y-4 rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90 xl:col-span-4">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white">{t("details.infoSectionTitle")}</h2>

              <InfoItem label={t("table.name")} value={supplier.name} />
              <InfoItem label={t("table.phone")} value={supplier.phone || "-"} />
              <InfoItem label={t("table.address")} value={supplier.address || "-"} />
              <InfoItem
                label={t("table.status")}
                value={supplier.isActive ? t("status.active") : t("status.inactive")}
                tone={supplier.isActive ? "positive" : "neutral"}
              />
              <InfoItem
                label={t("table.balance")}
                value={
                  <FinancialAmount
                    amount={supplier.balance}
                    formatted={formatMoney(supplier.balance, locale)}
                    variant="card"
                  />
                }
              />
              <InfoItem
                label={t("details.meta.createdAt")}
                value={dateFormatter.format(new Date(supplier.createdAt))}
              />
              <InfoItem
                label={t("details.meta.updatedAt")}
                value={dateFormatter.format(new Date(supplier.updatedAt))}
              />
            </section>

            <div className="space-y-6 xl:col-span-8">
              <SupplierPurchaseInvoicesSection
                supplierId={supplier.id}
                supplierAddress={supplier.address ?? undefined}
              />
              <SupplierLedgerSection supplierId={supplier.id} />
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
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "neutral";
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
    </div>
  );
}


