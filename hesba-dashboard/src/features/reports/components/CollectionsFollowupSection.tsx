"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { DataTable } from "@/components/ui/data-table";
import type {
  CollectionFollowupItem,
  CollectionsFollowupSummary,
  PartyType,
  ReportsMeta,
} from "@/lib/api/types";
import { formatDate, formatMoney } from "../utils/reports-format";

interface CollectionsFollowupSectionProps {
  items: CollectionFollowupItem[];
  summary: CollectionsFollowupSummary;
  meta: ReportsMeta;
  filters: {
    partyType: "all" | PartyType;
    partyId?: string;
    dateFrom: string;
    dateTo: string;
    limit: number;
  };
  partyOptions: ComboboxOption[];
  partyLoading: boolean;
  canExport: boolean;
  isExporting: boolean;
  loading: boolean;
  error?: string;
  onPartyTypeChange: (value: "all" | PartyType) => void;
  onPartyIdChange: (value?: string) => void;
  onPartySearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onPageChange: (page: number) => void;
  onExportClick: () => void;
}

export function CollectionsFollowupSection({
  items,
  summary,
  meta,
  filters,
  partyOptions,
  partyLoading,
  canExport,
  isExporting,
  loading,
  error,
  onPartyTypeChange,
  onPartyIdChange,
  onPartySearchChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onPageChange,
  onExportClick,
}: CollectionsFollowupSectionProps) {
  const t = useTranslations("reports.collectionsFollowup");
  const locale = useLocale();

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.partyTypeAll") },
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
      { value: "EMPLOYEE", label: t("filters.partyTypeEmployee") },
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
        id: "type",
        header: t("table.type"),
        accessor: (row: CollectionFollowupItem) => t(`type.${row.type}`),
      },
      {
        id: "referenceNumber",
        header: t("table.referenceNumber"),
        accessor: (row: CollectionFollowupItem) => row.referenceNumber,
      },
      {
        id: "partyName",
        header: t("table.party"),
        accessor: (row: CollectionFollowupItem) => row.partyName,
      },
      {
        id: "partyPhone",
        header: t("table.phone"),
        accessor: (row: CollectionFollowupItem) => row.partyPhone || "-",
      },
      {
        id: "dueDate",
        header: t("table.dueDate"),
        accessor: (row: CollectionFollowupItem) => formatDate(row.dueDate, locale),
      },
      {
        id: "expectedAmount",
        header: t("table.expectedAmount"),
        accessor: (row: CollectionFollowupItem) => formatMoney(row.expectedAmount, locale),
      },
      {
        id: "daysUntilDue",
        header: t("table.daysUntilDue"),
        accessor: (row: CollectionFollowupItem) => row.daysUntilDue,
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

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Combobox
            value={filters.partyType}
            options={partyTypeOptions}
            searchable={false}
            placeholder={t("filters.partyType")}
            searchPlaceholder={t("filters.partyType")}
            onChange={(value) => onPartyTypeChange((value as "all" | PartyType | undefined) ?? "all")}
          />

          <Combobox
            value={filters.partyId}
            options={partyOptions}
            loading={partyLoading}
            placeholder={t("filters.party")}
            searchPlaceholder={t("filters.partySearch")}
            emptyText={t("filters.partyEmpty")}
            loadingText={t("filters.partyLoading")}
            onSearchChange={onPartySearchChange}
            onChange={onPartyIdChange}
          />

          <DatePicker
            id="collections-followup-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={filters.dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />

          <DatePicker
            id="collections-followup-date-to"
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t("summary.expectedAmount")} value={formatMoney(summary.expectedAmount, locale)} />
        <SummaryCard title={t("summary.collectedAmount")} value={formatMoney(summary.collectedAmount, locale)} />
        <SummaryCard title={t("summary.collectionRatePercent")} value={`${summary.collectionRatePercent}%`} />
        <SummaryCard
          title={t("summary.overdueOutstanding")}
          value={formatMoney(summary.overdueOutstanding, locale)}
        />
      </div>

      <DataTable<CollectionFollowupItem>
        data={items}
        columns={columns}
        loading={loading}
        error={error}
        getRowId={(row) => `${row.type}-${row.referenceNumber}-${row.dueDate}`}
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
