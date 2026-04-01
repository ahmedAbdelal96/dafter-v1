"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type {
  DebtBalanceType,
  DebtEntityType,
  DebtsSummaryItem,
  DebtsSummaryTotals,
  ReportsMeta,
} from "@/lib/api/types";
import { formatMoney } from "../utils/reports-format";

interface DebtsSummarySectionProps {
  items: DebtsSummaryItem[];
  totals: DebtsSummaryTotals;
  meta: ReportsMeta;
  filters: {
    search: string;
    entityType: "all" | DebtEntityType;
    balanceType: "all" | DebtBalanceType;
    isActive: "all" | "true" | "false";
    minAmount: string;
    limit: number;
  };
  canExport: boolean;
  isExporting: boolean;
  loading: boolean;
  error?: string;
  onSearchChange: (value: string) => void;
  onEntityTypeChange: (value: "all" | DebtEntityType) => void;
  onBalanceTypeChange: (value: "all" | DebtBalanceType) => void;
  onIsActiveChange: (value: "all" | "true" | "false") => void;
  onMinAmountChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onPageChange: (page: number) => void;
  onExportClick: () => void;
}

export function DebtsSummarySection({
  items,
  totals,
  meta,
  filters,
  canExport,
  isExporting,
  loading,
  error,
  onSearchChange,
  onEntityTypeChange,
  onBalanceTypeChange,
  onIsActiveChange,
  onMinAmountChange,
  onLimitChange,
  onPageChange,
  onExportClick,
}: DebtsSummarySectionProps) {
  const t = useTranslations("reports.debtsSummary");
  const locale = useLocale();

  const entityTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.entityTypeAll") },
      { value: "CUSTOMER", label: t("filters.entityTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.entityTypeSupplier") },
    ],
    [t]
  );

  const balanceTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.balanceTypeAll") },
      { value: "RECEIVABLE", label: t("filters.balanceTypeReceivable") },
      { value: "PAYABLE", label: t("filters.balanceTypePayable") },
    ],
    [t]
  );

  const isActiveOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.isActiveAll") },
      { value: "true", label: t("filters.isActiveTrue") },
      { value: "false", label: t("filters.isActiveFalse") },
    ],
    [t]
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) })),
    []
  );

  const columns = useMemo(
    () => [
      {
        id: "entityType",
        header: t("table.entityType"),
        accessor: (row: DebtsSummaryItem) => t(`entityType.${row.entityType}`),
      },
      {
        id: "name",
        header: t("table.name"),
        accessor: (row: DebtsSummaryItem) => row.name,
      },
      {
        id: "phone",
        header: t("table.phone"),
        accessor: (row: DebtsSummaryItem) => row.phone || "-",
      },
      {
        id: "balanceType",
        header: t("table.balanceType"),
        accessor: (row: DebtsSummaryItem) => t(`balanceType.${row.balanceType}`),
      },
      {
        id: "amount",
        header: t("table.amount"),
        accessor: (row: DebtsSummaryItem) => formatMoney(row.amount, locale),
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: DebtsSummaryItem) => row.isActive,
        cell: (row: DebtsSummaryItem) => (
          <Badge color={row.isActive ? "success" : "warning"}>
            {row.isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
    ],
    [locale, t]
  );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("title")}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
          </div>
          {canExport && (
            <Button
              variant="outline"
              startIcon={<Download size={16} />}
              onClick={onExportClick}
              disabled={isExporting}
            >
              {isExporting ? t("actions.exporting") : t("actions.export")}
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("filters.search")}
          />

          <Combobox
            value={filters.entityType}
            options={entityTypeOptions}
            searchable={false}
            placeholder={t("filters.entityType")}
            searchPlaceholder={t("filters.entityType")}
            onChange={(value) => onEntityTypeChange((value as "all" | DebtEntityType | undefined) ?? "all")}
          />

          <Combobox
            value={filters.balanceType}
            options={balanceTypeOptions}
            searchable={false}
            placeholder={t("filters.balanceType")}
            searchPlaceholder={t("filters.balanceType")}
            onChange={(value) =>
              onBalanceTypeChange((value as "all" | DebtBalanceType | undefined) ?? "all")
            }
          />

          <Combobox
            value={filters.isActive}
            options={isActiveOptions}
            searchable={false}
            placeholder={t("filters.isActive")}
            searchPlaceholder={t("filters.isActive")}
            onChange={(value) =>
              onIsActiveChange((value as "all" | "true" | "false" | undefined) ?? "all")
            }
          />

          <Input
            value={filters.minAmount}
            onChange={(event) => onMinAmountChange(event.target.value)}
            placeholder={t("filters.minAmount")}
            type="number"
          />

          <Combobox
            value={String(filters.limit)}
            options={limitOptions}
            searchable={false}
            placeholder={String(filters.limit)}
            searchPlaceholder={t("filters.limit")}
            onChange={(value) => onLimitChange(Number(value ?? 10))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title={t("summary.customersReceivable")} value={formatMoney(totals.customersReceivable, locale)} />
        <SummaryCard title={t("summary.customersCredit")} value={formatMoney(totals.customersCredit, locale)} />
        <SummaryCard title={t("summary.suppliersReceivable")} value={formatMoney(totals.suppliersReceivable, locale)} />
        <SummaryCard title={t("summary.suppliersPayable")} value={formatMoney(totals.suppliersPayable, locale)} />
        <SummaryCard title={t("summary.netReceivable")} value={formatMoney(totals.netReceivable, locale)} />
      </div>

      <DataTable<DebtsSummaryItem>
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => `${row.entityType}-${row.partyId}`}
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
    </section>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
