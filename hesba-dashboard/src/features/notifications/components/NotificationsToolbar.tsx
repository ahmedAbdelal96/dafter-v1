"use client";

import { Bell, CheckCheck, Download } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Combobox, { type ComboboxOption } from "@/components/ui/combobox/Combobox";
import type { NotificationScopeFilter } from "../utils/notification-format";

interface NotificationsToolbarProps {
  total: number;
  unreadCount: number;
  scopeFilter: NotificationScopeFilter;
  limit: number;
  canMarkAllRead: boolean;
  canExport: boolean;
  markingAllRead: boolean;
  exporting: boolean;
  onScopeChange: (value: NotificationScopeFilter) => void;
  onLimitChange: (value: number) => void;
  onMarkAllRead: () => void;
  onExportClick: () => void;
}

export function NotificationsToolbar({
  total,
  unreadCount,
  scopeFilter,
  limit,
  canMarkAllRead,
  canExport,
  markingAllRead,
  exporting,
  onScopeChange,
  onLimitChange,
  onMarkAllRead,
  onExportClick,
}: NotificationsToolbarProps) {
  const t = useTranslations("notifications");

  const scopeOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "all", label: t("filters.scopeAll") },
      { value: "unread", label: t("filters.scopeUnread") },
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
            <Button variant="outline" startIcon={<Download size={16} />} onClick={onExportClick} disabled={exporting}>
              {exporting ? t("actions.exporting") : t("actions.export")}
            </Button>
          )}

          {canMarkAllRead && (
            <Button
              variant="outline"
              startIcon={<CheckCheck size={16} />}
              onClick={onMarkAllRead}
              disabled={markingAllRead || unreadCount === 0}
            >
              {markingAllRead ? t("actions.markingAll") : t("actions.markAllRead")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-6">
          <Combobox
            value={scopeFilter}
            options={scopeOptions}
            searchable={false}
            placeholder={t("filters.scope")}
            searchPlaceholder={t("filters.scope")}
            onChange={(value) => onScopeChange((value as NotificationScopeFilter | undefined) ?? "all")}
          />
        </div>

        <div className="md:col-span-6">
          <Combobox
            value={String(limit)}
            options={limitOptions}
            searchable={false}
            placeholder={t("filters.perPage", { count: limit })}
            searchPlaceholder={t("filters.perPage", { count: limit })}
            onChange={(value) => onLimitChange(Number(value ?? 20))}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>{t("summary.total", { count: total })}</span>
        <span className="inline-flex items-center gap-1">
          <Bell size={14} />
          {t("summary.unread", { count: unreadCount })}
        </span>
      </div>
    </section>
  );
}

