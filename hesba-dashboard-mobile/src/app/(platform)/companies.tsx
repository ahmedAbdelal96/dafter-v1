/**
 * Companies Screen — tenant management for Super Admin.
 *
 * Filter strip: All | Active | Trial | Suspended | Expired
 * Search: by name or phone
 * Tap card → CompanyDetailSheet (subscriptions, metrics, actions)
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useCompanies } from '@/features/platform/hooks/usePlatform';
import CompanyCard from '@/features/platform/components/CompanyCard';
import { CompanySkeleton } from '@/features/platform/components/CompanySkeleton';
import CompanyDetailSheet from '@/features/platform/components/CompanyDetailSheet';
import CreateCompanySheet from '@/features/platform/components/CreateCompanySheet';
import {
  PLATFORM_ACCENT,
  type Company,
  getActiveSubscription,
  type SubscriptionStatus,
} from '@/features/platform/types';

type StatusFilter = 'all' | SubscriptionStatus;

const STATUS_TABS: StatusFilter[] = ['all', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];

function getCompanyPriority(company: Company) {
  const subscription = getActiveSubscription(company);
  if (company.isDeleted) return 0;
  if (!company.isActive) return 1;
  if (!subscription) return 2;
  if (subscription.status === 'SUSPENDED') return 3;
  if (subscription.status === 'EXPIRED') return 4;
  if (subscription.status === 'TRIAL') return 5;
  return 6;
}

export default function CompaniesScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── State ────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Company[]>([]);

  // ── Debounce ─────────────────────────────────────────────────────────────
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

  // ── Data ─────────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    subscriptionStatus: statusFilter !== 'all' ? statusFilter : undefined,
  };
  const { data, isLoading, isFetching, isError, error, refetch } = useCompanies(queryParams);
  const total = data?.meta.total ?? 0;
  const prioritizedItems = useMemo(
    () => [...allItems].sort((a, b) => getCompanyPriority(a) - getCompanyPriority(b)),
    [allItems],
  );

  useEffect(() => {
    if (data?.data) {
      setAllItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
    }
  }, [data, page]);

  useEffect(() => {
    setPage(1);
    setAllItems([]);
  }, [statusFilter, debouncedSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCardPress = useCallback((company: Company) => {
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
      <CompanyCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="xl" style={[styles.headerTitle, { flex: 1 }]}>
            {t('companies.title')}
          </ZText>
          {total > 0 && (
            <View style={styles.countBadge}>
              <ZText size="xs" weight="bold" style={{ color: '#fff' }}>{total}</ZText>
            </View>
          )}
          {/* Add company button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter strip */}
      <View
        style={[
          styles.filterStrip,
          {
            backgroundColor: isDark ? Colors.dark.surface : '#fff',
            borderBottomColor: palette.border,
          },
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

      {/* Search */}
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
            style={[styles.searchInput, { color: palette.text, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('companies.searchPlaceholder')}
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

      {/* List */}
      {isLoading && page === 1 ? (
        <CompanySkeleton count={7} />
      ) : isError && page === 1 ? (
        <View style={styles.errorState}>
          <Ionicons name="refresh-circle-outline" size={56} color={PLATFORM_ACCENT} />
          <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
            {t('companies.retryTitle', { defaultValue: 'Could not load companies' })}
          </ZText>
          <ZText variant="secondary" style={{ textAlign: 'center' }}>
            {error instanceof Error
              ? error.message
              : t('companies.retryDescription', {
                  defaultValue: 'Pull to refresh or retry now to request the latest company list again.',
                })}
          </ZText>
          <TouchableOpacity style={styles.emptyPrimaryBtn} onPress={() => refetch()}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <ZText weight="bold" style={{ color: '#fff' }}>
              {t('companies.retryCta', { defaultValue: 'Retry' })}
            </ZText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={prioritizedItems}
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
              <Ionicons name="business-outline" size={56} color={palette.textMuted} />
              <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                {t('companies.empty')}
              </ZText>
              <ZText variant="secondary" style={{ textAlign: 'center' }}>
                {searchText || statusFilter !== 'all'
                  ? t('companies.emptyRefine', { defaultValue: 'Try resetting filters or searching for another company.' })
                  : t('companies.emptyStart', { defaultValue: 'Create the first company to start managing tenants from mobile.' })}
              </ZText>
              <ZText size="xs" style={{ color: PLATFORM_ACCENT, textAlign: 'center' }}>
                {t('companies.priorityHint', {
                  defaultValue: 'Suspended, expired, inactive, and archived companies are surfaced first when they need attention.',
                })}
              </ZText>
              <View style={[styles.emptyActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {(searchText || statusFilter !== 'all') && (
                  <TouchableOpacity
                    style={[styles.emptySecondaryBtn, { borderColor: palette.border }]}
                    onPress={() => {
                      setSearchText('');
                      setDebouncedSearch('');
                      setStatusFilter('all');
                      setPage(1);
                      setAllItems([]);
                    }}
                  >
                    <ZText weight="bold" style={{ color: palette.text }}>
                      {t('filter.all', { defaultValue: 'All' })}
                    </ZText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.emptyPrimaryBtn}
                  onPress={() => setShowCreate(true)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <ZText weight="bold" style={{ color: '#fff' }}>
                    {t('companies.createCta', { defaultValue: 'Create company' })}
                  </ZText>
                </TouchableOpacity>
              </View>
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

      <CompanyDetailSheet
        company={selectedCompany}
        visible={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />

      <CreateCompanySheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setPage(1); setAllItems([]); }}
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
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterStrip: {
    borderBottomWidth: 1,
  },
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
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  emptyActions: {
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: PLATFORM_ACCENT,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  emptySecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
});
