/**
 * Notifications Screen — الإشعارات
 *
 * Layout:
 *   ┌── Orange Header ─────────────────────────────────────────────┐
 *   │  الإشعارات  [unread badge]          [✓ تحديد الكل كمقروء]  │
 *   └──────────────────────────────────────────────────────────────┘
 *   Filter strip: الكل | غير المقروءة
 *   FlatList of NotificationCard rows
 *
 * Real-time simulation:
 *   - Unread count polls every 30s (in useUnreadCount hook)
 *   - List refetches on screen focus (useFocusEffect)
 *   - AppState listener: refetch when app returns to foreground
 *
 * UX:
 *   - Tapping a card marks it read instantly + invalidates count
 *   - "Mark all read" clears the entire unread queue
 *   - Filter toggle shows only unread (useful when count is high)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useNotificationsList, useUnreadCount } from '@/features/notifications/hooks/useNotifications';
import { useMarkRead, useMarkAllRead } from '@/features/notifications/hooks/useNotificationMutations';
import NotificationCard from '@/features/notifications/components/NotificationCard';
import { NotificationSkeleton } from '@/features/notifications/components/NotificationSkeleton';
import { NOTIF_ACCENT, type Notification } from '@/features/notifications/types';

type FilterMode = 'all' | 'unread';

export default function NotificationsScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('notifications');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Notification[]>([]);

  // ── Data ─────────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: 20,
    onlyUnread: filter === 'unread' ? true : undefined,
  };
  const { data, isLoading, isFetching, refetch } = useNotificationsList(queryParams);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();

  const total = data?.meta.total ?? 0;

  // Accumulate pages
  useEffect(() => {
    if (data?.data) {
      setAllItems((prev) =>
        page === 1 ? data.data : [...prev, ...data.data],
      );
    }
  }, [data, page]);

  // Reset pagination when filter changes
  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [filter]);

  // ── Refetch on screen focus ───────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setAllItems([]);
      refetch();
    }, [refetch]),
  );

  // ── Refetch when app returns to foreground ────────────────────────────────
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        setPage(1);
        setAllItems([]);
        refetch();
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [refetch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCardPress = useCallback((id: string) => {
    // Mark as read if currently unread
    const item = allItems.find((n) => n.id === id);
    if (item && item.readAt === null) {
      markReadMutation.mutate(id);
      // Optimistic UI: update local state immediately
      setAllItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
    }
  }, [allItems, markReadMutation]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => {
        setShowMarkAllConfirm(false);
        // Update all local items to read
        setAllItems((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
        );
      },
    });
  }, [markAllReadMutation]);

  const handleLoadMore = useCallback(() => {
    if (allItems.length < total && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [allItems.length, total, isFetching]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    setAllItems([]);
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  const hasUnread = unreadCount > 0;

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Title + badge */}
          <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ZText weight="bold" size="xl" style={styles.headerTitle}>
              {t('title')}
            </ZText>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <ZText size="xs" weight="bold" style={{ color: NOTIF_ACCENT }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </ZText>
              </View>
            )}
          </View>

          {/* Mark all read button — only when there are unread */}
          {hasUnread && (
            <TouchableOpacity
              style={[styles.markAllBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setShowMarkAllConfirm(true)}
              activeOpacity={0.8}
              disabled={markAllReadMutation.isPending}
            >
              <Ionicons name="checkmark-done-outline" size={16} color="rgba(255,255,255,0.9)" />
              <ZText size="xs" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {t('markAllRead')}
              </ZText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter strip ── */}
      <View
        style={[
          styles.filterStrip,
          {
            backgroundColor: isDark ? Colors.dark.surface : '#fff',
            borderBottomColor: palette.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {(['all', 'unread'] as FilterMode[]).map((mode) => {
          const isActive = filter === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.filterTab,
                isActive && { borderBottomWidth: 2, borderBottomColor: NOTIF_ACCENT },
              ]}
              onPress={() => setFilter(mode)}
              activeOpacity={0.75}
            >
              <ZText
                size="sm"
                weight={isActive ? 'bold' : 'regular'}
                style={{ color: isActive ? NOTIF_ACCENT : palette.textMuted }}
              >
                {mode === 'all' ? t('filter.all') : t('filter.unread')}
              </ZText>
              {mode === 'unread' && unreadCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: NOTIF_ACCENT }]}>
                  <ZText size="xs" weight="bold" style={{ color: '#fff', fontSize: 10 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </ZText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {isLoading && page === 1 ? (
        <NotificationSkeleton count={8} />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            allItems.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor={NOTIF_ACCENT}
              colors={[NOTIF_ACCENT]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={56}
                color={palette.textMuted}
              />
              <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                {filter === 'unread' ? t('list.emptyUnread') : t('list.empty')}
              </ZText>
              <ZText
                variant="secondary"
                size="sm"
                style={{ textAlign: 'center' }}
              >
                {filter === 'unread' ? t('list.emptyUnreadDesc') : t('list.emptyDesc')}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={{ padding: Spacing[4], alignItems: 'center' }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={NOTIF_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Mark all confirm dialog ── */}
      <ZConfirmDialog
        visible={showMarkAllConfirm}
        title={t('markAllRead')}
        message={t('markAllReadConfirm')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        onConfirm={handleMarkAllRead}
        onCancel={() => setShowMarkAllConfirm(false)}
        loading={markAllReadMutation.isPending}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: NOTIF_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerTitle: {
    color: '#fff',
  },
  unreadBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  markAllBtn: {
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  // Filter strip
  filterStrip: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing[4],
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    marginEnd: Spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },

  // List
  list: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  emptyList: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
});
