"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import { useDeferredSale } from "@/lib/api/hooks/use-deferred-sales";
import { useCreateInvoiceFromDeferredSale } from "@/lib/api/hooks/use-invoices";
import { DataTable } from "@/components/ui/data-table";
import type { DeferredSalePaymentRecord } from "@/lib/api/types";
import { formatDate, formatMoney } from "../utils/deferred-sales-format";

interface DeferredSaleDetailsPageClientProps {
  saleId: string;
}

export function DeferredSaleDetailsPageClient({ saleId }: DeferredSaleDetailsPageClientProps) {
  const t = useTranslations("deferred-sales");
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { handleApiError, showSuccess } = useErrorHandler();

  const detailsQuery = useDeferredSale(saleId, hasPermission("deferredSales:view"));
  const createInvoiceMutation = useCreateInvoiceFromDeferredSale();

  const sale = detailsQuery.data;

  const paymentColumns = useMemo(
    () => [
      {
        id: "paymentDate",
        header: t("details.payments.paymentDate"),
        accessor: (row: DeferredSalePaymentRecord) => formatDate(row.paymentDate, locale),
      },
      {
        id: "amount",
        header: t("details.payments.amount"),
        accessor: (row: DeferredSalePaymentRecord) => formatMoney(row.amount, locale),
      },
      {
        id: "paymentMethod",
        header: t("details.payments.paymentMethod"),
        accessor: (row: DeferredSalePaymentRecord) => row.paymentMethod || "-",
      },
      {
        id: "notes",
        header: t("details.payments.notes"),
        accessor: (row: DeferredSalePaymentRecord) => row.notes || "-",
      },
    ],
    [locale, t],
  );

  const handleCreateInvoice = async () => {
    try {
      const invoice = await createInvoiceMutation.mutateAsync(saleId);
      showSuccess(t("messages.createInvoiceSuccess"));
      router.push(`/${locale}/invoices/${invoice.id}`);
    } catch (error) {
      handleApiError(error, t("messages.createInvoiceError"));
    }
  };

  return (
    <QueryState
      isLoading={detailsQuery.isLoading}
      isError={detailsQuery.isError}
      errorMessage={detailsQuery.error?.message}
      isEmpty={!detailsQuery.isLoading && !sale}
      emptyTitle={t("details.empty.title")}
      emptyDescription={t("details.empty.description")}
    >
      {sale && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sale.referenceNumber}</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.subtitle")}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push(`/${locale}/deferred-sales`)}>
                  {t("details.back")}
                </Button>
                <Button onClick={() => void handleCreateInvoice()} disabled={createInvoiceMutation.isPending}>
                  {createInvoiceMutation.isPending ? t("actions.loading") : t("actions.createInvoice")}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoCard label={t("details.partyType")} value={t(`partyType.${sale.partyType}`)} />
              <InfoCard label={t("details.partyName")} value={sale.partyName || "-"} />
              <InfoCard label={t("table.status")} value={t(`status.${sale.status}`)} />
              <InfoCard label={t("table.totalAmount")} value={formatMoney(sale.totalAmount, locale)} />
              <InfoCard label={t("table.paidAmount")} value={formatMoney(sale.paidAmount, locale)} />
              <InfoCard label={t("table.remaining")} value={formatMoney(sale.remaining, locale)} />
              <InfoCard label={t("table.dueDate")} value={formatDate(sale.dueDate, locale)} />
              <InfoCard label={t("details.createdAt")} value={formatDate(sale.createdAt, locale)} />
              <InfoCard label={t("details.description")} value={sale.description || "-"} />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("details.payments.title")}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.payments.subtitle")}</p>

            <div className="mt-4">
              <DataTable<DeferredSalePaymentRecord>
                data={sale.payments ?? []}
                columns={paymentColumns}
                getRowId={(row) => row.id}
                ariaLabel={t("details.payments.ariaLabel")}
              />
            </div>
          </section>
        </div>
      )}
    </QueryState>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
