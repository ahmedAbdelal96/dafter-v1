/**
 * Installments Screen (بيع بالتقسيط)
 *
 * Layout:
 *   ┌── Green Header ──────────────────────────────────────────────┐
 *   │  [Back]  بيع بالتقسيط  [count badge]  [+ Add]              │
 *   │  [Search input]                                              │
 *   ├── Status Filter chips (horizontal scroll) ───────────────────┤
 *   └── FlatList of ContractCard                                   ┘
 *
 * - Status filter chips: ALL / ACTIVE / OVERDUE / COMPLETED / CANCELLED / DEFAULTED
 * - Search: 350ms debounce
 * - Pagination: PAGE_SIZE=15, accumulates in allItems state
 * - Taps: open ContractDetail modal
 * - FAB-style add button: open CreateContractForm modal
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
import ContractCard from '@/features/installments/components/ContractCard';
import { InstallmentsSkeleton } from '@/features/installments/components/InstallmentsSkeleton';
import { ContractDetail } from '@/features/installments/components/ContractDetail';
import { CreateContractForm } from '@/features/installments/components/CreateContractForm';
import { useListInstallments } from '@/features/installments/hooks/useInstallments';
import {
  CONTRACT_STATUS_FILTERS,
  INSTALLMENT_ACCENT,
  INSTALLMENT_ACCENT_LIGHT,
  type ContractStatusFilter,
  type InstallmentContract,
  type InstallmentStatus,
} from '@/features/installments/types';

const PAGE_SIZE = 15;

export default function InstallmentsScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('installments');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── State ────────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>('ALL');
  const [page, setPage]               = useState(1);
  const [allItems, setAllItems]       = useState<InstallmentContract[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
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

  // ── Reset on filter change ────────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [statusFilter]);

  // ── Query ─────────────────────────────────────────────────────────────────
  const query = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter as InstallmentStatus } : {}),
  };
  const { data, isLoading, isFetching, refetch, isError } = useListInstallments(query);

  // ── Accumulate pages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
  }, [data, page]);

  const totalCount = data?.meta.total ?? 0;
  const hasMore    = allItems.length < totalCount;

  function handleLoadMore() {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }

  function handleRefresh() {
    setPage(1);
    setAllItems([]);
    refetch();
  }

  const renderItem = useCallback(
    ({ item }: { item: InstallmentContract }) => (
      <ContractCard item={item} onPress={setSelectedId} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: InstallmentContract) => item.id, []);

  // ── Error state ───────────────────────────────────────────────────────────
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
            {t('error.createFailed')}
          </ZText>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <ZText style={{ color: INSTALLMENT_ACCENT }}>{t('error.createFailed')}</ZText>
          </TouchableOpacity>
        </View>
        <CreateContractForm
          visible={showCreate}
          onClose={() => setShowCreate(false)}
        />
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

      {/* Status filter chips */}
      <FlatList
        horizontal
        data={CONTRACT_STATUS_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.chipsContainer,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        style={[styles.chipsBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}
        renderItem={({ item: status }) => {
          const active = statusFilter === status;
          return (
            <TouchableOpacity
              onPress={() => setStatusFilter(status)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? INSTALLMENT_ACCENT : palette.surfaceSecondary,
                  borderColor: active ? INSTALLMENT_ACCENT : palette.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <ZText
                size="sm"
                style={{ color: active ? '#fff' : palette.textSecondary, fontWeight: active ? '600' : '400' }}
              >
                {t(`filter.${status}`)}
              </ZText>
            </TouchableOpacity>
          );
        }}
      />

      {/* List */}
      {isLoading && allItems.length === 0 ? (
        <InstallmentsSkeleton />
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
              tintColor={INSTALLMENT_ACCENT}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Ionicons name="calendar-number-outline" size={56} color={palette.textMuted} />
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
                <ActivityIndicator color={INSTALLMENT_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* Detail modal */}
      <ContractDetail
        visible={!!selectedId}
        contractId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Create modal */}
      <CreateContractForm
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </View>
  );
}

// ─── Header sub-component ─────────────────────────────────────────────────────

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
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
      {/* Title row */}
      <View
        style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {title}
          </ZText>
          {count > 0 && (
            <View style={styles.countBadge}>
              <ZText size="xs" style={styles.countText}>{count}</ZText>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[styles.searchRow, { flexDirection: isRTL ? 'row-reverse' : 'row', direction: isRTL ? 'rtl' : 'ltr' }]}
      >
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} activeOpacity={0.75}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: INSTALLMENT_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerTitle: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Platform.OS === 'ios' ? Spacing[2] : 0,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: Platform.OS === 'android' ? Spacing[2] : 0,
  },
  chipsBar: {
    borderBottomWidth: 1,
  },
  chipsContainer: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  list: {
    paddingTop: Spacing[3],
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
