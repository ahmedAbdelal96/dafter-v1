"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { ExportScopeModal, type ExportScope } from "@/components/common/ExportScopeModal";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { usePermission } from "@/hooks/usePermission";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/lib/api/hooks/use-notifications";
import { notificationsApi } from "@/lib/api/services";
import { exportRowsToExcel, fetchAllMetaItems } from "@/lib/export/excel-export";
import type { NotificationFeedItem, NotificationFilters } from "@/lib/api/types";
import { NotificationDetailsModal } from "./NotificationDetailsModal";
import { NotificationsTable } from "./NotificationsTable";
import { NotificationsToolbar } from "./NotificationsToolbar";
import {
  DEFAULT_NOTIFICATIONS_META,
  formatNotificationDate,
  toOnlyUnreadValue,
  type NotificationScopeFilter,
} from "../utils/notification-format";

export function NotificationsPageClient() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { hasPermission } = usePermission();
  const { handleApiError, showInfo, showSuccess } = useErrorHandler();

  const canView = hasPermission("notifications:view");
  const canUpdate = hasPermission("notifications:update");

  const [scopeFilter, setScopeFilter] = useState<NotificationScopeFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detailsItem, setDetailsItem] = useState<NotificationFeedItem | null>(null);
  const [isExportScopeOpen, setIsExportScopeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const filters: NotificationFilters = useMemo(
    () => ({
      page,
      limit,
      onlyUnread: toOnlyUnreadValue(scopeFilter),
    }),
    [limit, page, scopeFilter],
  );

  const notificationsQuery = useNotifications(filters, canView);
  const unreadCountQuery = useUnreadNotificationsCount(canView);

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.items ?? [];
  const meta = notificationsQuery.data?.meta ?? DEFAULT_NOTIFICATIONS_META;
  const unreadCount = unreadCountQuery.data?.count ?? 0;

  const handleMarkRead = async (item: NotificationFeedItem) => {
    if (item.readAt) return;
    try {
      await markReadMutation.mutateAsync(item.id);
      showSuccess(t("messages.markReadSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.markReadError"));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllReadMutation.mutateAsync();
      if (result.count === 0) {
        showInfo(t("messages.nothingToMark"));
        return;
      }
      showSuccess(t("messages.markAllReadSuccess", { count: result.count }));
    } catch (error) {
      handleApiError(error, t("messages.markAllReadError"));
    }
  };

  const handleExportExcel = async (scope?: ExportScope) => {
    try {
      setIsExporting(true);

      const allItems = await fetchAllMetaItems(
        (currentPage, pageSize) =>
          notificationsApi.getAll({
            ...filters,
            page: currentPage,
            limit: pageSize,
          }),
        { maxItems: scope?.maxRecords },
      );

      if (allItems.length === 0) {
        showInfo(t("messages.exportEmpty"));
        return;
      }

      const rows = allItems.map((item) => ({
        [t("table.title")]: item.title,
        [t("table.body")]: item.body,
        [t("table.type")]: item.type,
        [t("table.status")]: item.readAt ? t("status.read") : t("status.unread"),
        [t("table.createdAt")]: formatNotificationDate(item.createdAt, locale),
      }));

      await exportRowsToExcel(rows, {
        locale,
        sheetName: t("export.sheetName"),
        filePrefix: t("export.filePrefix"),
        columnWidths: [30, 50, 18, 14, 22],
      });

      showSuccess(t("messages.exportSuccess"));
    } catch (error) {
      handleApiError(error, t("messages.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  if (!canView) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("title")}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("noPermission")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationsToolbar
        total={meta.total}
        unreadCount={unreadCount}
        scopeFilter={scopeFilter}
        limit={limit}
        canMarkAllRead={canUpdate}
        canExport={canView}
        markingAllRead={markAllReadMutation.isPending}
        exporting={isExporting}
        onScopeChange={(value) => {
          setScopeFilter(value);
          setPage(1);
        }}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
        onMarkAllRead={() => void handleMarkAllRead()}
        onExportClick={() => setIsExportScopeOpen(true)}
      />

      <QueryState
        isLoading={notificationsQuery.isLoading}
        isError={notificationsQuery.isError}
        errorMessage={notificationsQuery.error?.message}
        isEmpty={!notificationsQuery.isLoading && !notificationsQuery.isFetching && notifications.length === 0}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        <NotificationsTable
          notifications={notifications}
          meta={meta}
          canMarkRead={canUpdate}
          markingRead={markReadMutation.isPending}
          onPageChange={setPage}
          onView={setDetailsItem}
          onMarkRead={(item) => void handleMarkRead(item)}
        />
      </QueryState>

      <NotificationDetailsModal
        open={Boolean(detailsItem)}
        notification={detailsItem}
        onClose={() => setDetailsItem(null)}
      />

      <ExportScopeModal
        open={isExportScopeOpen}
        loading={isExporting}
        showDateRange={false}
        labels={{
          title: t("exportModal.title"),
          description: `${t("exportModal.description")} (${meta.total})`,
          maxRecords: t("exportModal.maxRecords"),
          maxRecordsHint: t("exportModal.maxRecordsHint"),
          reset: t("exportModal.reset"),
          cancel: t("actions.cancel"),
          confirm: t("actions.export"),
        }}
        onClose={() => setIsExportScopeOpen(false)}
        onConfirm={(scope) => {
          setIsExportScopeOpen(false);
          void handleExportExcel(scope);
        }}
      />
    </div>
  );
}
