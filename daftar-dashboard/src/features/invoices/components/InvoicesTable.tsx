"use client";

import { useMemo } from "react";
import { Copy, Eye, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { InvoiceSummaryItem, InvoicesListMeta } from "@/lib/api/types";
import { formatMoney, getInvoiceStatusBadgeColor } from "../utils/invoice-format";

interface InvoicesTableProps {
  invoices: InvoiceSummaryItem[];
  meta: InvoicesListMeta;
  canDelete: boolean;
  deleting: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (invoice: InvoiceSummaryItem) => void;
}

export function InvoicesTable({
  invoices,
  meta,
  canDelete,
  deleting,
  onPageChange,
  onView,
  onDuplicate,
  onDelete,
}: InvoicesTableProps) {
  const t = useTranslations("invoices");
  const locale = useLocale();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [locale]
  );

  const columns = useMemo(
    () => [
      {
        id: "invoiceNumber",
        header: t("table.invoiceNumber"),
        accessor: (row: InvoiceSummaryItem) => row.invoiceNumber,
        cell: (row: InvoiceSummaryItem) => (
          <button
            className="font-medium text-text-brand hover:underline"
            onClick={() => onView(row.id)}
          >
            {row.invoiceNumber}
          </button>
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: InvoiceSummaryItem) => row.status,
        cell: (row: InvoiceSummaryItem) => (
          <Badge color={getInvoiceStatusBadgeColor(row.status)}>
            {t(`status.${row.status}`)}
          </Badge>
        ),
      },
      {
        id: "issueDate",
        header: t("table.issueDate"),
        accessor: (row: InvoiceSummaryItem) => dateFormatter.format(new Date(row.issueDate)),
      },
      {
        id: "partyType",
        header: t("table.partyType"),
        accessor: (row: InvoiceSummaryItem) => row.partyType,
        cell: (row: InvoiceSummaryItem) => (
          <Badge color={row.partyType === "CUSTOMER" ? "primary" : "info"}>
            {row.partyType === "CUSTOMER"
              ? t("filters.partyTypeCustomer")
              : t("filters.partyTypeSupplier")}
          </Badge>
        ),
      },
      {
        id: "partyName",
        header: t("table.partyName"),
        accessor: (row: InvoiceSummaryItem) => row.partyName,
      },
      {
        id: "totalAmount",
        header: t("table.totalAmount"),
        accessor: (row: InvoiceSummaryItem) => formatMoney(row.totalAmount, locale),
      },
      {
        id: "taxAmount",
        header: t("table.taxAmount"),
        accessor: (row: InvoiceSummaryItem) => formatMoney(row.taxAmount, locale),
      },
      {
        id: "createdBy",
        header: t("table.createdBy"),
        accessor: (row: InvoiceSummaryItem) => row.createdBy?.fullName || "-",
      },
    ],
    [dateFormatter, locale, onView, t]
  );

  return (
    <DataTable<InvoiceSummaryItem>
      data={invoices}
      columns={columns}
      getRowId={(row) => row.id}
      rowActions={(row) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            onClick={() => onView(row.id)}
            title={t("actions.view")}
          >
            <Eye size={16} />
          </button>
          <button
            className="rounded-md p-1.5 text-blue-light-500 transition hover:bg-blue-light-50 hover:text-blue-light-600 dark:hover:bg-blue-light-500/10"
            onClick={() => onDuplicate(row.id)}
            title={t("actions.duplicate")}
          >
            <Copy size={16} />
          </button>
          {canDelete && (
            <button
              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
              onClick={() => onDelete(row)}
              disabled={deleting}
              title={t("actions.delete")}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
      pagination={{
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.totalPages,
        hasNextPage: meta.hasNext,
        hasPrevPage: meta.hasPrev,
      }}
      onPageChange={onPageChange}
      ariaLabel={t("table.ariaLabel")}
    />
  );
}
