import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/stores/locale-store';
import { useTheme } from '@/stores/theme-store';
import {
  usePlatformAuditLogs,
  usePlatformAuditLookups,
} from '@/features/platform/hooks/usePlatform';
import { PLATFORM_ACCENT, type PlatformAuditLogRecord } from '@/features/platform/types';

const PAGE_SIZE = 20;

export default function PlatformAuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const palette = isDark ? Colors.dark : Colors.light;

  const [search, setSearch] = useState('');
  const [action, setAction] = useState<string | undefined>(undefined);
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PlatformAuditLogRecord[]>([]);

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      action,
      entityType,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    }),
    [page, search, action, entityType],
  );

  const logsQuery = usePlatformAuditLogs(filters);
  const lookupsQuery = usePlatformAuditLookups({}, true);

  useEffect(() => {
    if (!logsQuery.data?.items) return;
    setItems((prev) => (page === 1 ? logsQuery.data.items : [...prev, ...logsQuery.data.items]));
  }, [logsQuery.data?.items, page]);

  const total = logsQuery.data?.meta.total ?? 0;
  const hasNext = logsQuery.data?.meta.hasNext ?? false;

  const onRefresh = () => {
    setPage(1);
    setItems([]);
    void logsQuery.refetch();
  };

  const onLoadMore = () => {
    if (logsQuery.isFetching || !hasNext) return;
    setPage((prev) => prev + 1);
  };

  const applyActionFilter = (next?: string) => {
    setAction(next);
    setPage(1);
    setItems([]);
  };

  const applyEntityTypeFilter = (next?: string) => {
    setEntityType(next);
    setPage(1);
    setItems([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <ZText size="xl" weight="bold" style={styles.headerTitle}>
          {t('auditLogs.title')}
        </ZText>
        <ZText size="xs" style={styles.headerSubtitle}>
          {t('auditLogs.subtitle')}
        </ZText>
      </View>

      <View style={[styles.searchWrap, { borderBottomColor: palette.border }]}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? Colors.dark.surface : '#fff',
              borderColor: palette.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={palette.textMuted} />
          <TextInput
            value={search}
            onChangeText={(next) => {
              setSearch(next);
              setPage(1);
              setItems([]);
            }}
            placeholder={t('auditLogs.searchPlaceholder')}
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.text, textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={{ maxHeight: 58 }}
      >
        <FilterChip
          label={t('auditLogs.filters.allActions')}
          active={!action}
          onPress={() => applyActionFilter(undefined)}
        />
        {(lookupsQuery.data?.actions ?? []).map((entry) => (
          <FilterChip
            key={`action-${entry}`}
            label={entry}
            active={action === entry}
            onPress={() => applyActionFilter(entry)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={{ maxHeight: 58 }}
      >
        <FilterChip
          label={t('auditLogs.filters.allEntities')}
          active={!entityType}
          onPress={() => applyEntityTypeFilter(undefined)}
        />
        {(lookupsQuery.data?.entityTypes ?? []).map((entry) => (
          <FilterChip
            key={`entity-${entry}`}
            label={entry}
            active={entityType === entry}
            onPress={() => applyEntityTypeFilter(entry)}
          />
        ))}
      </ScrollView>

      {logsQuery.isLoading && page === 1 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PLATFORM_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={logsQuery.isFetching && page === 1}
              onRefresh={onRefresh}
              tintColor={PLATFORM_ACCENT}
              colors={[PLATFORM_ACCENT]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={44} color={palette.textMuted} />
              <ZText style={{ color: palette.textMuted }}>{t('auditLogs.empty')}</ZText>
            </View>
          }
          ListHeaderComponent={
            <ZText size="xs" style={[styles.totalText, { color: palette.textMuted }]}>
              {t('auditLogs.total', { count: total })}
            </ZText>
          }
          ListFooterComponent={
            logsQuery.isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={PLATFORM_ACCENT} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: isDark ? Colors.dark.surface : '#fff',
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={[styles.rowTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ZText size="sm" weight="bold" style={{ color: palette.text }}>
                  {item.action}
                </ZText>
                <View style={styles.entityPill}>
                  <ZText size="xs" style={{ color: PLATFORM_ACCENT }}>
                    {item.entityType}
                  </ZText>
                </View>
              </View>
              <ZText size="xs" style={{ color: palette.textMuted }}>
                {item.company?.name ?? '-'} • {item.actorUser?.fullName ?? item.actorUser?.email ?? '-'}
              </ZText>
              <ZText size="xs" style={{ color: palette.textMuted }}>
                {new Date(item.createdAt).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
              </ZText>
            </View>
          )}
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        active && {
          backgroundColor: `${PLATFORM_ACCENT}18`,
          borderColor: PLATFORM_ACCENT,
        },
      ]}
    >
      <ZText
        size="xs"
        weight={active ? 'bold' : 'regular'}
        style={{ color: active ? PLATFORM_ACCENT : '#64748b' }}
      >
        {label}
      </ZText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    backgroundColor: PLATFORM_ACCENT,
  },
  headerTitle: { color: '#fff' },
  headerSubtitle: { color: '#e9d5ff', marginTop: 2 },
  searchWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  searchBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
  },
  filtersRow: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[2],
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  totalText: {
    marginBottom: Spacing[1],
  },
  row: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  rowTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entityPill: {
    borderRadius: Radius.full,
    backgroundColor: `${PLATFORM_ACCENT}14`,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
});
