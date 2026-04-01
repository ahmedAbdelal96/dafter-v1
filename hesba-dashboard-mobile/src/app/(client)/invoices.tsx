/**
 * Invoices Screen — الفواتير
 *
 * Layout:
 *   ┌── Indigo Header ─────────────────────────────────────────────┐
 *   │  الفواتير  [count]  [+ New]                                  │
 *   │  [Search input]                                              │
 *   └──────────────────────────────────────────────────────────────┘
 *   Status filter chips (horizontal scroll)
 *   FlatList: InvoiceCard rows
 *
 * Modals:
 *   - InvoiceDetail (tap card)
 *   - CreateInvoiceForm (tap + New)
 *
 * - isFirstRender ref prevents debounce from clearing cached data on mount
 * - hasNext from server guards infinite pagination
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
import { useLocalSearchParams } from 'expo-router';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useListInvoices } from '@/features/invoices/hooks/useInvoices';
import { InvoiceCard } from '@/features/invoices/components/InvoiceCard';
import { InvoiceSkeleton } from '@/features/invoices/components/InvoiceSkeleton';
import { InvoiceDetail } from '@/features/invoices/components/InvoiceDetail';
import { CreateInvoiceForm } from '@/features/invoices/components/CreateInvoiceForm';
import {
  ALL_STATUSES,
  INVOICE_ACCENT,
  STATUS_CONFIG,
  type InvoiceListItem,
  type InvoiceStatus,
  type InvoicePaymentStatus,
} from '@/features/invoices/types';

// ALL_STATUSES now = DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | CANCELLED

const PAGE_SIZE = 20;
const ALL_PAYMENT_STATUSES: InvoicePaymentStatus[] = ['UNPAID', 'PARTIAL', 'PAID'];
const PAYMENT_STATUS_CONFIG: Record<InvoicePaymentStatus, { color: string; bg: string }> = {
  UNPAID:  { color: '#dc2626', bg: '#fee2e2' },
  PARTIAL: { color: '#d97706', bg: '#fffbeb' },
  PAID:    { color: '#16a34a', bg: '#dcfce7' },
};

export default function InvoicesScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;
  const params = useLocalSearchParams<{
    preselectedCustomerId?: string;
    preselectedCustomerName?: string;
  }>();

  // ── State ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | null>(null);
  const [activePaymentStatus, setActivePaymentStatus] = useState<InvoicePaymentStatus | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState(
    params.preselectedCustomerId
      ? { id: params.preselectedCustomerId, name: params.preselectedCustomerName ?? '' }
      : null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<InvoiceListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Open create form pre-filled if navigated from customer detail
  useEffect(() => {
    if (params.preselectedCustomerId) {
      setShowCreate(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced search (skip initial mount) ────────────────────────────────
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

  function resetPagination() {
    setPage(1);
    setAllItems([]);
  }

  function handleStatusChange(status: InvoiceStatus | null) {
    setActiveStatus(status);
    resetPagination();
  }

  function handlePaymentStatusChange(ps: InvoicePaymentStatus | null) {
    setActivePaymentStatus(ps);
    resetPagination();
  }

  function handleClearFilters() {
    setActivePaymentStatus(null);
    setDateFrom('');
    setDateTo('');
    setCustomerFilter(null);
    resetPagination();
  }

  const activeFilterCount =
    (activePaymentStatus ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (customerFilter ? 1 : 0);

  // ── Query ────────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeStatus ? { status: activeStatus } : {}),
    ...(activePaymentStatus ? { paymentStatus: activePaymentStatus } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(customerFilter ? { partyId: customerFilter.id, partyType: 'CUSTOMER' as const } : {}),
  };

  const { data, isLoading, isFetching, refetch, isError } =
    useListInvoices(queryParams);

  // ── Accumulate pages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) =>
      page === 1 ? data.items : [...prev, ...data.items],
    );
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
    ({ item }: { item: InvoiceListItem }) => (
      <InvoiceCard item={item} onPress={setSelectedId} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: InvoiceListItem) => item.id, []);

  // ── Status chips ─────────────────────────────────────────────────────────
  const StatusChips = (
    <View style={{ backgroundColor: isDark ? Colors.dark.surface : '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }}>
      {/* Row 1: Status filter */}
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
            styles.chip,
            {
              backgroundColor:
                activeStatus === null
                  ? INVOICE_ACCENT
                  : isDark
                  ? Colors.dark.surfaceSecondary
                  : '#f1f5f9',
              borderColor:
                activeStatus === null ? INVOICE_ACCENT : palette.border,
            },
          ]}
          onPress={() => handleStatusChange(null)}
          activeOpacity={0.75}
        >
          <ZText
            size="xs"
            weight={activeStatus === null ? 'bold' : 'regular'}
            style={{ color: activeStatus === null ? '#fff' : palette.textSecondary }}
          >
            {t('filter.allStatuses')}
          </ZText>
        </TouchableOpacity>

        {ALL_STATUSES.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const isActive = activeStatus === status;
          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? cfg.color : `${cfg.color}18`,
                  borderColor: isActive ? cfg.color : 'transparent',
                },
              ]}
              onPress={() => handleStatusChange(status)}
              activeOpacity={0.75}
            >
              <ZText
                size="xs"
                weight={isActive ? 'bold' : 'regular'}
                style={{ color: isActive ? '#fff' : cfg.color }}
              >
                {t(`status.${status}`)}
              </ZText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Row 2: Payment status filter + filter toggle */}
      <View
        style={[
          styles.filterRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.chipScrollSmall,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {ALL_PAYMENT_STATUSES.map((ps) => {
            const cfg = PAYMENT_STATUS_CONFIG[ps];
            const isActive = activePaymentStatus === ps;
            return (
              <TouchableOpacity
                key={ps}
                style={[
                  styles.chipSm,
                  {
                    backgroundColor: isActive ? cfg.color : cfg.bg,
                    borderColor: isActive ? cfg.color : 'transparent',
                  },
                ]}
                onPress={() => handlePaymentStatusChange(isActive ? null : ps)}
                activeOpacity={0.75}
              >
                <ZText
                  size="xs"
                  weight={isActive ? 'bold' : 'regular'}
                  style={{ color: isActive ? '#fff' : cfg.color }}
                >
                  {t(`paymentStatus.${ps}`)}
                </ZText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter panel toggle */}
        <TouchableOpacity
          style={[
            styles.filterToggleBtn,
            {
              backgroundColor: showFilters || activeFilterCount > 0
                ? `${INVOICE_ACCENT}18`
                : isDark ? Colors.dark.surfaceSecondary : '#f1f5f9',
              borderColor: activeFilterCount > 0 ? INVOICE_ACCENT : 'transparent',
            },
          ]}
          onPress={() => setShowFilters((v) => !v)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="options-outline"
            size={15}
            color={activeFilterCount > 0 ? INVOICE_ACCENT : palette.textSecondary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <ZText size="xs" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                {activeFilterCount}
              </ZText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable filter panel */}
      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc' }]}>
          {/* Customer filter */}
          <View style={[styles.filterField, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="person-outline" size={14} color={palette.textSecondary} />
            <TextInput
              style={[styles.filterInput, { color: palette.text, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
              value={customerFilter?.name ?? ''}
              onChangeText={(v) => {
                if (!v) { setCustomerFilter(null); resetPagination(); }
                else setCustomerFilter({ id: '', name: v });
              }}
              placeholder={t('filter.customerName')}
              placeholderTextColor={palette.textMuted}
            />
          </View>

          {/* Date range */}
          <View style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TextInput
              style={[styles.filterInput, styles.dateInput, { color: palette.text, borderColor: palette.border }]}
              value={dateFrom}
              onChangeText={(v) => { setDateFrom(v); resetPagination(); }}
              placeholder={t('filter.dateFrom')}
              placeholderTextColor={palette.textMuted}
            />
            <ZText variant="secondary" size="xs">→</ZText>
            <TextInput
              style={[styles.filterInput, styles.dateInput, { color: palette.text, borderColor: palette.border }]}
              value={dateTo}
              onChangeText={(v) => { setDateTo(v); resetPagination(); }}
              placeholder={t('filter.dateTo')}
              placeholderTextColor={palette.textMuted}
            />
          </View>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={handleClearFilters} style={styles.clearBtn} activeOpacity={0.75}>
              <ZText size="xs" style={{ color: '#dc2626' }}>
                {t('filter.clearAll')}
              </ZText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ── Error fallback ───────────────────────────────────────────────────────
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
        {StatusChips}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.textMuted} />
          <ZText variant="secondary" style={{ textAlign: 'center' }}>
            {t('errors.loadFailed')}
          </ZText>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <ZText style={{ color: INVOICE_ACCENT }}>{t('errors.retry')}</ZText>
          </TouchableOpacity>
        </View>
        <CreateInvoiceForm
          visible={showCreate}
          onClose={() => setShowCreate(false)}
        />
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
        <>
          {StatusChips}
          <InvoiceSkeleton />
        </>
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
              tintColor={INVOICE_ACCENT}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={StatusChips}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="receipt-outline"
                size={56}
                color={palette.textMuted}
              />
              <ZText
                weight="bold"
                style={{ color: palette.text, textAlign: 'center' }}
              >
                {t('list.empty')}
              </ZText>
              <ZText
                variant="secondary"
                size="sm"
                style={{ textAlign: 'center' }}
              >
                {t('list.emptyDesc')}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={INVOICE_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      <InvoiceDetail
        visible={!!selectedId}
        invoiceId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <CreateInvoiceForm
        visible={showCreate}
        onClose={() => setShowCreate(false)}
      />
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
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.header, { 
      paddingTop: Math.max(insets.top, Spacing[4]) + Spacing[2],
      backgroundColor: isDark ? Colors.dark.surface : Colors.white,
      borderBottomColor: palette.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    }]}>
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
          <ZText weight="bold" size="2xl" style={{ color: palette.text }}>
            {t('title')}
          </ZText>
          {count > 0 && (
            <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(31, 122, 90, 0.15)' : 'rgba(31, 122, 90, 0.08)' }]}>
              <ZText size="xs" style={{ color: Colors.brand.primary, fontWeight: '700' }}>
                {count}
              </ZText>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: Colors.brand.primary }]}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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
          style={[
            styles.searchInput,
            { 
              textAlign: isRTL ? 'right' : 'left',
              color: palette.text,
            },
          ]}
          placeholder={t('list.searchPlaceholder')}
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            activeOpacity={0.75}
            style={{ padding: 4 }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={palette.textMuted}
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
  header: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[4],
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: { alignItems: 'center', gap: Spacing[3] },
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
  chipScroll: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterRow: {
    alignItems: 'center',
    paddingRight: Spacing[3],
    paddingBottom: Spacing[2],
    gap: Spacing[2],
  },
  chipScrollSmall: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
  },
  chipSm: {
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterToggleBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: INVOICE_ACCENT,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  filterPanel: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  filterField: {
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  filterInput: {
    fontSize: 13,
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
  },
  dateRow: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[2],
    fontSize: 12,
    textAlign: 'center',
  },
  clearBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: Spacing[2],
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
