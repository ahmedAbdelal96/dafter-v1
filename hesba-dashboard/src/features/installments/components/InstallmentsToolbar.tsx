"use client";

import { Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type {
  InstallmentContractStatusFilter,
  InstallmentPartyFilter,
  InstallmentScheduleStatusFilter,
} from "../utils/installments-schemas";

interface InstallmentsToolbarProps {
  searchInput: string;
  partyTypeFilter: InstallmentPartyFilter;
  partyIdFilter?: string;
  statusFilter: InstallmentContractStatusFilter;
  scheduleStatusFilter: InstallmentScheduleStatusFilter;
  dateFrom: string;
  dateTo: string;
  limit: number;
  total: number;
  isExporting: boolean;
  partyOptions: ComboboxOption[];
  canCreate: boolean;
  canExport: boolean;
  onSearchChange: (value: string) => void;
  onPartyTypeChange: (value: InstallmentPartyFilter) => void;
  onPartyIdChange: (value?: string) => void;
  onPartySearchChange: (value: string) => void;
  onStatusChange: (value: InstallmentContractStatusFilter) => void;
  onScheduleStatusChange: (value: InstallmentScheduleStatusFilter) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function InstallmentsToolbar({
  searchInput,
  partyTypeFilter,
  partyIdFilter,
  statusFilter,
  scheduleStatusFilter,
  dateFrom,
  dateTo,
  limit,
  total,
  isExporting,
  partyOptions,
  canCreate,
  canExport,
  onSearchChange,
  onPartyTypeChange,
  onPartyIdChange,
  onPartySearchChange,
  onStatusChange,
  onScheduleStatusChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onCreateClick,
  onExportClick,
}: InstallmentsToolbarProps) {
  const t = useTranslations("installments");

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
      { value: "ACTIVE", label: t("status.ACTIVE") },
      { value: "COMPLETED", label: t("status.COMPLETED") },
      { value: "CANCELLED", label: t("status.CANCELLED") },
    ],
    [t],
  );

  const scheduleStatusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.scheduleStatusAll") },
      { value: "PENDING", label: t("scheduleStatus.PENDING") },
      { value: "PARTIAL", label: t("scheduleStatus.PARTIAL") },
      { value: "PAID", label: t("scheduleStatus.PAID") },
      { value: "OVERDUE", label: t("scheduleStatus.OVERDUE") },
      { value: "WAIVED", label: t("scheduleStatus.WAIVED") },
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

        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <Button variant="outline" onClick={onExportClick} disabled={isExporting}>
              {isExporting ? t("actions.exporting") : t("actions.export")}
            </Button>
          )}
          {canCreate && (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick}>
              {t("actions.addContract")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-3">
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
            onChange={(value) => onPartyTypeChange((value as InstallmentPartyFilter | undefined) ?? "all")}
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
            onChange={(value) =>
              onStatusChange((value as InstallmentContractStatusFilter | undefined) ?? "all")
            }
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={scheduleStatusFilter}
            options={scheduleStatusOptions}
            searchable={false}
            placeholder={t("filters.scheduleStatus")}
            searchPlaceholder={t("filters.scheduleStatus")}
            onChange={(value) =>
              onScheduleStatusChange((value as InstallmentScheduleStatusFilter | undefined) ?? "all")
            }
          />
        </div>

        <div className="md:col-span-1">
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
        <div className="md:col-span-2">
          <DatePicker
            id="installments-date-from"
            placeholder={t("filters.dateFrom")}
            defaultDate={dateFrom || undefined}
            onChange={(_, dateStr) => onDateFromChange(dateStr || "")}
            options={{ allowInput: true }}
          />
        </div>
        <div className="md:col-span-2">
          <DatePicker
            id="installments-date-to"
            placeholder={t("filters.dateTo")}
            defaultDate={dateTo || undefined}
            onChange={(_, dateStr) => onDateToChange(dateStr || "")}
            options={{ allowInput: true }}
          />
        </div>
        <div className="md:col-span-8 text-sm text-gray-600 dark:text-gray-400 md:text-end">
          {t("filters.total", { count: total })}
        </div>
      </div>
    </section>
  );
}
