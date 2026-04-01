import httpClient from "../http-client";
import { API_ENDPOINTS } from "../config";
import { isApiEnvelope, type ApiEnvelope } from "../contracts";
import type {
  ApiResponse,
  NotificationFeedItem,
  NotificationFeedMeta,
  NotificationFeedResponse,
  NotificationFilters,
  NotificationUnreadCount,
  RegisterNotificationDeviceTokenRequest,
} from "../types";

type NotificationsListApiPayload =
  | ApiEnvelope<{ data?: unknown; meta?: unknown }>
  | ApiEnvelope<NotificationFeedItem[]>
  | ApiResponse<NotificationFeedItem[]>
  | NotificationFeedItem[];

function toFeedMeta(total: number, page: number, limit: number, meta?: unknown): NotificationFeedMeta {
  const safeLimit = Math.max(limit || 20, 1);
  const safeTotal = Math.max(total || 0, 0);
  const fallbackTotalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));

  if (meta && typeof meta === "object") {
    const candidate = meta as Record<string, unknown>;
    const totalPagesCandidate = Number(candidate.totalPages ?? fallbackTotalPages);

    return {
      total: Number(candidate.total ?? safeTotal),
      page: Number(candidate.page ?? page),
      limit: Number(candidate.limit ?? safeLimit),
      totalPages:
        Number.isFinite(totalPagesCandidate) && totalPagesCandidate > 0
          ? totalPagesCandidate
          : fallbackTotalPages,
      hasNext: Boolean(candidate.hasNext ?? candidate.hasNextPage ?? false),
      hasPrev: Boolean(candidate.hasPrev ?? candidate.hasPrevious ?? candidate.hasPrevPage ?? page > 1),
    };
  }

  return {
    total: safeTotal,
    page,
    limit: safeLimit,
    totalPages: fallbackTotalPages,
    hasNext: page < fallbackTotalPages,
    hasPrev: page > 1,
  };
}

function normalizeFeedItem(value: unknown): NotificationFeedItem {
  const source = (value ?? {}) as Record<string, unknown>;
  const rawData = source.data;

  return {
    id: String(source.id ?? ""),
    type: String(source.type ?? "GENERAL"),
    title: String(source.title ?? ""),
    body: String(source.body ?? ""),
    data: rawData && typeof rawData === "object" ? (rawData as Record<string, unknown>) : null,
    readAt: source.readAt ? String(source.readAt) : null,
    sentAt: source.sentAt ? String(source.sentAt) : null,
    createdAt: String(source.createdAt ?? new Date().toISOString()),
  };
}

function normalizeNotificationsList(payload: NotificationsListApiPayload, filters?: NotificationFilters): NotificationFeedResponse {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;

  if (isApiEnvelope<unknown>(payload)) {
    const data = payload.data;

    if (Array.isArray(data)) {
      const items = data.map(normalizeFeedItem);
      return {
        items,
        meta: toFeedMeta(items.length, page, limit, (payload as { meta?: unknown }).meta),
      };
    }

    if (data && typeof data === "object") {
      const wrapped = data as Record<string, unknown>;
      const items = Array.isArray(wrapped.data)
        ? wrapped.data.map(normalizeFeedItem)
        : Array.isArray(wrapped.items)
          ? wrapped.items.map(normalizeFeedItem)
          : [];

      return {
        items,
        meta: toFeedMeta(items.length, page, limit, wrapped.meta ?? (payload as { meta?: unknown }).meta),
      };
    }
  }

  if (Array.isArray(payload)) {
    const items = payload.map(normalizeFeedItem);
    return { items, meta: toFeedMeta(items.length, page, limit) };
  }

  const legacy = payload as { data?: unknown; meta?: unknown };
  const items = Array.isArray(legacy.data) ? legacy.data.map(normalizeFeedItem) : [];

  return {
    items,
    meta: toFeedMeta(items.length, page, limit, legacy.meta),
  };
}

function normalizeUnreadCount(payload: unknown): NotificationUnreadCount {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return { count: Number(source.count ?? 0) };
}

function unwrapApiData(payload: unknown): unknown {
  if (isApiEnvelope<unknown>(payload)) {
    return payload.data;
  }
  return payload;
}

export const notificationsApi = {
  async getAll(filters?: NotificationFilters): Promise<NotificationFeedResponse> {
    const params = {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
      // Backend boolean coercion can treat "false" as truthy if sent as string.
      // Send this param only when true to keep behavior deterministic.
      onlyUnread: filters?.onlyUnread ? true : undefined,
    };

    const response = await httpClient.get<NotificationsListApiPayload>(API_ENDPOINTS.notifications.list, {
      params,
    });

    return normalizeNotificationsList(response.data, filters);
  },

  async getUnreadCount(): Promise<NotificationUnreadCount> {
    const response = await httpClient.get<NotificationUnreadCount | ApiResponse<NotificationUnreadCount>>(
      API_ENDPOINTS.notifications.unreadCount,
    );
    return normalizeUnreadCount(unwrapApiData(response.data));
  },

  async markRead(id: string): Promise<NotificationFeedItem> {
    const response = await httpClient.patch<NotificationFeedItem | ApiResponse<NotificationFeedItem>>(
      API_ENDPOINTS.notifications.markRead(id),
    );
    return normalizeFeedItem(unwrapApiData(response.data));
  },

  async markAllRead(): Promise<{ count: number }> {
    const response = await httpClient.patch<{ count?: number } | ApiResponse<{ count?: number }>>(
      API_ENDPOINTS.notifications.markAllRead,
    );
    const data = unwrapApiData(response.data) as { count?: number };
    return { count: Number(data?.count ?? 0) };
  },

  async registerDeviceToken(payload: RegisterNotificationDeviceTokenRequest): Promise<{ message: string }> {
    const response = await httpClient.post<{ message?: string } | ApiResponse<{ message?: string }>>(
      API_ENDPOINTS.notifications.registerDeviceToken,
      payload,
    );
    const data = unwrapApiData(response.data) as { message?: string };
    return { message: String(data?.message ?? "") };
  },

  async unregisterDeviceToken(token: string): Promise<{ message: string }> {
    const response = await httpClient.delete<{ message?: string } | ApiResponse<{ message?: string }>>(
      API_ENDPOINTS.notifications.unregisterDeviceToken(token),
    );
    const data = unwrapApiData(response.data) as { message?: string };
    return { message: String(data?.message ?? "") };
  },
};
