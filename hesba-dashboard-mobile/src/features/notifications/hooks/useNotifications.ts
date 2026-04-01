// ─── Notifications Query Hooks ────────────────────────────────────────────────
// Architecture: polling-based (no WebSocket)
//   - Unread count: auto-refetch every 30s + on focus
//   - Notification list: refetch on focus + pull-to-refresh

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { notificationsApi } from '../api/notifications.api';
import type { NotificationsQuery } from '../types';

/**
 * Polls unread count every 30 seconds.
 * Used in menu badge and screen header.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: QUERY_KEYS.UNREAD_COUNT,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30 * 1000, // poll every 30s
    refetchIntervalInBackground: false, // stop polling when app is backgrounded
    staleTime: 10 * 1000, // consider fresh for 10s
  });
}

/**
 * Paginated notifications list.
 * Does NOT auto-poll — consumer does pull-to-refresh.
 */
export function useNotificationsList(params?: NotificationsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATIONS, params ?? {}],
    queryFn: () => notificationsApi.list(params),
    staleTime: 0, // always re-fetch when key changes
  });
}
