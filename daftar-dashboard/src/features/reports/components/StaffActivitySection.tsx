"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import Input from "@/components/form/input/InputField";
import { DataTable } from "@/components/ui/data-table";
import type { ReportsMeta, StaffActivityItem, StaffActivitySummary } from "@/lib/api/types";
import { formatDateTime, formatMoney } from "../utils/reports-format";

interface StaffActivitySectionProps {
  items: StaffActivityItem[];
  summary: StaffActivitySummary;
  meta: ReportsMeta;
  filters: {
    search: string;
    userId?: string;
    dateFrom: string;
    dateTo: string;
    limit: number;
  };
  userOptions: ComboboxOption[];
  userLoading: boolean;
  canExport: boolean;
  isExporting: boolean;
  loading: boolean;
  error?: string;
  onSearchChange: (value: string) => void;
  onUserChange: (value?: string) => void;
  onUserSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onPageChange: (page: number) => void;
  onExportClick: () => void;
}

export function StaffActivitySection({
  items,
  summary,
  meta,
  filters,
  userOptions,
  userLoading,
  canExport,
  isExporting,
  loading,
  error,
  onSearchChange,
  onUserChange,
  onUserSearchChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onPageChange,
  onExportClick,
}: StaffActivitySectionProps) {
  const t = useTranslations("reports.staffActivity");
  const locale = useLocale();

  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) })),
    []
  );

  const columns = useMemo(
    () => [
      {
        id: "fullName",
        header: t("table.fullName"),
        accessor: (row: StaffActivityItem) => row.fullName,
      },
      {
        id: "email",
        header: t("table.email"),
        accessor: (row: StaffActivityItem) => row.email,
      },
      {
        id: "role",
        header: t("table.role"),
        accessor: (row: StaffActivityItem) => row.role,
      },
      {
        id: "activitiesCount",
        header: t("table.activitiesCount"),
        accessor: (row: StaffActivityItem) => row.activitiesCount,
      },
      {
        id: "invoicesCount",
        header: t("table.invoicesCount"),
        accessor: (row: StaffActivityItem) => row.invoicesCount,
      },
      {
        id: "invoicesAmount",
        header: t("table.invoicesAmount"),
        accessor: (row: StaffActivityItem) => formatMoney(row.invoicesAmount, locale),
      },
      {
        id: "collectionsAmount",
        header: t("table.collectionsAmount"),
        accessor: (row: StaffActivityItem) => formatMoney(row.collectionsAmount, locale),
      },
      {
        id: "expensesAmount",
        header: t("table.expensesAmount"),
        accessor: (row: StaffActivityItem) => formatMoney(row.expensesAmount, locale),
      },
      {
        id: "lastActivityAt",
        header: t("table.lastActivityAt"),
        accessor: (row: StaffActivityItem) => formatDateTime(row.lastActivityAt, locale),
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
            value={filters.userId}
            options={userOptions}
            loading={userLoading}
            placeholder={t("filters.user")}
            searchPlaceholder={t("filters.userSearch")}
            emptyText={t("filters.userEmpty")}
            loadingText={t("filters.userLoading")}
            onSearchChange={onUserSearchChange}
            onChange={onUserChange}
          />

          <DatePicker
            id="staff-activity-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={filters.dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />

          <DatePicker
            id="staff-activity-date-to"
            placeholder={t("filters.dateTo")}
            defaultDate={filters.dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title={t("summary.usersCount")} value={String(summary.usersCount)} />
        <SummaryCard title={t("summary.totalActivities")} value={String(summary.totalActivities)} />
        <SummaryCard title={t("summary.totalInvoices")} value={String(summary.totalInvoices)} />
        <SummaryCard title={t("summary.totalInvoiceAmount")} value={formatMoney(summary.totalInvoiceAmount, locale)} />
        <SummaryCard title={t("summary.totalCollections")} value={formatMoney(summary.totalCollections, locale)} />
        <SummaryCard title={t("summary.totalExpenses")} value={formatMoney(summary.totalExpenses, locale)} />
      </div>

      <DataTable<StaffActivityItem>
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => row.userId}
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
