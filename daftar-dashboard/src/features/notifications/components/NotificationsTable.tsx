"use client";

import { useMemo } from "react";
import { Eye, MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import Badge from "@/components/ui/badge/Badge";
import type { NotificationFeedItem, NotificationFeedMeta } from "@/lib/api/types";
import { formatNotificationDate } from "../utils/notification-format";

interface NotificationsTableProps {
  notifications: NotificationFeedItem[];
  meta: NotificationFeedMeta;
  canMarkRead: boolean;
  markingRead: boolean;
  onPageChange: (page: number) => void;
  onView: (item: NotificationFeedItem) => void;
  onMarkRead: (item: NotificationFeedItem) => void;
}

export function NotificationsTable({
  notifications,
  meta,
  canMarkRead,
  markingRead,
  onPageChange,
  onView,
  onMarkRead,
}: NotificationsTableProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();

  const columns = useMemo(
    () => [
      {
        id: "title",
        header: t("table.title"),
        accessor: (row: NotificationFeedItem) => row.title,
        cell: (row: NotificationFeedItem) => (
          <button className="font-medium text-text-brand hover:underline" onClick={() => onView(row)}>
            {row.title}
          </button>
        ),
      },
      {
        id: "body",
        header: t("table.body"),
        accessor: (row: NotificationFeedItem) => row.body,
        cell: (row: NotificationFeedItem) => (
          <span className="line-clamp-2 max-w-lg text-sm text-gray-700 dark:text-gray-300">{row.body}</span>
        ),
      },
      {
        id: "type",
        header: t("table.type"),
        accessor: (row: NotificationFeedItem) => row.type,
      },
      {
        id: "status",
        header: t("table.status"),
        accessor: (row: NotificationFeedItem) => (row.readAt ? "read" : "unread"),
        cell: (row: NotificationFeedItem) => (
          <Badge color={row.readAt ? "success" : "warning"}>
            {row.readAt ? t("status.read") : t("status.unread")}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        header: t("table.createdAt"),
        accessor: (row: NotificationFeedItem) => formatNotificationDate(row.createdAt, locale),
      },
    ],
    [locale, onView, t],
  );

  return (
    <DataTable<NotificationFeedItem>
      data={notifications}
      columns={columns}
      getRowId={(row) => row.id}
      rowActions={(row) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            onClick={() => onView(row)}
            title={t("actions.view")}
          >
            <Eye size={16} />
          </button>

          {canMarkRead && !row.readAt ? (
            <button
              className="rounded-md p-1.5 text-success-600 transition hover:bg-success-50"
              onClick={() => onMarkRead(row)}
              title={t("actions.markRead")}
              disabled={markingRead}
            >
              <MailCheck size={16} />
            </button>
          ) : null}
        </div>
      )}
      pagination={{
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.totalPages,
        hasNextPage: meta.hasNext,
        hasPrevPage: meta.hasPrev,
      }}
      onPageChange={onPageChange}
      ariaLabel={t("table.ariaLabel")}
    />
  );
}

