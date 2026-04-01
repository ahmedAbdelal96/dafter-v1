// ─── Notifications Mutation Hooks ─────────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { notificationsApi } from '../api/notifications.api';

/**
 * Mark a single notification as read.
 * Optimistically invalidates the list + count after success.
 */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.UNREAD_COUNT });
    },
  });
}

/**
 * Mark ALL unread notifications as read.
 */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.UNREAD_COUNT });
    },
  });
}
