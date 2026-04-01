// ─── Notifications API ────────────────────────────────────────────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Notification,
  NotificationsListResponse,
  UnreadCountResponse,
  NotificationsQuery,
  RegisterDeviceTokenDto,
} from '../types';

export const notificationsApi = {
  /** GET /notifications?page&limit&onlyUnread */
  list: async (params?: NotificationsQuery): Promise<NotificationsListResponse> => {
    const res = await apiClient.get<{ data: NotificationsListResponse }>(
      API_ENDPOINTS.notifications.list,
      { params },
    );
    return res.data.data;
  },

  /** GET /notifications/unread-count → { count: number } */
  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<{ data: UnreadCountResponse }>(
      API_ENDPOINTS.notifications.unreadCount,
    );
    return res.data.data.count;
  },

  /** PATCH /notifications/:id/read — mark single notification read */
  markRead: async (id: string): Promise<Notification> => {
    const res = await apiClient.patch<{ data: Notification }>(
      API_ENDPOINTS.notifications.markRead(id),
    );
    return res.data.data;
  },

  /** PATCH /notifications/read-all — mark all notifications read */
  markAllRead: async (): Promise<number> => {
    const res = await apiClient.patch<{ data: { count: number } }>(
      API_ENDPOINTS.notifications.markAllRead,
    );
    return res.data.data.count;
  },

  /** POST /notifications/device-token — register Expo push token */
  registerDeviceToken: async (dto: RegisterDeviceTokenDto): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.notifications.registerToken, dto);
  },

  /** DELETE /notifications/device-token/:token — unregister on logout */
  unregisterDeviceToken: async (token: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.notifications.unregisterToken(token));
  },
};
