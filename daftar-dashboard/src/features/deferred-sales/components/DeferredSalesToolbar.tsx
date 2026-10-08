"use client";

import { Download, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { PartyType } from "@/lib/api/types";
import type { DeferredSalesStatusFilter } from "../utils/deferred-sales-schemas";

interface DeferredSalesToolbarProps {
  searchInput: string;
  partyTypeFilter: "all" | PartyType;
  partyIdFilter?: string;
  statusFilter: DeferredSalesStatusFilter;
  dateFrom: string;
  dateTo: string;
  limit: number;
  total: number;
  partyOptions: ComboboxOption[];
  canCreate: boolean;
  canExport: boolean;
  isExporting: boolean;
  onSearchChange: (value: string) => void;
  onPartyTypeChange: (value: "all" | PartyType) => void;
  onPartyIdChange: (value?: string) => void;
  onPartySearchChange: (value: string) => void;
  onStatusChange: (value: DeferredSalesStatusFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function DeferredSalesToolbar({
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
  canExport,
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
}: DeferredSalesToolbarProps) {
  const t = useTranslations("deferred-sales");

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.partyTypeAll") },
      { value: "CUSTOMER", label: t("filters.partyTypeCustomer") },
      { value: "SUPPLIER", label: t("filters.partyTypeSupplier") },
      { value: "EMPLOYEE", label: t("filters.partyTypeEmployee") },
    ],
    [t],
  );

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.statusAll") },
      { value: "PENDING", label: t("status.PENDING") },
      { value: "PARTIAL", label: t("status.PARTIAL") },
      { value: "PAID", label: t("status.PAID") },
      { value: "OVERDUE", label: t("status.OVERDUE") },
    ],
    [t],
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50].map((count) => ({ value: String(count), label: t("filters.perPage", { count }) })),
    [t],
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
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
          {canCreate && (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick}>
              {t("actions.add")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-4">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search size={16} />
          </span>
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("filters.search")}
            className="pl-9"
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={partyTypeFilter}
            options={partyTypeOptions}
            searchable={false}
            placeholder={t("filters.partyType")}
            searchPlaceholder={t("filters.partyType")}
            onChange={(value) => onPartyTypeChange((value as "all" | PartyType | undefined) ?? "all")}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={partyIdFilter}
            options={partyOptions}
            searchable
            placeholder={t("filters.party")}
            searchPlaceholder={t("filters.searchParty")}
            emptyText={t("filters.noParties")}
            onSearchChange={onPartySearchChange}
            onChange={(value) => onPartyIdChange(value)}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={statusFilter}
            options={statusOptions}
            searchable={false}
            placeholder={t("filters.status")}
            searchPlaceholder={t("filters.status")}
            onChange={(value) => onStatusChange((value as DeferredSalesStatusFilter | undefined) ?? "all")}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={String(limit)}
            options={limitOptions}
            searchable={false}
            placeholder={t("filters.perPage", { count: limit })}
            searchPlaceholder={t("filters.perPage", { count: limit })}
            onChange={(value) => onLimitChange(Number(value ?? 10))}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <DatePicker
            id="deferred-sales-date-from"
            placeholder={t("form.entryDate")}
            defaultDate={dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />
        </div>
        <div className="md:col-span-3">
          <DatePicker
            id="deferred-sales-date-to"
            placeholder={t("form.dueDate")}
            defaultDate={dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
          />
        </div>
        <div className="md:col-span-6 text-sm text-gray-600 dark:text-gray-400 md:text-end">
          {t("filters.total", { count: total })}
        </div>
      </div>
    </section>
  );
}
