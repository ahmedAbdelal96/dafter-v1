"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import { DataTable } from "@/components/ui/data-table";
import type { PartyType, ReportsMeta, SimpleLedgerItem } from "@/lib/api/types";
import { formatDate, formatMoney } from "../utils/reports-format";

interface SimpleLedgerSectionProps {
  items: SimpleLedgerItem[];
  meta: ReportsMeta;
  balances: {
    openingBalance: string;
    totalDebit: string;
    totalCredit: string;
    closingBalance: string;
    currentBalance: string;
  };
  filters: {
    partyType: PartyType;
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
  onPartyTypeChange: (value: PartyType) => void;
  onPartyIdChange: (value?: string) => void;
  onPartySearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onPageChange: (page: number) => void;
  onExportClick: () => void;
}

export function SimpleLedgerSection({
  items,
  meta,
  balances,
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
}: SimpleLedgerSectionProps) {
  const t = useTranslations("reports.simpleLedger");
  const locale = useLocale();

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
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
        id: "date",
        header: t("table.date"),
        accessor: (row: SimpleLedgerItem) => formatDate(row.date, locale),
      },
      {
        id: "dueDate",
        header: t("table.dueDate"),
        accessor: (row: SimpleLedgerItem) => formatDate(row.dueDate, locale),
      },
      {
        id: "entryType",
        header: t("table.entryType"),
        accessor: (row: SimpleLedgerItem) => row.entryType,
      },
      {
        id: "note",
        header: t("table.note"),
        accessor: (row: SimpleLedgerItem) => row.note || "-",
      },
      {
        id: "debit",
        header: t("table.debit"),
        accessor: (row: SimpleLedgerItem) => formatMoney(row.debit, locale),
      },
      {
        id: "credit",
        header: t("table.credit"),
        accessor: (row: SimpleLedgerItem) => formatMoney(row.credit, locale),
      },
      {
        id: "runningBalance",
        header: t("table.runningBalance"),
        accessor: (row: SimpleLedgerItem) => formatMoney(row.runningBalance, locale),
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
              disabled={isExporting || !filters.partyId}
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
            onChange={(value) => onPartyTypeChange((value as PartyType | undefined) ?? "CUSTOMER")}
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
            id="simple-ledger-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={filters.dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />

          <DatePicker
            id="simple-ledger-date-to"
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title={t("summary.openingBalance")} value={formatMoney(balances.openingBalance, locale)} />
        <SummaryCard title={t("summary.totalDebit")} value={formatMoney(balances.totalDebit, locale)} />
        <SummaryCard title={t("summary.totalCredit")} value={formatMoney(balances.totalCredit, locale)} />
        <SummaryCard title={t("summary.closingBalance")} value={formatMoney(balances.closingBalance, locale)} />
        <SummaryCard title={t("summary.currentBalance")} value={formatMoney(balances.currentBalance, locale)} />
      </div>

      {!filters.partyId ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {t("messages.selectParty")}
        </div>
      ) : (
        <DataTable<SimpleLedgerItem>
          data={items}
          columns={columns}
          loading={loading}
          error={error}
          getRowId={(row) => row.id}
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
      )}
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
