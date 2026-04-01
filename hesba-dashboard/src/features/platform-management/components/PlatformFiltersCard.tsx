"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox from "@/components/ui/combobox/Combobox";

export type PlatformActiveFilter = "all" | "active" | "inactive";
export type PlatformSubscriptionFilter = "all" | "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "DISABLED";
export type PlatformArchivedMode = "activeOnly" | "includeArchived" | "archivedOnly";
export type PlatformSortBy = "createdAt" | "updatedAt" | "name";
export type PlatformSortOrder = "asc" | "desc";

interface PlatformFiltersCardProps {
  search: string;
  subscriptionStatus: PlatformSubscriptionFilter;
  activeFilter: PlatformActiveFilter;
  archivedMode?: PlatformArchivedMode;
  showArchivedModeFilter?: boolean;
  limit: number;
  sortBy?: PlatformSortBy;
  sortOrder?: PlatformSortOrder;
  showSortControls?: boolean;
  dateFrom?: string;
  dateTo?: string;
  showDateRange?: boolean;
  onSearchChange: (value: string) => void;
  onSubscriptionStatusChange: (value: PlatformSubscriptionFilter) => void;
  onActiveFilterChange: (value: PlatformActiveFilter) => void;
  onArchivedModeChange?: (value: PlatformArchivedMode) => void;
  onLimitChange: (value: number) => void;
  onSortByChange?: (value: PlatformSortBy) => void;
  onSortOrderChange?: (value: PlatformSortOrder) => void;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  onReset: () => void;
}

const LIMIT_OPTIONS = [10, 20, 50];
const SUBSCRIPTION_OPTIONS: PlatformSubscriptionFilter[] = ["all", "TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED", "DISABLED"];
const ACTIVE_OPTIONS: PlatformActiveFilter[] = ["all", "active", "inactive"];
const ARCHIVED_MODE_OPTIONS: PlatformArchivedMode[] = [
  "activeOnly",
  "includeArchived",
  "archivedOnly",
];
const SORT_BY_OPTIONS: PlatformSortBy[] = ["createdAt", "updatedAt", "name"];
const SORT_ORDER_OPTIONS: PlatformSortOrder[] = ["desc", "asc"];

export function PlatformFiltersCard({
  search,
  subscriptionStatus,
  activeFilter,
  archivedMode = "activeOnly",
  showArchivedModeFilter = false,
  limit,
  sortBy = "createdAt",
  sortOrder = "desc",
  showSortControls = false,
  dateFrom,
  dateTo,
  showDateRange = false,
  onSearchChange,
  onSubscriptionStatusChange,
  onActiveFilterChange,
  onArchivedModeChange,
  onLimitChange,
  onSortByChange,
  onSortOrderChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: PlatformFiltersCardProps) {
  const t = useTranslations("platformManagement.filters");
  const subscriptionOptions = useMemo(
    () =>
      SUBSCRIPTION_OPTIONS.map((option) => ({
        value: option,
        label: t(`subscriptionStatus.${option}`),
      })),
    [t],
  );
  const activeOptions = useMemo(
    () =>
      ACTIVE_OPTIONS.map((option) => ({
        value: option,
        label: t(`activeState.${option}`),
      })),
    [t],
  );
  const limitOptions = useMemo(
    () =>
      LIMIT_OPTIONS.map((option) => ({
        value: String(option),
        label: t("limitOption", { count: option }),
      })),
    [t],
  );
  const archivedModeOptions = useMemo(
    () =>
      ARCHIVED_MODE_OPTIONS.map((option) => ({
        value: option,
        label: t(`archivedMode.${option}`),
      })),
    [t],
  );
  const sortByOptions = useMemo(
    () =>
      SORT_BY_OPTIONS.map((option) => ({
        value: option,
        label: t(`sortBy.${option}`),
      })),
    [t],
  );
  const sortOrderOptions = useMemo(
    () =>
      SORT_ORDER_OPTIONS.map((option) => ({
        value: option,
        label: t(`sortOrder.${option}`),
      })),
    [t],
  );

  return (
    <div className="relative z-30 rounded-3xl border border-border-light/90 bg-white/92 p-4 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
      <div
        className={`grid grid-cols-1 gap-3 ${
          showSortControls
            ? showArchivedModeFilter
              ? "xl:grid-cols-[minmax(220px,1.6fr)_repeat(6,minmax(130px,1fr))]"
              : "xl:grid-cols-[minmax(220px,1.6fr)_repeat(5,minmax(130px,1fr))]"
            : showArchivedModeFilter
              ? "xl:grid-cols-[minmax(240px,1.6fr)_repeat(4,minmax(150px,1fr))]"
              : "xl:grid-cols-[minmax(240px,1.6fr)_repeat(3,minmax(150px,1fr))]"
        }`}
      >
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={t("searchPlaceholder")} />

        <Combobox
          value={subscriptionStatus}
          options={subscriptionOptions}
          placeholder={t("placeholders.subscriptionStatus")}
          searchPlaceholder={t("searchPlaceholder")}
          emptyText={t("empty")}
          onChange={(value) => onSubscriptionStatusChange((value as PlatformSubscriptionFilter | undefined) ?? "all")}
        />

        <Combobox
          value={activeFilter}
          options={activeOptions}
          placeholder={t("placeholders.activeState")}
          searchPlaceholder={t("searchPlaceholder")}
          emptyText={t("empty")}
          onChange={(value) => onActiveFilterChange((value as PlatformActiveFilter | undefined) ?? "all")}
        />

        {showArchivedModeFilter ? (
          <Combobox
            value={archivedMode}
            options={archivedModeOptions}
            placeholder={t("placeholders.archivedMode")}
            searchPlaceholder={t("searchPlaceholder")}
            emptyText={t("empty")}
            onChange={(value) =>
              onArchivedModeChange?.((value as PlatformArchivedMode | undefined) ?? "activeOnly")
            }
          />
        ) : null}

        <Combobox
          value={String(limit)}
          options={limitOptions}
          placeholder={t("placeholders.limit")}
          searchable={false}
          emptyText={t("empty")}
          onChange={(value) => onLimitChange(Number(value ?? 10))}
        />

        {showSortControls ? (
          <Combobox
            value={sortBy}
            options={sortByOptions}
            placeholder={t("placeholders.sortBy")}
            searchable={false}
            emptyText={t("empty")}
            onChange={(value) =>
              onSortByChange?.((value as PlatformSortBy | undefined) ?? "createdAt")
            }
          />
        ) : null}

        {showSortControls ? (
          <Combobox
            value={sortOrder}
            options={sortOrderOptions}
            placeholder={t("placeholders.sortOrder")}
            searchable={false}
            emptyText={t("empty")}
            onChange={(value) =>
              onSortOrderChange?.((value as PlatformSortOrder | undefined) ?? "desc")
            }
          />
        ) : null}
      </div>

      {showDateRange ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[180px_180px_auto]">
          <DatePicker id="platform-filter-date-from" placeholder={t("dateFrom")} defaultDate={dateFrom || undefined} onChange={(_, dateStr) => onDateFromChange?.(dateStr || "")} options={{ allowInput: true }} className="relative z-40" />
          <DatePicker id="platform-filter-date-to" placeholder={t("dateTo")} defaultDate={dateTo || undefined} onChange={(_, dateStr) => onDateToChange?.(dateStr || "")} options={{ allowInput: true }} className="relative z-40" />
          <Button variant="outline" onClick={onReset} className="h-11">{t("reset")}</Button>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={onReset} className="h-11">{t("reset")}</Button>
        </div>
      )}
    </div>
  );
}
