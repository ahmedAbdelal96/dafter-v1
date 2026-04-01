"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import { DataTable } from "@/components/ui/data-table";
import type { InstallmentScheduleListRecord, InstallmentsListMeta } from "@/lib/api/types";
import {
  formatDate,
  formatMoney,
  getInstallmentScheduleStatusColor,
  getRemainingAmount,
} from "../utils/installments-format";

interface InstallmentScheduleSectionProps {
  items: InstallmentScheduleListRecord[];
  meta: InstallmentsListMeta;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function InstallmentScheduleSection({
  items,
  meta,
  loading,
  onPageChange,
}: InstallmentScheduleSectionProps) {
  const t = useTranslations("installments");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "contractNumber",
        header: t("scheduleTable.contractNumber"),
        accessor: (row: InstallmentScheduleListRecord) => row.contract.contractNumber,
      },
      {
        id: "partyType",
        header: t("scheduleTable.partyType"),
        accessor: (row: InstallmentScheduleListRecord) => t(`partyType.${row.contract.partyType}`),
      },
      {
        id: "installmentNumber",
        header: t("scheduleTable.installmentNumber"),
        accessor: (row: InstallmentScheduleListRecord) => row.installmentNumber,
      },
      {
        id: "dueDate",
        header: t("scheduleTable.dueDate"),
        accessor: (row: InstallmentScheduleListRecord) => formatDate(row.dueDate, locale),
      },
      {
        id: "amount",
        header: t("scheduleTable.amount"),
        accessor: (row: InstallmentScheduleListRecord) => formatMoney(row.amount, locale),
      },
      {
        id: "remaining",
        header: t("scheduleTable.remaining"),
        accessor: (row: InstallmentScheduleListRecord) =>
          formatMoney(getRemainingAmount(row.amount, row.paidAmount), locale),
      },
      {
        id: "status",
        header: t("scheduleTable.status"),
        accessor: (row: InstallmentScheduleListRecord) => row.status,
        cell: (row: InstallmentScheduleListRecord) => (
          <Badge color={getInstallmentScheduleStatusColor(row.status)}>
            {t(`scheduleStatus.${row.status}`)}
          </Badge>
        ),
      },
    ],
    [locale, t],
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("scheduleSection.title")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("scheduleSection.subtitle")}</p>

      <div className="mt-4">
        <DataTable<InstallmentScheduleListRecord>
          data={items}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          pagination={{
            page: meta.page,
            limit: meta.limit,
            total: meta.total,
            totalPages: meta.totalPages,
            hasNextPage: meta.hasNext,
            hasPrevPage: meta.hasPrev,
          }}
          onPageChange={onPageChange}
          ariaLabel={t("scheduleTable.ariaLabel")}
        />
      </div>
    </section>
  );
}
