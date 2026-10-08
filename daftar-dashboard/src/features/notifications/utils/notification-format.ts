import type { NotificationFeedMeta } from "@/lib/api/types";

export type NotificationScopeFilter = "all" | "unread";

export const DEFAULT_NOTIFICATIONS_META: NotificationFeedMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export function toOnlyUnreadValue(scope: NotificationScopeFilter): boolean | undefined {
  return scope === "unread" ? true : undefined;
}

export function formatNotificationDate(value: string, locale: string): string {
  try {
    return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

