/**
 * Deferred Sales Screen — بيع آجل
 *
 * Architecture:
 *   - Header (violet bg) with title, count badge, "+ New" button, search bar
 *   - Status filter chips: ALL | PENDING | PARTIAL | OVERDUE | PAID
 *   - FlatList of DeferredSaleCard (paginated, accumulating)
 *   - Tap card → DeferredSaleDetail modal (slide-up)
 *   - "+" button → CreateDeferredSaleForm modal
 *
 * Pagination:
 *   Load more on scroll end (append items).
 *   Reset page + items on filter/search change (via useEffect).
 *
 * Design:
 *   Violet accent (#7c3aed) — distinct from all other modules.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { EmptyState } from '@/components/common/EmptyState';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, Fonts, FontSize } from '@/constants/theme';
import { DeferredSaleCard } from '@/features/deferred-sales/components/DeferredSaleCard';
import { DeferredSaleDetail } from '@/features/deferred-sales/components/DeferredSaleDetail';
import { CreateDeferredSaleForm } from '@/features/deferred-sales/components/CreateDeferredSaleForm';
import { DeferredSalesSkeleton } from '@/features/deferred-sales/components/DeferredSalesSkeleton';
import { useListDeferredSales } from '@/features/deferred-sales/hooks/useDeferredSales';
import {
  STATUS_FILTERS,
  DEFERRED_ACCENT,
  DEFERRED_ACCENT_DARK,
  type DeferredSale,
  type StatusFilter,
  type DeferredSaleStatus,
} from '@/features/deferred-sales/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DeferredSalesScreen() {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const { t } = useTranslation('deferredSales');
  const palette = isDark ? Colors.dark : Colors.light;
  const fontMed = fontLocale === 'arabic' ? Fonts.arabic.medium : Fonts.latin.medium;
  const fontReg = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;

  // ── Filter / Search state ─────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<DeferredSale[]>([]);
  const isFirstPage = page === 1;

  // ── Modal state ───────────────────────────────────────────────────────────
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ── Build query params ────────────────────────────────────────────────────
  const query = {
    ...(statusFilter !== 'ALL' && { status: statusFilter as DeferredSaleStatus }),
    ...(debouncedSearch && { search: debouncedSearch }),
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, isError, refetch } = useListDeferredSales(query);

  // ── Accumulate pages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!data?.items) return;
    if (isFirstPage) {
      setAllItems(data.items);
    } else {
      setAllItems((prev) => {
        // Guard against duplicates on fast taps
        const existingIds = new Set(prev.map((s) => s.id));
        const newItems = data.items.filter((s) => !existingIds.has(s.id));
        return [...prev, ...newItems];
      });
    }
  }, [data?.items, isFirstPage]);

  // ── Reset on filter/search change ─────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [statusFilter, debouncedSearch]);

  // ── Search debounce ───────────────────────────────────────────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (!data || isFetching) return;
    const totalPages = Math.ceil(data.total / PAGE_SIZE);
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  }, [data, isFetching, page]);

  // ── Card press ────────────────────────────────────────────────────────────
  const handleCardPress = useCallback((sale: DeferredSale) => {
    setSelectedSaleId(sale.id);
  }, []);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: DeferredSale }) => (
      <DeferredSaleCard
        sale={item}
        onPress={handleCardPress}
      />
    ),
    [handleCardPress],
  );

  const keyExtractor = useCallback((item: DeferredSale) => item.id, []);

  // ── Footer spinner (loading more) ─────────────────────────────────────────
  const renderFooter = useCallback(() => {
    if (!isFetching || isFirstPage) return null;
    return (
      <View style={styles.footerSpinner}>
        <ActivityIndicator size="small" color={DEFERRED_ACCENT} />
      </View>
    );
  }, [isFetching, isFirstPage]);

  // ── Show skeleton on first load ───────────────────────────────────────────
  if (isLoading && isFirstPage) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <ScreenHeader
          title={t('list.title')}
          total={undefined}
          onAdd={() => setShowCreate(true)}
          searchText={searchText}
          onSearchChange={handleSearchChange}
          isRTL={isRTL}
          fontReg={fontReg}
        />
        <DeferredSalesSkeleton />
      </View>
    );
  }

  const total = data?.total ?? 0;
  const isEmpty = allItems.length === 0;

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <ScreenHeader
        title={t('list.title')}
        total={total}
        onAdd={() => setShowCreate(true)}
        searchText={searchText}
        onSearchChange={handleSearchChange}
        isRTL={isRTL}
        fontReg={fontReg}
      />

      {/* ── Status filter chips ─────────────────────────────────────────── */}
      <View
        style={[
          styles.filterBar,
          {
            backgroundColor: isDark ? Colors.dark.surface : Colors.white,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f}
          contentContainerStyle={[
            styles.filterChips,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          renderItem={({ item: filter }) => {
            const active = filter === statusFilter;
            return (
              <TouchableOpacity
                onPress={() => setStatusFilter(filter)}
                activeOpacity={0.75}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? DEFERRED_ACCENT : 'transparent',
                    borderColor: active ? DEFERRED_ACCENT : palette.border,
                  },
                ]}
              >
                <ZText
                  size="sm"
                  style={[
                    styles.chipText,
                    { fontFamily: fontMed },
                    { color: active ? '#fff' : palette.textSecondary },
                  ]}
                >
                  {filter === 'ALL' ? t('filter.all') : t(`filter.${filter}`)}
                </ZText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      {isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={40} color={palette.textMuted} />
          <ZText variant="secondary">{t('error.loadFailed')}</ZText>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <ZText style={{ color: DEFERRED_ACCENT, fontWeight: '600' }}>
              إعادة المحاولة
            </ZText>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <EmptyState
          icon="receipt-outline"
          title={t('list.empty')}
          description={t('list.emptyDesc')}
        />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          // Avoids content jumping when items are appended
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        />
      )}

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <DeferredSaleDetail
        visible={selectedSaleId !== null}
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
      />

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      <CreateDeferredSaleForm
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  title: string;
  total: number | undefined;
  onAdd: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  isRTL: boolean;
  fontReg: string;
}

function ScreenHeader({
  title,
  total,
  onAdd,
  searchText,
  onSearchChange,
  isRTL,
  fontReg,
}: ScreenHeaderProps) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: DEFERRED_ACCENT }]}>
      {/* Title row */}
      <View
        style={[
          styles.headerTopRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View
          style={[
            styles.titleGroup,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {title}
          </ZText>
          {total !== undefined && (
            <View style={styles.countBadge}>
              <ZText style={styles.countText}>{total}</ZText>
            </View>
          )}
        </View>

        {/* Add button */}
        <TouchableOpacity
          onPress={onAdd}
          style={styles.addBtn}
          activeOpacity={0.8}
          accessibilityLabel="إضافة بيع آجل جديد"
        >
          <Ionicons name="add" size={22} color={DEFERRED_ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.95)' },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={16}
          color={isDark ? 'rgba(255,255,255,0.6)' : '#9ca3af'}
        />
        <TextInput
          style={[
            styles.searchInput,
            {
              fontFamily: fontReg,
              color: isDark ? '#fff' : '#111827',
              textAlign: isRTL ? 'right' : 'left',
              direction: isRTL ? 'rtl' : 'ltr',
            } as any,
          ]}
          placeholder="بحث..."
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'}
          value={searchText}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Ionicons
              name="close-circle"
              size={16}
              color={isDark ? 'rgba(255,255,255,0.5)' : '#9ca3af'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Platform.OS === 'ios' ? Spacing[2.5] : Spacing[1.5],
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    padding: 0,
    margin: 0,
  },

  // Filter bar
  filterBar: {
    borderBottomWidth: 1,
  },
  filterChips: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
  },

  // List
  listContent: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[10],
  },
  footerSpinner: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
});
