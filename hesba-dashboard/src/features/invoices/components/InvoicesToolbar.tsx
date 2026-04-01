"use client";

import { useMemo } from "react";
import { FileDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComboboxOption } from "@/components/ui/combobox/Combobox";
import Combobox from "@/components/ui/combobox/Combobox";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import type { InvoiceStatus } from "@/lib/api/types";
import type { InvoicePartyFilter } from "../utils/invoice-schemas";

type InvoiceStatusFilter = InvoiceStatus | "all";

interface InvoicesToolbarProps {
  searchInput: string;
  partyTypeFilter: InvoicePartyFilter;
  partyIdFilter?: string;
  statusFilter: InvoiceStatusFilter;
  dateFrom: string;
  dateTo: string;
  limit: number;
  total: number;
  partyOptions: ComboboxOption[];
  canCreate: boolean;
  isExporting: boolean;
  onSearchChange: (value: string) => void;
  onPartyTypeChange: (value: InvoicePartyFilter) => void;
  onPartyIdChange: (value?: string) => void;
  onPartySearchChange: (value: string) => void;
  onStatusChange: (value: InvoiceStatusFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function InvoicesToolbar({
  searchInput,
  partyTypeFilter,
  partyIdFilter,
  statusFilter,
  dateFrom,
  dateTo,
  limit,
  total,
  partyOptions,
  canCreate,
  isExporting,
  onSearchChange,
  onPartyTypeChange,
  onPartyIdChange,
  onPartySearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onCreateClick,
  onExportClick,
}: InvoicesToolbarProps) {
  const t = useTranslations("invoices");

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.partyTypeAll") },
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
    ],
    [t]
  );

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.statusAll") },
      { value: "DRAFT", label: t("status.DRAFT") },
      { value: "PENDING_APPROVAL", label: t("status.PENDING_APPROVAL") },
      { value: "APPROVED", label: t("status.APPROVED") },
      { value: "REJECTED", label: t("status.REJECTED") },
      { value: "CANCELLED", label: t("status.CANCELLED") },
    ],
    [t]
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      [10, 20, 50, 100].map((value) => ({
        value: String(value),
        label: String(value),
      })),
    []
  );

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            startIcon={<FileDown size={16} />}
            onClick={onExportClick}
            disabled={isExporting}
          >
            {isExporting ? t("actions.exporting") : t("actions.export")}
          </Button>

          {canCreate && (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick}>
              {t("actions.addInvoice")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <input
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-border-focus focus:outline-none focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder={t("filters.search")}
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={partyTypeFilter}
            options={partyTypeOptions}
            searchable={false}
            placeholder={t("filters.partyType")}
            searchPlaceholder={t("filters.partyType")}
            onChange={(value) => onPartyTypeChange((value as InvoicePartyFilter) ?? "all")}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={statusFilter}
            options={statusOptions}
            searchable={false}
            placeholder={t("filters.status")}
            searchPlaceholder={t("filters.status")}
            onChange={(value) => onStatusChange((value as InvoiceStatusFilter) ?? "all")}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={partyIdFilter}
            options={partyOptions}
            placeholder={t("filters.party")}
            searchPlaceholder={t("filters.party")}
            emptyText={t("filters.noParties")}
            loadingText={t("actions.loading")}
            onSearchChange={onPartySearchChange}
            onChange={(value) => onPartyIdChange(value ?? undefined)}
          />
        </div>

        <div className="md:col-span-1">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
          />
        </div>

        <div className="md:col-span-1">
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
          />
        </div>

        <div className="md:col-span-1">
          <Combobox
            value={String(limit)}
            options={limitOptions}
            searchable={false}
            placeholder={String(limit)}
            searchPlaceholder={t("filters.pageSize")}
            onChange={(value) => onLimitChange(Number(value ?? 10))}
          />
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("filters.totalInvoices", { count: total })}
      </p>
    </section>
  );
}
