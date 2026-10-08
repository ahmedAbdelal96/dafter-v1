"use client";

import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { NotificationFeedItem } from "@/lib/api/types";
import { formatNotificationDate } from "../utils/notification-format";

interface NotificationDetailsModalProps {
  open: boolean;
  notification: NotificationFeedItem | null;
  onClose: () => void;
}

export function NotificationDetailsModal({ open, notification, onClose }: NotificationDetailsModalProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.detailsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.detailsDescription")}</p>

      {notification ? (
        <div className="mt-5 space-y-4 text-sm">
          <InfoRow label={t("table.title")} value={notification.title} />
          <InfoRow label={t("table.type")} value={notification.type} />
          <InfoRow
            label={t("table.status")}
            value={notification.readAt ? t("status.read") : t("status.unread")}
          />
          <InfoRow label={t("table.createdAt")} value={formatNotificationDate(notification.createdAt, locale)} />
          <InfoRow label={t("table.body")} value={notification.body} />

          {notification.data && Object.keys(notification.data).length > 0 ? (
            <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
              <p className="text-xs text-gray-500">{t("details.payload")}</p>
              <pre className="mt-2 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      )}

      <div className="mt-6 flex justify-end">
        <Button variant="danger" onClick={onClose}>
          {t("actions.close")}
        </Button>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}


