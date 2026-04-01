/**
 * CollectionTab â€” Upcoming payment schedule for a date range.
 *
 * Backend returns data as a direct array of CollectionItem (not wrapped in { items: [] }).
 */
import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCollectionSchedule } from '../hooks/useReports';
import {
  toFloat,
  formatDate,
  REPORTS_ACCENT,
  type CollectionItem,
  type CollectionParams,
} from '../types';

interface CollectionTabProps {
  params: CollectionParams;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(value: string | number) {
  return toFloat(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// â”€â”€â”€ Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CollectionRow({ item }: { item: CollectionItem }) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  const typeColor = item.type === 'DEFERRED' ? '#7c3aed' : '#16a34a';
  const isSoon = item.daysUntilDue >= 0 && item.daysUntilDue <= 3;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isDark ? Colors.dark.surface : '#fff',
          borderLeftWidth: isSoon ? 3 : 0,
          borderLeftColor: isSoon ? '#f59e0b' : 'transparent',
        },
      ]}
    >
      <View style={[styles.rowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.calIcon, { backgroundColor: `${REPORTS_ACCENT}15` }]}>
          <Ionicons name="calendar-outline" size={16} color={REPORTS_ACCENT} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <ZText weight="bold" size="sm" style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}>
            {item.partyName}
          </ZText>
          <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
              <ZText size="xs" style={{ color: typeColor }}>
                {t(`collection.type.${item.type}`)}
              </ZText>
            </View>
            {isSoon && (
              <View style={styles.soonBadge}>
                <ZText size="xs" style={{ color: '#92400e' }}>
                  {item.daysUntilDue === 0 ? t('collection.today') : `${item.daysUntilDue}d`}
                </ZText>
              </View>
            )}
          </View>
          <ZText size="xs" variant="muted" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {item.referenceNumber} â€¢ {formatDate(item.dueDate)}
          </ZText>
        </View>

        <ZText weight="bold" style={{ color: REPORTS_ACCENT, fontSize: 13 }}>
          {fmt(item.expectedAmount)}
        </ZText>
      </View>
    </View>
  );
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CollectionTab({ params }: CollectionTabProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading, isError, refetch } = useCollectionSchedule(params);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={REPORTS_ACCENT} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={palette.textMuted} />
        <ZText variant="secondary" size="sm">
          {t('errors.loadFailed', { defaultValue: 'Failed to load' })}
        </ZText>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <ZText size="sm" style={{ color: REPORTS_ACCENT }}>
            {t('errors.retry', { defaultValue: 'Retry' })}
          </ZText>
        </TouchableOpacity>
      </View>
    );
  }

  // data is CollectionItem[] (direct array)
  const items: CollectionItem[] = Array.isArray(data) ? data : [];

  // compute total expected amount
  const total = items.reduce((sum, item) => sum + toFloat(item.expectedAmount), 0);

  return (
    <FlatList
      data={items}
      keyExtractor={(item, idx) => `${item.referenceNumber}-${idx}`}
      contentContainerStyle={[
        styles.list,
        items.length === 0 && styles.emptyList,
      ]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        items.length > 0 ? (
          <View
            style={[
              styles.totalBanner,
              { backgroundColor: `${REPORTS_ACCENT}10`, flexDirection: 'row' },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={REPORTS_ACCENT} />
            <ZText size="sm" weight="medium" style={{ color: REPORTS_ACCENT, flex: 1 }}>
              {t('collection.amount')}
            </ZText>
            <ZText weight="bold" style={{ color: REPORTS_ACCENT }}>
              {total.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </ZText>
          </View>
        ) : null
      }
      renderItem={({ item }) => <CollectionRow item={item} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={56} color={palette.textMuted} />
          <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
            {t('collection.empty')}
          </ZText>
          <ZText variant="secondary" size="sm" style={{ textAlign: 'center' }}>
            {t('collection.emptyDesc')}
          </ZText>
        </View>
      }
    />
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  list: { paddingVertical: Spacing[2], paddingBottom: Spacing[8] },
  emptyList: { flexGrow: 1 },
  totalBanner: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: `${REPORTS_ACCENT}30`,
  },
  row: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowInner: {
    alignItems: 'center',
    padding: Spacing[3],
    gap: Spacing[3],
  },
  calIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
});
