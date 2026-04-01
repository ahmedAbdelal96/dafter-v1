/**
 * Customers Screen (العملاء)
 *
 * Layout:
 *   ┌── Blue Header ────────────────────────────────────────────────┐
 *   │  العملاء  [count badge]  [+ Add]                             │
 *   │  [Search input]                                               │
 *   └── FlatList of CustomerCard ───────────────────────────────────┘
 *
 * - Search: 350ms debounce
 * - Pagination: PAGE_SIZE=20, accumulates in allItems state
 * - Tap card → CustomerDetail modal
 * - + button → CustomerForm (create) modal
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import CustomerCard from '@/features/customers/components/CustomerCard';
import { CustomerSkeleton } from '@/features/customers/components/CustomerSkeleton';
import { CustomerDetail } from '@/features/customers/components/CustomerDetail';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { useListCustomers } from '@/features/customers/hooks/useCustomers';
import { CUSTOMER_ACCENT, type Customer } from '@/features/customers/types';

const PAGE_SIZE = 20;

export default function CustomersScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── State ───────────────────────────────────────────────────────────────────
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                       = useState(1);
  const [allItems, setAllItems]               = useState<Customer[]>([]);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [showCreate, setShowCreate]           = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip on initial mount — avoids clearing allItems 350ms after data loads from cache
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllItems([]);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // ── Query ───────────────────────────────────────────────────────────────────
  const query = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };
  const { data, isLoading, isFetching, refetch, isError } = useListCustomers(query);

  // ── Accumulate pages ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
  }, [data, page]);

  const totalCount = data?.meta?.total ?? 0;
  // Use hasNext from server — prevents infinite loop when page is out of range
  const hasMore    = data?.meta?.hasNext ?? false;

  function handleLoadMore() {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }

  function handleRefresh() {
    setPage(1);
    setAllItems([]);
    refetch();
  }

  const renderItem = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerCard item={item} onPress={setSelectedId} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Customer) => item.id, []);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError && allItems.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <Header
          title={t('title')}
          count={0}
          isRTL={isRTL}
          insets={insets}
          onAdd={() => setShowCreate(true)}
          search={search}
          onSearchChange={setSearch}
          t={t}
        />
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.textMuted} />
          <ZText variant="secondary" style={{ textAlign: 'center' }}>
            {t('errors.loadFailed')}
          </ZText>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <ZText style={{ color: CUSTOMER_ACCENT }}>{t('errors.retry')}</ZText>
          </TouchableOpacity>
        </View>
        <CustomerForm visible={showCreate} onClose={() => setShowCreate(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <Header
        title={t('title')}
        count={totalCount}
        isRTL={isRTL}
        insets={insets}
        onAdd={() => setShowCreate(true)}
        search={search}
        onSearchChange={setSearch}
        t={t}
      />

      {/* List */}
      {isLoading && allItems.length === 0 ? (
        <CustomerSkeleton />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            allItems.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor={CUSTOMER_ACCENT}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Ionicons name="people-outline" size={56} color={palette.textMuted} />
              <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                {t('list.empty')}
              </ZText>
              <ZText variant="secondary" size="sm" style={{ textAlign: 'center' }}>
                {t('list.emptyDesc')}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={CUSTOMER_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* Detail modal */}
      <CustomerDetail
        visible={!!selectedId}
        customerId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Create modal */}
      <CustomerForm
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </View>
  );
}

// ─── Header sub-component ──────────────────────────────────────────────────────

function Header({
  title,
  count,
  isRTL,
  insets,
  onAdd,
  search,
  onSearchChange,
  t,
}: {
  title: string;
  count: number;
  isRTL: boolean;
  insets: { top: number };
  onAdd: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  t: (key: string) => string;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.header, { 
      paddingTop: Math.max(insets.top, Spacing[4]) + Spacing[2],
      backgroundColor: isDark ? Colors.dark.surface : Colors.white,
      borderBottomColor: palette.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    }]}>
      {/* Title row */}
      <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="2xl" style={{ color: palette.text }}>
            {title}
          </ZText>
          {count > 0 && (
            <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(31, 122, 90, 0.15)' : 'rgba(31, 122, 90, 0.08)' }]}>
              <ZText size="xs" style={{ color: Colors.brand.primary, fontWeight: '700' }}>
                {count}
              </ZText>
            </View>
          )}
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.brand.primary }]} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchRow,
          { 
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: isDark ? Colors.dark.surfaceSecondary : "#F1F5F9",
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={palette.textMuted} />
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left', color: palette.text }]}
          placeholder={t('list.searchPlaceholder')}
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} activeOpacity={0.75} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[4],
  },
  headerTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchRow: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Platform.OS === 'ios' ? Spacing[3] : 0,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'android' ? Spacing[3] : 0,
  },
  list: {
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[6],
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  footerLoader: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
});
