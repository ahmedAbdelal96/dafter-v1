/**
 * Expenses Screen — المصروفات
 *
 * Layout:
 *   ┌── Amber Header ─────────────────────────────────────────────┐
 *   │  المصروفات  [count]  [+ Add]                                │
 *   │  [Search input]                                             │
 *   └─────────────────────────────────────────────────────────────┘
 *   FlatList:
 *     ListHeaderComponent:
 *       - SummaryCard (total + category breakdown)
 *       - Category filter chips (horizontal scroll)
 *     ExpenseCard rows
 *
 * - isFirstRender ref prevents debounce from clearing cached data on mount
 * - hasNext from server prevents infinite pagination loop
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
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useListExpenses, useExpensesSummary } from '@/features/expenses/hooks/useExpenses';
import ExpenseCard from '@/features/expenses/components/ExpenseCard';
import { ExpenseSkeleton } from '@/features/expenses/components/ExpenseSkeleton';
import { ExpenseDetail } from '@/features/expenses/components/ExpenseDetail';
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm';
import { SummaryCard } from '@/features/expenses/components/SummaryCard';
import {
  ALL_CATEGORIES,
  CATEGORY_CONFIG,
  EXPENSE_ACCENT,
  type Expense,
  type ExpenseCategory,
} from '@/features/expenses/types';

const PAGE_SIZE = 20;

export default function ExpensesScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('expenses');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Expense[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ── Debounced search (skip initial mount) ──────────────────────────────────
  useEffect(() => {
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

  function handleCategoryChange(cat: ExpenseCategory | null) {
    setActiveCategory(cat);
    setPage(1);
    setAllItems([]);
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeCategory ? { category: activeCategory } : {}),
  };

  const { data, isLoading, isFetching, refetch, isError } = useListExpenses(queryParams);
  // Summary uses no filters — always shows overall totals
  const { data: summary, isLoading: summaryLoading } = useExpensesSummary();

  // ── Accumulate pages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
  }, [data, page]);

  const totalCount = data?.meta?.total ?? 0;
  const hasMore = data?.meta?.hasNext ?? false;

  function handleLoadMore() {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }

  function handleRefresh() {
    setPage(1);
    setAllItems([]);
    refetch();
  }

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => (
      <ExpenseCard item={item} onPress={setSelectedId} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Expense) => item.id, []);

  // ── List header: summary + category chips ─────────────────────────────────
  const ListHeader = (
    <View>
      <SummaryCard summary={summary} isLoading={summaryLoading} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.chipScroll,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {/* "All" chip */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: activeCategory === null ? EXPENSE_ACCENT : (isDark ? Colors.dark.surfaceSecondary : '#f1f5f9'),
              borderColor: activeCategory === null ? EXPENSE_ACCENT : palette.border,
            },
          ]}
          onPress={() => handleCategoryChange(null)}
          activeOpacity={0.75}
        >
          <ZText
            size="xs"
            weight={activeCategory === null ? 'bold' : 'regular'}
            style={{ color: activeCategory === null ? '#fff' : palette.textSecondary }}
          >
            {t('filter.allCategories')}
          </ZText>
        </TouchableOpacity>

        {ALL_CATEGORIES.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? cfg.color : `${cfg.color}15`,
                  borderColor: isActive ? cfg.color : 'transparent',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => handleCategoryChange(cat)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={11}
                color={isActive ? '#fff' : cfg.color}
              />
              <ZText
                size="xs"
                weight={isActive ? 'bold' : 'regular'}
                style={{ color: isActive ? '#fff' : cfg.color }}
              >
                {t(`category.${cat}`)}
              </ZText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Error fallback ────────────────────────────────────────────────────────
  if (isError && allItems.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <ScreenHeader
          insets={insets}
          count={0}
          isRTL={isRTL}
          search={search}
          onSearchChange={setSearch}
          onAdd={() => setShowCreate(true)}
          t={t}
        />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.textMuted} />
          <ZText variant="secondary" style={{ textAlign: 'center' }}>
            {t('errors.loadFailed')}
          </ZText>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <ZText style={{ color: EXPENSE_ACCENT }}>{t('errors.retry')}</ZText>
          </TouchableOpacity>
        </View>
        <ExpenseForm visible={showCreate} onClose={() => setShowCreate(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScreenHeader
        insets={insets}
        count={totalCount}
        isRTL={isRTL}
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setShowCreate(true)}
        t={t}
      />

      {isLoading && allItems.length === 0 ? (
        <ExpenseSkeleton />
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
              tintColor={EXPENSE_ACCENT}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="wallet-outline" size={56} color={palette.textMuted} />
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
                <ActivityIndicator color={EXPENSE_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      <ExpenseDetail
        visible={!!selectedId}
        expenseId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <ExpenseForm visible={showCreate} onClose={() => setShowCreate(false)} />
    </View>
  );
}

// ─── Header sub-component ─────────────────────────────────────────────────────

function ScreenHeader({
  insets,
  count,
  isRTL,
  search,
  onSearchChange,
  onAdd,
  t,
}: {
  insets: { top: number };
  count: number;
  isRTL: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onAdd: () => void;
  t: (k: string) => string;
}) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
      <View
        style={[
          styles.titleRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View
          style={[
            styles.titleLeft,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <ZText weight="bold" size="xl" style={styles.titleText}>
            {t('title')}
          </ZText>
          {count > 0 && (
            <View style={styles.countBadge}>
              <ZText size="xs" style={styles.countText}>
                {count}
              </ZText>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={t('list.searchPlaceholder')}
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
  flex: { flex: 1 },
  header: {
    backgroundColor: EXPENSE_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: { alignItems: 'center', gap: Spacing[2] },
  titleText: { color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: { color: '#fff', fontWeight: '700' },
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
  chipScroll: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  filterChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  list: { paddingBottom: Spacing[8] },
  emptyList: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
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
