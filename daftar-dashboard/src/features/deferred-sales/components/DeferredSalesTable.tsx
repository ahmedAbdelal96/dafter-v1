"use client";

import { useMemo } from "react";
import { Ban, Eye, HandCoins } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import { DataTable } from "@/components/ui/data-table";
import type { DeferredSaleRecord, DeferredSalesListMeta } from "@/lib/api/types";
import { formatDate, formatMoney } from "../utils/deferred-sales-format";

interface DeferredSalesTableProps {
  items: DeferredSaleRecord[];
  meta: DeferredSalesListMeta;
  canManage: boolean;
  canCancel: boolean;
  mutating: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onRecordPayment: (sale: DeferredSaleRecord) => void;
  onCancel: (sale: DeferredSaleRecord) => void;
}

export function DeferredSalesTable({
  items,
  meta,
  canManage,
  canCancel,
  mutating,
  onPageChange,
  onView,
  onRecordPayment,
  onCancel,
}: DeferredSalesTableProps) {
  const t = useTranslations("deferred-sales");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "referenceNumber",
        header: t("table.referenceNumber"),
        accessor: (row: DeferredSaleRecord) => row.referenceNumber,
        cell: (row: DeferredSaleRecord) => (
          <button className="font-medium text-text-brand hover:underline" onClick={() => onView(row.id)}>
            {row.referenceNumber}
          </button>
        ),
      },
      {
        id: "partyType",
        header: t("table.partyType"),
        accessor: (row: DeferredSaleRecord) => t(`partyType.${row.partyType}`),
      },
      {
        id: "totalAmount",
        header: t("table.totalAmount"),
        accessor: (row: DeferredSaleRecord) => formatMoney(row.totalAmount, locale),
      },
      {
        id: "paidAmount",
        header: t("table.paidAmount"),
        accessor: (row: DeferredSaleRecord) => formatMoney(row.paidAmount, locale),
      },
      {
        id: "remaining",
        header: t("table.remaining"),
        accessor: (row: DeferredSaleRecord) => formatMoney(row.remaining, locale),
      },
      {
        id: "dueDate",
        header: t("table.dueDate"),
        accessor: (row: DeferredSaleRecord) => formatDate(row.dueDate, locale),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: DeferredSaleRecord) => row.status,
        cell: (row: DeferredSaleRecord) => {
          const color = row.status === "PAID" ? "success" : row.status === "OVERDUE" ? "error" : "warning";
          return <Badge color={color}>{t(`status.${row.status}`)}</Badge>;
        },
      },
    ],
    [locale, onView, t],
  );

  return (
    <DataTable<DeferredSaleRecord>
      data={items}
      columns={columns}
      getRowId={(row) => row.id}
      rowActions={(row) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            onClick={() => onView(row.id)}
            title={t("actions.view")}
          >
            <Eye size={16} />
          </button>
          {canManage && row.status !== "PAID" && (
            <button
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              onClick={() => onRecordPayment(row)}
              title={t("actions.recordPayment")}
              disabled={mutating}
            >
              <HandCoins size={16} />
            </button>
          )}
          {canCancel && row.status !== "PAID" && (
            <button
              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50"
              onClick={() => onCancel(row)}
              title={t("actions.cancelSale")}
              disabled={mutating}
            >
              <Ban size={16} />
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
