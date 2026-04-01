import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../services/notifications";
import { notificationsKeys } from "./query-keys";
import { NOTIFICATIONS_CACHE } from "./config";
import type { NotificationFilters, RegisterNotificationDeviceTokenRequest } from "../types";

export function useNotifications(filters?: NotificationFilters, enabled = true) {
  return useQuery({
    queryKey: notificationsKeys.list(filters),
    queryFn: () => notificationsApi.getAll(filters),
    staleTime: NOTIFICATIONS_CACHE.list.staleTime,
    gcTime: NOTIFICATIONS_CACHE.list.gcTime,
    enabled,
  });
}

export function useUnreadNotificationsCount(enabled = true) {
  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: NOTIFICATIONS_CACHE.stats.staleTime,
    gcTime: NOTIFICATIONS_CACHE.stats.gcTime,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount() });
    },
  });
}

export function useRegisterNotificationDeviceToken() {
  return useMutation({
    mutationFn: (payload: RegisterNotificationDeviceTokenRequest) =>
      notificationsApi.registerDeviceToken(payload),
  });
}

export function useUnregisterNotificationDeviceToken() {
  return useMutation({
    mutationFn: (token: string) => notificationsApi.unregisterDeviceToken(token),
  });
}

