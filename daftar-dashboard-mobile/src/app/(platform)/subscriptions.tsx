/**
 * Subscriptions Screen — Super Admin subscription lifecycle management.
 *
 * Layout:
 *   Header (violet) — title + total count badge
 *   Stats strip     — Active | Trial | Suspended counts
 *   Filter strip    — All | ACTIVE | TRIAL | SUSPENDED | EXPIRED
 *   Search bar      — by company name
 *   FlatList        — SubscriptionRow (company + plan + status + days left)
 *   CompanyDetailSheet — opened on tap (has Activate / Extend / Suspend forms)
 *
 * All subscription mutations live inside CompanyDetailSheet — no duplication needed.
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
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCompanies, usePlatformStats } from '@/features/platform/hooks/usePlatform';
import { SubscriptionRow } from '@/features/platform/components/SubscriptionRow';
import { CompanySkeleton } from '@/features/platform/components/CompanySkeleton';
import CompanyDetailSheet from '@/features/platform/components/CompanyDetailSheet';
import {
  PLATFORM_ACCENT,
  type Company,
  type SubscriptionStatus,
} from '@/features/platform/types';

type StatusFilter = 'all' | SubscriptionStatus;

const STATUS_TABS: StatusFilter[] = ['all', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];

// ─── Stats Strip ──────────────────────────────────────────────────────────────

interface StatChipProps {
  label: string;
  count: number;
  color: string;
  bg: string;
}

function StatChip({ label, count, color, bg }: StatChipProps) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <ZText size="lg" weight="bold" style={{ color }}>
        {count}
      </ZText>
      <ZText size="xs" style={{ color }} numberOfLines={1}>
        {label}
      </ZText>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Company[]>([]);

  // ── Debounce search ────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
      setAllItems([]);
    }, 300);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, refetch } = useCompanies({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    subscriptionStatus: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { stats } = usePlatformStats();
  const total = data?.meta?.total ?? 0;

  useEffect(() => {
    if (data?.data) {
      setAllItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
    }
  }, [data, page]);

  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [statusFilter, debouncedSearch]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRowPress = useCallback((company: Company) => {
    setSelectedCompany(company);
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

  const renderItem = useCallback(
    ({ item }: { item: Company }) => (
      <SubscriptionRow company={item} onPress={handleRowPress} />
    ),
    [handleRowPress],
  );

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('subscriptions.title')}
          </ZText>
          {total > 0 && (
            <View style={styles.countBadge}>
              <ZText size="xs" weight="bold" style={{ color: '#fff' }}>
                {total}
              </ZText>
            </View>
          )}
        </View>

        {/* Stats strip */}
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <StatChip
            label={t('stats.active')}
            count={stats.active}
            color="#16a34a"
            bg="rgba(255,255,255,0.15)"
          />
          <StatChip
            label={t('stats.trial')}
            count={stats.trial}
            color="#93c5fd"
            bg="rgba(255,255,255,0.12)"
          />
          <StatChip
            label={t('stats.suspended')}
            count={stats.suspended}
            color="#fca5a5"
            bg="rgba(255,255,255,0.12)"
          />
        </View>
      </View>

      {/* ── Filter strip ───────────────────────────────────────────────────── */}
      <View
        style={[
          styles.filterStrip,
          { backgroundColor: isDark ? Colors.dark.surface : '#fff', borderBottomColor: palette.border },
        ]}
      >
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(k) => k}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing[4] }}
          inverted={isRTL}
          renderItem={({ item: tab }) => {
            const isActive = statusFilter === tab;
            return (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  isActive && { borderBottomColor: PLATFORM_ACCENT, borderBottomWidth: 2 },
                ]}
                onPress={() => setStatusFilter(tab)}
                activeOpacity={0.75}
              >
                <ZText
                  size="sm"
                  weight={isActive ? 'bold' : 'regular'}
                  style={{ color: isActive ? PLATFORM_ACCENT : palette.textMuted }}
                >
                  {tab === 'all' ? t('filter.all') : t(`subStatus.${tab}`)}
                </ZText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: isDark ? Colors.dark.surface : '#fff', borderBottomColor: palette.border },
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
            style={[styles.searchInput, { color: palette.text, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('subscriptions.searchPlaceholder')}
            placeholderTextColor={palette.textMuted}
            value={searchText}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={16} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {isLoading && page === 1 ? (
        <CompanySkeleton count={7} />
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
              tintColor={PLATFORM_ACCENT}
              colors={[PLATFORM_ACCENT]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={56} color={palette.textMuted} />
              <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                {t('subscriptions.empty')}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={{ padding: Spacing[4], alignItems: 'center' }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={PLATFORM_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Detail sheet (has all action forms) ────────────────────────────── */}
      <CompanyDetailSheet
        company={selectedCompany}
        visible={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    backgroundColor: PLATFORM_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerRow: { alignItems: 'center', gap: Spacing[2] },
  headerTitle: { color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    minWidth: 24,
    alignItems: 'center',
  },

  statsRow: {
    gap: Spacing[2],
  },
  statChip: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
    gap: 2,
  },

  filterStrip: { borderBottomWidth: 1 },
  filterTab: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    marginEnd: Spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

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
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  list: { paddingTop: Spacing[3], paddingBottom: Spacing[8] },
  emptyList: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
});
