"use client";

import { Download, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { StatusFilter } from "../utils/supplier-schemas";

interface SuppliersToolbarProps {
  searchInput: string;
  statusFilter: StatusFilter;
  limit: number;
  total: number;
  canCreate: boolean;
  canExport: boolean;
  isExporting: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onLimitChange: (value: number) => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function SuppliersToolbar({
  searchInput,
  statusFilter,
  limit,
  total,
  canCreate,
  canExport,
  isExporting,
  onSearchChange,
  onStatusChange,
  onLimitChange,
  onCreateClick,
  onExportClick,
}: SuppliersToolbarProps) {
  const t = useTranslations("suppliers");

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.allStatuses") },
      { value: "active", label: t("status.active") },
      { value: "inactive", label: t("status.inactive") },
    ],
    [t],
  );

  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      [10, 20, 50].map((count) => ({
        value: String(count),
        label: t("filters.perPage", { count }),
      })),
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
              {isExporting ? t("actions.exporting") : t("actions.exportExcel")}
            </Button>
          )}
          {canCreate && (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick}>
              {t("actions.addSupplier")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-6">
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

        <div className="md:col-span-3">
          <Combobox
            value={statusFilter}
            options={statusOptions}
            searchable={false}
            placeholder={t("filters.allStatuses")}
            searchPlaceholder={t("filters.searchPlaceholder")}
            onChange={(value) => onStatusChange((value as StatusFilter | undefined) ?? "all")}
          />
        </div>

        <div className="md:col-span-3">
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
        {t("summary.total", { count: total })}
      </div>
    </section>
  );
}
