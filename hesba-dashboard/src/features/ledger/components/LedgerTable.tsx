"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import type { LedgerStatementResponse } from "@/lib/api/types";
import { formatMoney } from "../utils/ledger-format";

interface LedgerTableProps {
  statement: LedgerStatementResponse;
  canDelete: boolean;
  deleting: boolean;
  onDelete: (entryId: string) => void;
  onPageChange: (page: number) => void;
}

function toNumber(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function LedgerTable({
  statement,
  canDelete,
  deleting,
  onDelete,
  onPageChange,
}: LedgerTableProps) {
  const t = useTranslations("ledger");
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
        id: "entryDate",
        header: t("table.date"),
        accessor: (row: LedgerStatementResponse["items"][number]) =>
          dateFormatter.format(new Date(row.entryDate)),
      },
      {
        id: "entryType",
        header: t("table.type"),
        accessor: (row: LedgerStatementResponse["items"][number]) =>
          t(`entryTypes.${row.entryType}`),
      },
      {
        id: "note",
        header: t("table.note"),
        accessor: (row: LedgerStatementResponse["items"][number]) => row.note || "-",
      },
      {
        id: "signedAmount",
        header: t("table.amount"),
        accessor: (row: LedgerStatementResponse["items"][number]) => row.signedAmount,
        cell: (row: LedgerStatementResponse["items"][number]) => {
          const amount = toNumber(row.signedAmount);
          const isPositive = amount >= 0;
          return (
            <span className={isPositive ? "font-medium text-success-600" : "font-medium text-error-600"}>
              {formatMoney(amount, locale)}
            </span>
          );
        },
      },
      {
        id: "runningBalance",
        header: t("table.runningBalance"),
        accessor: (row: LedgerStatementResponse["items"][number]) =>
          formatMoney(row.runningBalance, locale),
      },
      {
        id: "createdAt",
        header: t("table.createdAt"),
        accessor: (row: LedgerStatementResponse["items"][number]) =>
          dateFormatter.format(new Date(row.createdAt)),
      },
    ],
    [dateFormatter, locale, t]
  );

  const totalPages = Math.max(1, Math.ceil(statement.total / Math.max(statement.limit, 1)));

  return (
    <DataTable<LedgerStatementResponse["items"][number]>
      data={statement.items}
      columns={columns}
      getRowId={(row) => row.id}
      rowActions={
        canDelete
          ? (row) => (
              <button
                className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                onClick={() => onDelete(row.id)}
                disabled={deleting}
                title={t("actions.deleteEntry")}
              >
                <Trash2 size={16} />
              </button>
            )
          : undefined
      }
      pagination={{
        page: statement.page,
        limit: statement.limit,
        total: statement.total,
        totalPages,
        hasNextPage: statement.page < totalPages,
        hasPrevPage: statement.page > 1,
      }}
      onPageChange={onPageChange}
      ariaLabel={t("table.ariaLabel")}
    />
  );
}
