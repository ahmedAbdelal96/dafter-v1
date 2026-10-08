"use client";

import { Download, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { ExpenseCategoryValue } from "@/lib/api/types";
import { EXPENSE_CATEGORIES } from "../utils/expense-constants";

interface ExpensesToolbarProps {
  searchInput: string;
  categoryFilter?: ExpenseCategoryValue;
  supplierFilter?: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
  total: number;
  supplierOptions: ComboboxOption[];
  canCreate: boolean;
  isExporting: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value?: ExpenseCategoryValue) => void;
  onSupplierChange: (value?: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function ExpensesToolbar({
  searchInput,
  categoryFilter,
  supplierFilter,
  dateFrom,
  dateTo,
  limit,
  total,
  supplierOptions,
  canCreate,
  isExporting,
  onSearchChange,
  onCategoryChange,
  onSupplierChange,
  onDateFromChange,
  onDateToChange,
  onLimitChange,
  onCreateClick,
  onExportClick,
}: ExpensesToolbarProps) {
  const t = useTranslations("expenses");

  const categoryOptions = useMemo<ComboboxOption[]>(
    () =>
      EXPENSE_CATEGORIES.map((category) => ({
        value: category,
        label: t(`categories.${category}`),
      })),
    [t]
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      [10, 20, 50].map((count) => ({
        value: String(count),
        label: t("filters.perPage", { count }),
      })),
    [t]
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" startIcon={<Download size={16} />} onClick={onExportClick} disabled={isExporting}>
            {isExporting ? t("actions.exporting") : t("actions.exportExcel")}
          </Button>

          {canCreate && (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick}>
              {t("actions.addExpense")}
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
            placeholder={t("filters.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={categoryFilter}
            options={categoryOptions}
            searchable
            placeholder={t("filters.allCategories")}
            searchPlaceholder={t("filters.searchCategory")}
            emptyText={t("filters.noCategories")}
            onChange={(value) => onCategoryChange(value as ExpenseCategoryValue | undefined)}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={supplierFilter}
            options={supplierOptions}
            searchable
            placeholder={t("filters.allSuppliers")}
            searchPlaceholder={t("filters.searchSupplier")}
            emptyText={t("filters.noSuppliers")}
            onChange={onSupplierChange}
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

        <div className="md:col-span-2">
          <Combobox
            value={String(limit)}
            options={limitOptions}
            searchable={false}
            placeholder={t("filters.perPage", { count: limit })}
            searchPlaceholder={t("filters.searchPlaceholder")}
            onChange={(value) => onLimitChange(Number(value ?? 10))}
          />
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {t("summary.totalExpenses", { count: total })}
      </div>
    </section>
  );
}
