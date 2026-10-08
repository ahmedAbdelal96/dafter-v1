"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type {
  PlatformAuditSortBy,
  PlatformAuditSortOrder,
} from "@/lib/api/services/platform-audit";

interface PlatformAuditFiltersCardProps {
  search: string;
  companyId?: string;
  actorUserId?: string;
  action?: string;
  entityType?: string;
  sortBy: PlatformAuditSortBy;
  sortOrder: PlatformAuditSortOrder;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
  companyOptions: ComboboxOption[];
  actorOptions: ComboboxOption[];
  actionOptions: ComboboxOption[];
  entityTypeOptions: ComboboxOption[];
  companiesLoading?: boolean;
  actorsLoading?: boolean;
  onSearchChange: (value: string) => void;
  onCompanySearchChange: (value: string) => void;
  onActorSearchChange: (value: string) => void;
  onCompanyChange: (value?: string) => void;
  onActorChange: (value?: string) => void;
  onActionChange: (value?: string) => void;
  onEntityTypeChange: (value?: string) => void;
  onSortByChange: (value: PlatformAuditSortBy) => void;
  onSortOrderChange: (value: PlatformAuditSortOrder) => void;
  onLimitChange: (value: number) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onReset: () => void;
}

const LIMIT_OPTIONS = [10, 20, 50, 100];

const SORT_BY_OPTIONS: PlatformAuditSortBy[] = ["createdAt", "action", "entityType"];
const SORT_ORDER_OPTIONS: PlatformAuditSortOrder[] = ["desc", "asc"];

export function PlatformAuditFiltersCard({
  search,
  companyId,
  actorUserId,
  action,
  entityType,
  sortBy,
  sortOrder,
  limit,
  dateFrom,
  dateTo,
  companyOptions,
  actorOptions,
  actionOptions,
  entityTypeOptions,
  companiesLoading = false,
  actorsLoading = false,
  onSearchChange,
  onCompanySearchChange,
  onActorSearchChange,
  onCompanyChange,
  onActorChange,
  onActionChange,
  onEntityTypeChange,
  onSortByChange,
  onSortOrderChange,
  onLimitChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: PlatformAuditFiltersCardProps) {
  const t = useTranslations("platformAudit.filters");

  const limitOptions = useMemo<ComboboxOption[]>(
    () =>
      LIMIT_OPTIONS.map((option) => ({
        value: String(option),
        label: t("limitOption", { count: option }),
      })),
    [t],
  );

  const sortByOptions = useMemo<ComboboxOption[]>(
    () =>
      SORT_BY_OPTIONS.map((value) => ({
        value,
        label: t(`sortBy.${value}`),
      })),
    [t],
  );

  const sortOrderOptions = useMemo<ComboboxOption[]>(
    () =>
      SORT_ORDER_OPTIONS.map((value) => ({
        value,
        label: t(`sortOrder.${value}`),
      })),
    [t],
  );

  return (
    <section className="relative z-30 rounded-3xl border border-border-light/90 bg-white/92 p-4 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
        />

        <Combobox
          value={companyId}
          options={companyOptions}
          placeholder={t("placeholders.company")}
          searchPlaceholder={t("searchPlaceholder")}
          loading={companiesLoading}
          loadingText={t("loading")}
          emptyText={t("empty")}
          onSearchChange={onCompanySearchChange}
          onChange={onCompanyChange}
        />

        <Combobox
          value={actorUserId}
          options={actorOptions}
          placeholder={t("placeholders.actor")}
          searchPlaceholder={t("searchPlaceholder")}
          loading={actorsLoading}
          loadingText={t("loading")}
          emptyText={t("empty")}
          onSearchChange={onActorSearchChange}
          onChange={onActorChange}
        />

        <Combobox
          value={action}
          options={actionOptions}
          placeholder={t("placeholders.action")}
          searchPlaceholder={t("searchPlaceholder")}
          emptyText={t("empty")}
          onChange={onActionChange}
        />

        <Combobox
          value={entityType}
          options={entityTypeOptions}
          placeholder={t("placeholders.entityType")}
          searchPlaceholder={t("searchPlaceholder")}
          emptyText={t("empty")}
          onChange={onEntityTypeChange}
        />

        <Combobox
          value={String(limit)}
          options={limitOptions}
          placeholder={t("placeholders.limit")}
          searchable={false}
          emptyText={t("empty")}
          onChange={(value) => onLimitChange(Number(value ?? 20))}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[180px_180px_180px_180px_auto]">
        <DatePicker
          id="platform-audit-filter-date-from"
          placeholder={t("dateFrom")}
          defaultDate={dateFrom || undefined}
          onChange={(_, dateString) => onDateFromChange(dateString || "")}
          options={{ allowInput: true }}
          className="relative z-40"
        />
        <DatePicker
          id="platform-audit-filter-date-to"
          placeholder={t("dateTo")}
          defaultDate={dateTo || undefined}
          onChange={(_, dateString) => onDateToChange(dateString || "")}
          options={{ allowInput: true }}
          className="relative z-40"
        />
        <Combobox
          value={sortBy}
          options={sortByOptions}
          placeholder={t("placeholders.sortBy")}
          searchable={false}
          emptyText={t("empty")}
          onChange={(value) => onSortByChange((value as PlatformAuditSortBy | undefined) ?? "createdAt")}
        />
        <Combobox
          value={sortOrder}
          options={sortOrderOptions}
          placeholder={t("placeholders.sortOrder")}
          searchable={false}
          emptyText={t("empty")}
          onChange={(value) => onSortOrderChange((value as PlatformAuditSortOrder | undefined) ?? "desc")}
        />
        <Button variant="outline" className="h-11" onClick={onReset}>
          {t("reset")}
        </Button>
      </div>
    </section>
  );
}
