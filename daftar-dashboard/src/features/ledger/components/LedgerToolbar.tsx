"use client";

import { Download, Plus } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { PartyType } from "@/lib/api/types";

interface LedgerToolbarProps {
  partyType: PartyType;
  partyId?: string;
  partyOptions: ComboboxOption[];
  partyLoading: boolean;
  dateFrom: string;
  dateTo: string;
  limit: number;
  canCreate: boolean;
  canExport: boolean;
  isExporting: boolean;
  onPartyTypeChange: (value: PartyType) => void;
  onPartyChange: (value?: string) => void;
  onPartySearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onResetFilters: () => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function LedgerToolbar({
  partyType,
  partyId,
  partyOptions,
  partyLoading,
  dateFrom,
  dateTo,
  limit,
  canCreate,
  canExport,
  isExporting,
  onPartyTypeChange,
  onPartyChange,
  onPartySearchChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onResetFilters,
  onCreateClick,
  onExportClick,
}: LedgerToolbarProps) {
  const t = useTranslations("ledger");

  const partyTypeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "CUSTOMER", label: t("filters.partyTypes.CUSTOMER") },
      { value: "SUPPLIER", label: t("filters.partyTypes.SUPPLIER") },
      { value: "EMPLOYEE", label: t("filters.partyTypes.EMPLOYEE") },
    ],
    [t]
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () => [10, 20, 50, 100].map((value) => ({ value: String(value), label: String(value) })),
    []
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1>
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
          {canCreate ? (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick}>
              {t("actions.addEntry")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("filters.partyType")}
          </label>
          <Combobox
            value={partyType}
            options={partyTypeOptions}
            searchable={false}
            placeholder={t("filters.partyType")}
            searchPlaceholder={t("filters.partyType")}
            onChange={(value) => onPartyTypeChange((value as PartyType | undefined) ?? "CUSTOMER")}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("filters.party")}
          </label>
          <Combobox
            value={partyId}
            options={partyOptions}
            loading={partyLoading}
            placeholder={t("filters.partyPlaceholder")}
            searchPlaceholder={t("filters.partySearchPlaceholder")}
            emptyText={t("filters.partyEmpty")}
            loadingText={t("filters.partyLoading")}
            onSearchChange={onPartySearchChange}
            onChange={onPartyChange}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("filters.fromDate")}
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("filters.toDate")}
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t("filters.perPage")}
          </label>
          <Combobox
            value={String(limit)}
            options={limitOptions}
            searchable={false}
            placeholder={String(limit)}
            searchPlaceholder={t("filters.perPage")}
            onChange={(value) => onLimitChange(Number(value ?? 20))}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick={onResetFilters}
          type="button"
        >
          {t("filters.reset")}
        </button>
      </div>
    </section>
  );
}
