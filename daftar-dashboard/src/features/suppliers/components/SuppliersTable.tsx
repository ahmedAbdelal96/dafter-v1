"use client";

import { useMemo } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { Supplier, SuppliersListMeta } from "@/lib/api/types";
import { formatMoney } from "../utils/supplier-format";

interface SuppliersTableProps {
  suppliers: Supplier[];
  meta: SuppliersListMeta;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (supplier: Supplier) => void;
}

export function SuppliersTable({
  suppliers,
  meta,
  canUpdate,
  canDelete,
  deleting,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: SuppliersTableProps) {
  const t = useTranslations("suppliers");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: t("table.name"),
        accessor: (row: Supplier) => row.name,
        cell: (row: Supplier) => (
          <button
            className="font-medium text-text-brand hover:underline"
            onClick={() => onView(row.id)}
          >
            {row.name}
          </button>
        ),
      },
      {
        id: "phone",
        header: t("table.phone"),
        accessor: (row: Supplier) => row.phone || "-",
      },
      {
        id: "balance",
        header: t("table.balance"),
        accessor: (row: Supplier) => formatMoney(row.balance, locale),
        cell: (row: Supplier) => (
          <FinancialAmount
            amount={row.balance}
            formatted={formatMoney(row.balance, locale)}
            variant="table"
          />
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: Supplier) => row.isActive,
        cell: (row: Supplier) => (
          <Badge color={row.isActive ? "success" : "light"}>
            {row.isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
    ],
    [locale, onView, t]
  );

  return (
    <DataTable<Supplier>
      data={suppliers}
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
          {canUpdate && (
            <button
              className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              onClick={() => onEdit(row.id)}
              title={t("actions.edit")}
            >
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button
              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
              onClick={() => onDelete(row)}
              title={t("actions.delete")}
              disabled={deleting}
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
