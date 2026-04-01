"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FinancialAmount } from "@/components/common/FinancialAmount";
import Button from "@/components/ui/button/Button";
import type { LedgerStatementResponse } from "@/lib/api/types";
import { formatMoney } from "../utils/supplier-format";

interface SupplierLedgerTableProps {
  statement: LedgerStatementResponse;
  canDelete: boolean;
  deleting: boolean;
  onDelete: (entryId: string) => Promise<void>;
  onPageChange: (page: number) => void;
}

function toNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SupplierLedgerTable({
  statement,
  canDelete,
  deleting,
  onDelete,
  onPageChange,
}: SupplierLedgerTableProps) {
  const t = useTranslations("suppliers");
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

  const totalPages = Math.max(1, Math.ceil(statement.total / Math.max(statement.limit, 1)));

  return (
    <section className="space-y-4 rounded-3xl border border-border-light/90 bg-white/92 p-5 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border-light text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted dark:border-white/8">
              <th className="px-3 py-3">{t("ledger.table.date")}</th>
              <th className="px-3 py-3">{t("ledger.table.type")}</th>
              <th className="px-3 py-3">{t("ledger.table.note")}</th>
              <th className="px-3 py-3">{t("ledger.table.amount")}</th>
              <th className="px-3 py-3">{t("ledger.table.runningBalance")}</th>
              {canDelete && <th className="px-3 py-3">{t("ledger.table.actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {statement.items.map((entry) => {
              const amount = toNumber(entry.signedAmount);
              return (
                <tr key={entry.id} className="border-b border-border-light/70 last:border-b-0 dark:border-white/8">
                  <td className="px-3 py-3 text-text-secondary dark:text-slate-200">
                    {dateFormatter.format(new Date(entry.entryDate))}
                  </td>
                  <td className="px-3 py-3 text-text-secondary dark:text-slate-200">
                    {t(`ledger.entryTypes.${entry.entryType}`)}
                  </td>
                  <td className="max-w-sm truncate px-3 py-3 text-text-secondary dark:text-slate-300">
                    {entry.note || "-"}
                  </td>
                  <td className="px-3 py-3">
                    <FinancialAmount
                      amount={amount}
                      formatted={formatMoney(amount, locale)}
                      variant="table"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <FinancialAmount
                      amount={entry.runningBalance}
                      formatted={formatMoney(entry.runningBalance, locale)}
                      variant="table"
                    />
                  </td>
                  {canDelete && (
                    <td className="px-3 py-3">
                      <button
                        className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                        onClick={() => void onDelete(entry.id)}
                        disabled={deleting}
                        title={t("actions.delete")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light pt-4 text-sm dark:border-white/8">
        <span className="text-text-secondary dark:text-slate-300">
          {t("ledger.pagination.summary", {
            page: statement.page,
            totalPages,
            total: statement.total,
          })}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={statement.page <= 1}
            onClick={() => onPageChange(statement.page - 1)}
          >
            {t("ledger.pagination.previous")}
          </Button>
          <Button
            variant="outline"
            disabled={statement.page >= totalPages}
            onClick={() => onPageChange(statement.page + 1)}
          >
            {t("ledger.pagination.next")}
          </Button>
        </div>
      </div>
    </section>
  );
}
