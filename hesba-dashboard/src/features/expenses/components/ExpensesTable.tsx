"use client";

import { useMemo } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import type { ExpenseRecord, ExpensesListMeta } from "@/lib/api/types";
import { formatMoney } from "../utils/expense-format";

interface ExpensesTableProps {
  expenses: ExpenseRecord[];
  meta: ExpensesListMeta;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (expense: ExpenseRecord) => void;
}

export function ExpensesTable({
  expenses,
  meta,
  canUpdate,
  canDelete,
  deleting,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: ExpensesTableProps) {
  const t = useTranslations("expenses");
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
        id: "expenseDate",
        header: t("table.expenseDate"),
        accessor: (row: ExpenseRecord) => dateFormatter.format(new Date(row.expenseDate)),
      },
      {
        id: "category",
        header: t("table.category"),
        accessor: (row: ExpenseRecord) => t(`categories.${row.category}`),
      },
      {
        id: "amount",
        header: t("table.amount"),
        accessor: (row: ExpenseRecord) => formatMoney(row.amount, locale),
      },
      {
        id: "supplier",
        header: t("table.supplier"),
        accessor: (row: ExpenseRecord) => row.supplier?.name || "-",
      },
      {
        id: "paymentMethod",
        header: t("table.paymentMethod"),
        accessor: (row: ExpenseRecord) => row.paymentMethod || "-",
      },
      {
        id: "description",
        header: t("table.description"),
        accessor: (row: ExpenseRecord) => row.description || "-",
      },
    ],
    [dateFormatter, locale, t]
  );

  return (
    <DataTable<ExpenseRecord>
      data={expenses}
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
