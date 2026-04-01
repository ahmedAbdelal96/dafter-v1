/**
 * Users Screen — إدارة المستخدمين
 *
 * Layout:
 *   ┌── Sky Header ──────────────────────────────────────────────────┐
 *   │  إدارة المستخدمين    [+ إضافة مستخدم]                        │
 *   │  Stats strip: الكل | نشط | معطّل                              │
 *   └────────────────────────────────────────────────────────────────┘
 *   Search bar
 *   FlatList of UserCard rows
 *
 * Access:
 *   - OWNER: full access — create, view, edit, disable/enable, permissions
 *   - STAFF[manageUsers]: view list only (no create/disable buttons shown)
 *
 * Business rules enforced by backend:
 *   - Cannot disable last active OWNER
 *   - Cannot modify OWNER permissions
 *   - User quota gate on create + enable (403 EntitlementError)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useAuth } from '@/stores/auth-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useUsers, useUserStats } from '@/features/users/hooks/useUsers';
import UserCard from '@/features/users/components/UserCard';
import { UserSkeleton } from '@/features/users/components/UserSkeleton';
import UserForm from '@/features/users/components/UserForm';
import UserDetailSheet from '@/features/users/components/UserDetailSheet';
import { USERS_ACCENT, type User, type UserStatus } from '@/features/users/types';

type StatusFilter = 'all' | UserStatus;

export default function UsersScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('users');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // Determine if current user is OWNER (only OWNER sees add/disable buttons)
  const { user: authUser } = useAuth();
  const isOwner = authUser?.role === 'OWNER';

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ── Pagination ──────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<User[]>([]);

  // ── Debounce search ───────────────────────────────────────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
      setAllItems([]);
    }, 300);
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };
  const { data, isLoading, isFetching, refetch } = useUsers(queryParams);
  const { data: stats } = useUserStats();

  const total = data?.meta.total ?? 0;

  // Accumulate pages
  useEffect(() => {
    if (data?.data) {
      setAllItems((prev) =>
        page === 1 ? data.data : [...prev, ...data.data],
      );
    }
  }, [data, page]);

  // Reset when filter changes
  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [statusFilter, debouncedSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCardPress = useCallback((user: User) => {
    setSelectedUser(user);
  }, []);

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

  const handleEditFromDetail = useCallback((user: User) => {
    setSelectedUser(null);
    setTimeout(() => setEditingUser(user), 200);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  const STATUS_FILTERS: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: t('filter.all'), count: stats?.total },
    { key: 'ACTIVE', label: t('filter.active'), count: stats?.active },
    { key: 'DISABLED', label: t('filter.disabled'), count: stats?.disabled },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <View
          style={[
            styles.headerRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('title')}
          </ZText>

          {isOwner && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowCreateForm(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={16} color="#fff" />
              <ZText size="xs" weight="bold" style={{ color: '#fff' }}>
                {t('form.create')}
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
        {STATUS_FILTERS.map(({ key, label, count }) => {
          const isActive = statusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterTab,
                isActive && { borderBottomColor: USERS_ACCENT, borderBottomWidth: 2 },
              ]}
              onPress={() => setStatusFilter(key)}
              activeOpacity={0.75}
            >
              <ZText
                size="sm"
                weight={isActive ? 'bold' : 'regular'}
                style={{ color: isActive ? USERS_ACCENT : palette.textMuted }}
              >
                {label}
              </ZText>
              {count !== undefined && count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    {
                      backgroundColor: isActive
                        ? USERS_ACCENT
                        : isDark
                          ? Colors.dark.surfaceTertiary
                          : '#f3f4f6',
                    },
                  ]}
                >
                  <ZText
                    size="xs"
                    weight="bold"
                    style={{
                      color: isActive ? '#fff' : palette.textMuted,
                      fontSize: 10,
                    }}
                  >
                    {count}
                  </ZText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Search bar ── */}
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: isDark ? Colors.dark.surface : '#fff',
            borderBottomColor: palette.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f3f4f6',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={palette.textMuted} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: palette.text,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={palette.textMuted}
            value={searchText}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={16} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ── */}
      {isLoading && page === 1 ? (
        <UserSkeleton count={7} />
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
              tintColor={USERS_ACCENT}
              colors={[USERS_ACCENT]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={56}
                color={palette.textMuted}
              />
              <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                {debouncedSearch
                  ? t('list.emptySearch')
                  : t('list.empty')}
              </ZText>
              <ZText
                variant="secondary"
                size="sm"
                style={{ textAlign: 'center' }}
              >
                {debouncedSearch
                  ? t('list.emptySearchDesc')
                  : t('list.emptyDesc')}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={{ padding: Spacing[4], alignItems: 'center' }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={USERS_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Modals ── */}
      <UserForm
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />

      <UserForm
        visible={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser ?? undefined}
      />

      <UserDetailSheet
        user={selectedUser}
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onEditPress={handleEditFromDetail}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: USERS_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Filter strip
  filterStrip: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing[4],
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1.5],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    marginEnd: Spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },

  // Search
  searchWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
  },
  searchBox: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignItems: 'center',
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
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
