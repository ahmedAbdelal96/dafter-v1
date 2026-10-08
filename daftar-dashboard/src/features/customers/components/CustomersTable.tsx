"use client";

import { useMemo } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { Customer, CustomersListMeta } from "@/lib/api/types";
import { formatMoney } from "../utils/customer-format";

interface CustomersTableProps {
  customers: Customer[];
  meta: CustomersListMeta;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomersTable({
  customers,
  meta,
  canUpdate,
  canDelete,
  deleting,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  const t = useTranslations("customers");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: t("table.name"),
        accessor: (row: Customer) => row.name,
        cell: (row: Customer) => (
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
        accessor: (row: Customer) => row.phone || "-",
      },
      {
        id: "balance",
        header: t("table.balance"),
        accessor: (row: Customer) => formatMoney(row.balance, locale),
        cell: (row: Customer) => (
          <FinancialAmount
            amount={row.balance}
            formatted={formatMoney(row.balance, locale)}
            variant="table"
          />
        ),
      },
      {
        id: "creditLimit",
        header: t("table.creditLimit"),
        accessor: (row: Customer) =>
          row.creditLimit === null || row.creditLimit === undefined
            ? t("table.noLimit")
            : formatMoney(row.creditLimit, locale),
        cell: (row: Customer) =>
          row.creditLimit === null || row.creditLimit === undefined ? (
            <span className="text-text-muted">{t("table.noLimit")}</span>
          ) : (
            <FinancialAmount
              amount={row.creditLimit}
              formatted={formatMoney(row.creditLimit, locale)}
              variant="table"
              zeroNeutral={false}
              className="text-blue-light-700 dark:text-blue-light-300"
            />
          ),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: Customer) => row.isActive,
        cell: (row: Customer) => (
          <Badge color={row.isActive ? "success" : "light"}>
            {row.isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
    ],
    [locale, onView, t]
  );

  return (
    <DataTable<Customer>
      data={customers}
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
