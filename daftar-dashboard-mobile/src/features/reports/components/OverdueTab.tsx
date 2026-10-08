/**
 * OverdueTab â€” Two sections: overdue deferred sales + overdue installment schedules.
 */
import React from 'react';
import {
  View,
  ScrollView,
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
import { useOverdueReport } from '../hooks/useReports';
import {
  toFloat,
  formatDate,
  REPORTS_ACCENT,
  type OverdueDeferredSaleItem,
  type OverdueScheduleItem,
} from '../types';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(value: string | number) {
  return toFloat(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// â”€â”€â”€ Section header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionTitle({ label, color, count }: { label: string; color: string; count: number }) {
  const { isRTL } = useLocale();
  return (
    <View style={[styles.sectionTitle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <ZText weight="bold" size="sm" style={{ color, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
        {label}
      </ZText>
      <View style={[styles.countBadge, { backgroundColor: `${color}18` }]}>
        <ZText size="xs" weight="bold" style={{ color }}>{count}</ZText>
      </View>
    </View>
  );
}

// â”€â”€â”€ Deferred Sale Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DeferredRow({ item }: { item: OverdueDeferredSaleItem }) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.row, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
      <View style={[styles.rowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.alertIcon, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="warning-outline" size={16} color="#dc2626" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ZText weight="bold" size="sm" style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}>
            {item.partyName}
          </ZText>
          <ZText size="xs" variant="secondary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {item.referenceNumber} â€¢ {t('overdue.daysOverdue', { count: item.daysOverdue })}
          </ZText>
          <ZText size="xs" variant="muted" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('overdue.dueDate')}: {formatDate(item.dueDate)}
          </ZText>
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 2 }}>
          <ZText weight="bold" style={{ color: '#dc2626', fontSize: 13 }}>
            {fmt(item.remainingAmount)}
          </ZText>
          <ZText size="xs" variant="muted">{t('overdue.remaining')}</ZText>
        </View>
      </View>
    </View>
  );
}

// â”€â”€â”€ Schedule Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ScheduleRow({ item }: { item: OverdueScheduleItem }) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.row, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
      <View style={[styles.rowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.alertIcon, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="time-outline" size={16} color="#d97706" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ZText weight="bold" size="sm" style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}>
            {item.partyName}
          </ZText>
          <ZText size="xs" variant="secondary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {item.contractNumber} â€¢ {t('overdue.installment', { num: item.installmentNumber })}
          </ZText>
          <ZText size="xs" variant="muted" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('overdue.daysOverdue', { count: item.daysOverdue })} â€¢ {formatDate(item.dueDate)}
          </ZText>
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 2 }}>
          <ZText weight="bold" style={{ color: '#d97706', fontSize: 13 }}>
            {fmt(item.remainingAmount)}
          </ZText>
          <ZText size="xs" variant="muted">{t('overdue.remaining')}</ZText>
        </View>
      </View>
    </View>
  );
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function OverdueTab() {
  const { isDark } = useTheme();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading, isError, refetch } = useOverdueReport();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={REPORTS_ACCENT} size="large" />
      </View>
    );
  }

  if (isError || !data) {
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

  const deferredSales = data.deferredSales ?? [];
  const schedules = data.installmentSchedules ?? [];
  const hasAny = deferredSales.length > 0 || schedules.length > 0;

  if (!hasAny) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle-outline" size={56} color="#16a34a" />
        <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
          {t('overdue.empty')}
        </ZText>
        <ZText variant="secondary" size="sm" style={{ textAlign: 'center' }}>
          {t('overdue.emptyDesc')}
        </ZText>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    >
      {/* â”€â”€ Deferred Sales Section â”€â”€ */}
      {deferredSales.length > 0 && (
        <>
          <SectionTitle
            label={t('overdue.deferredSales')}
            color="#7c3aed"
            count={deferredSales.length}
          />
          {deferredSales.map((item) => (
            <DeferredRow key={item.id} item={item} />
          ))}
        </>
      )}

      {/* â”€â”€ Installment Schedules Section â”€â”€ */}
      {schedules.length > 0 && (
        <>
          <SectionTitle
            label={t('overdue.installmentSchedules')}
            color="#d97706"
            count={schedules.length}
          />
          {schedules.map((item) => (
            <ScheduleRow key={item.scheduleId} item={item} />
          ))}
        </>
      )}
    </ScrollView>
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
  list: {
    paddingVertical: Spacing[3],
    paddingBottom: Spacing[8],
    gap: Spacing[2],
  },
  sectionTitle: {
    alignItems: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  row: {
    marginHorizontal: Spacing[4],
    borderRadius: Radius.xl,
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
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
});
