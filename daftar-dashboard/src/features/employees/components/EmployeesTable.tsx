"use client";

import { useMemo } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { Employee, EmployeesListMeta } from "@/lib/api/types";
import { formatMoney } from "../utils/employee-format";

interface EmployeesTableProps {
  employees: Employee[];
  meta: EmployeesListMeta;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (employee: Employee) => void;
}

export function EmployeesTable({
  employees,
  meta,
  canUpdate,
  canDelete,
  deleting,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: EmployeesTableProps) {
  const t = useTranslations("employees");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: t("table.name"),
        accessor: (row: Employee) => row.name,
        cell: (row: Employee) => (
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
        accessor: (row: Employee) => row.phone || "-",
      },
      {
        id: "jobTitle",
        header: t("table.jobTitle"),
        accessor: (row: Employee) => row.jobTitle || "-",
      },
      {
        id: "openingBalance",
        header: t("table.openingBalance"),
        accessor: (row: Employee) => formatMoney(row.openingBalance, locale),
        cell: (row: Employee) => (
          <FinancialAmount
            amount={row.openingBalance}
            formatted={formatMoney(row.openingBalance, locale)}
            variant="table"
          />
        ),
      },
      {
        id: "balance",
        header: t("table.balance"),
        accessor: (row: Employee) => formatMoney(row.balance, locale),
        cell: (row: Employee) => (
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
        accessor: (row: Employee) => row.isActive,
        cell: (row: Employee) => (
          <Badge color={row.isActive ? "success" : "light"}>
            {row.isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
    ],
    [locale, onView, t]
  );

  return (
    <DataTable<Employee>
      data={employees}
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
