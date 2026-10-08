"use client";

import { Download, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { UserStatusFilter } from "../utils/user-schemas";

interface UsersToolbarProps {
  searchInput: string;
  selectedCompanyId?: string;
  companyOptions: ComboboxOption[];
  companiesLoading: boolean;
  statusFilter: UserStatusFilter;
  limit: number;
  total: number;
  canCreate: boolean;
  canExport: boolean;
  isExporting: boolean;
  onSearchChange: (value: string) => void;
  onCompanySearchChange: (value: string) => void;
  onCompanyChange: (value?: string) => void;
  onStatusChange: (value: UserStatusFilter) => void;
  onLimitChange: (value: number) => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function UsersToolbar({
  searchInput,
  selectedCompanyId,
  companyOptions,
  companiesLoading,
  statusFilter,
  limit,
  total,
  canCreate,
  canExport,
  isExporting,
  onSearchChange,
  onCompanySearchChange,
  onCompanyChange,
  onStatusChange,
  onLimitChange,
  onCreateClick,
  onExportClick,
}: UsersToolbarProps) {
  const t = useTranslations("platformUsers");

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.statusAll") },
      { value: "active", label: t("status.ACTIVE") },
      { value: "disabled", label: t("status.DISABLED") },
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
              disabled={isExporting || !selectedCompanyId}
            >
              {isExporting ? t("actions.exporting") : t("actions.export")}
            </Button>
          )}
          {canCreate && (
            <Button startIcon={<Plus size={16} />} onClick={onCreateClick} disabled={!selectedCompanyId}>
              {t("actions.addStaff")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Combobox
            value={selectedCompanyId}
            options={companyOptions}
            loading={companiesLoading}
            searchable
            placeholder={t("filters.company")}
            searchPlaceholder={t("filters.companySearch")}
            emptyText={t("filters.companyEmpty")}
            loadingText={t("filters.companyLoading")}
            onSearchChange={onCompanySearchChange}
            onChange={onCompanyChange}
          />
        </div>

        <div className="relative md:col-span-4">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search size={16} />
          </span>
          <Input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("filters.search")}
            className="pl-9"
            disabled={!selectedCompanyId}
          />
        </div>

        <div className="md:col-span-2">
          <Combobox
            value={statusFilter}
            options={statusOptions}
            searchable={false}
            placeholder={t("filters.status")}
            searchPlaceholder={t("filters.status")}
            onChange={(value) => onStatusChange((value as UserStatusFilter | undefined) ?? "all")}
            disabled={!selectedCompanyId}
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
            disabled={!selectedCompanyId}
          />
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {t("summary.total", { count: total })}
      </div>
    </section>
  );
}
