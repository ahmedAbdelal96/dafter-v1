"use client";

import { useMemo } from "react";
import { Ban, Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import { DataTable } from "@/components/ui/data-table";
import type { InstallmentContractRecord, InstallmentsListMeta } from "@/lib/api/types";
import {
  formatDate,
  formatMoney,
  getInstallmentContractStatusColor,
} from "../utils/installments-format";

interface InstallmentsTableProps {
  contracts: InstallmentContractRecord[];
  meta: InstallmentsListMeta;
  canCancel: boolean;
  mutating: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onCancel: (contract: InstallmentContractRecord) => void;
}

export function InstallmentsTable({
  contracts,
  meta,
  canCancel,
  mutating,
  onPageChange,
  onView,
  onCancel,
}: InstallmentsTableProps) {
  const t = useTranslations("installments");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "contractNumber",
        header: t("table.contractNumber"),
        accessor: (row: InstallmentContractRecord) => row.contractNumber,
        cell: (row: InstallmentContractRecord) => (
          <button className="font-medium text-text-brand hover:underline" onClick={() => onView(row.id)}>
            {row.contractNumber}
          </button>
        ),
      },
      {
        id: "partyType",
        header: t("table.partyType"),
        accessor: (row: InstallmentContractRecord) => t(`partyType.${row.partyType}`),
      },
      {
        id: "totalAmount",
        header: t("table.totalAmount"),
        accessor: (row: InstallmentContractRecord) => formatMoney(row.totalAmount, locale),
      },
      {
        id: "paidAmount",
        header: t("table.paidAmount"),
        accessor: (row: InstallmentContractRecord) => formatMoney(row.paidAmount, locale),
      },
      {
        id: "installmentsCount",
        header: t("table.installmentsCount"),
        accessor: (row: InstallmentContractRecord) => row.numberOfInstallments,
      },
      {
        id: "startDate",
        header: t("table.startDate"),
        accessor: (row: InstallmentContractRecord) => formatDate(row.startDate, locale),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: InstallmentContractRecord) => row.status,
        cell: (row: InstallmentContractRecord) => (
          <Badge color={getInstallmentContractStatusColor(row.status)}>
            {t(`status.${row.status}`)}
          </Badge>
        ),
      },
    ],
    [locale, onView, t],
  );

  return (
    <DataTable<InstallmentContractRecord>
      data={contracts}
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
          {canCancel && row.status === "ACTIVE" && (
            <button
              className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50"
              onClick={() => onCancel(row)}
              title={t("actions.cancelContract")}
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
