"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { useExpense } from "@/lib/api/hooks/use-expenses";
import { formatMoney } from "../utils/expense-format";

interface ExpenseDetailsPageClientProps {
  expenseId: string;
}

export function ExpenseDetailsPageClient({ expenseId }: ExpenseDetailsPageClientProps) {
  const t = useTranslations("expenses");
  const locale = useLocale();
  const expenseQuery = useExpense(expenseId, Boolean(expenseId));
  const expense = expenseQuery.data;

  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("details.title")}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.subtitle")}</p>
          </div>

          <Link
            href={`/${locale}/expenses`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            {t("details.backToList")}
          </Link>
        </div>
      </section>

      <QueryState
        isLoading={expenseQuery.isLoading}
        isError={expenseQuery.isError}
        errorMessage={expenseQuery.error?.message}
        isEmpty={!expenseQuery.isLoading && !expense}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        {expense && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoItem label={t("table.category")} value={t(`categories.${expense.category}`)} />
              <InfoItem label={t("table.amount")} value={formatMoney(expense.amount, locale)} />
              <InfoItem
                label={t("table.expenseDate")}
                value={dateFormatter.format(new Date(expense.expenseDate))}
              />
              <InfoItem label={t("table.supplier")} value={expense.supplier?.name || "-"} />
              <InfoItem label={t("table.paymentMethod")} value={expense.paymentMethod || "-"} />
              <InfoItem label={t("table.referenceNumber")} value={expense.referenceNumber || "-"} />
              <InfoItem label={t("table.description")} value={expense.description || "-"} />
              <InfoItem label={t("table.notes")} value={expense.notes || "-"} />
              <InfoItem
                label={t("details.meta.createdBy")}
                value={expense.createdBy?.fullName || "-"}
              />
              <InfoItem
                label={t("details.meta.createdAt")}
                value={dateFormatter.format(new Date(expense.createdAt))}
              />
              <InfoItem
                label={t("details.meta.updatedAt")}
                value={dateFormatter.format(new Date(expense.updatedAt))}
              />
            </div>
          </section>
        )}
      </QueryState>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
