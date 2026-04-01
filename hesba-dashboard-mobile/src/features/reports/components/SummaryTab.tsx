/**
 * SummaryTab â€” Financial summary.
 *
 * Shows:
 *   - Total receivables (hero)
 *   - Deferred Sales breakdown (total, remaining, overdue)
 *   - Installments breakdown (active, remaining, overdue)
 */
import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useReportsSummary } from '../hooks/useReports';
import { toFloat, REPORTS_ACCENT } from '../types';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(value: string | number) {
  return toFloat(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// â”€â”€â”€ Hero card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HeroCard({ label, value, color }: { label: string; value: string; color: string }) {
  const { isDark } = useTheme();
  return (
    <View style={[styles.heroCard, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
      <View style={[styles.heroIconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name="wallet-outline" size={22} color={color} />
      </View>
      <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
        {label}
      </ZText>
      <ZText weight="bold" style={{ color, fontSize: 18, textAlign: 'center' }}>
        {value}
      </ZText>
    </View>
  );
}

// â”€â”€â”€ Section card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionCard({
  title,
  color,
  rows,
}: {
  title: string;
  color: string;
  rows: { label: string; value: string | number; isAlert?: boolean }[];
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.sectionCard, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
      <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.sectionDot, { backgroundColor: color }]} />
        <ZText weight="medium" size="sm" style={{ color: palette.text }}>
          {title}
        </ZText>
      </View>
      {rows.map((row, i) => (
        <View
          key={i}
          style={[
            styles.sectionRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
            i < rows.length - 1 && styles.sectionRowBorder,
          ]}
        >
          <ZText size="sm" style={{ color: palette.textSecondary, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            {row.label}
          </ZText>
          <ZText
            weight="bold"
            size="sm"
            style={{ color: row.isAlert ? '#dc2626' : palette.text }}
          >
            {typeof row.value === 'number' ? row.value : row.value}
          </ZText>
        </View>
      ))}
    </View>
  );
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SummaryTab() {
  const { isDark } = useTheme();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading, isError, refetch } = useReportsSummary();

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
          {t('errors.loadFailed', { defaultValue: 'Failed to load report' })}
        </ZText>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <ZText size="sm" style={{ color: REPORTS_ACCENT }}>
            {t('errors.retry', { defaultValue: 'Retry' })}
          </ZText>
        </TouchableOpacity>
      </View>
    );
  }

  const ds = data.deferredSales;
  const ins = data.installments;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* â”€â”€ Total receivables â”€â”€ */}
      <HeroCard
        label={t('summary.totalReceivables')}
        value={fmt(data.totalReceivables)}
        color={REPORTS_ACCENT}
      />

      {/* â”€â”€ Deferred Sales â”€â”€ */}
      <SectionCard
        title={t('summary.deferredSales')}
        color="#7c3aed"
        rows={[
          { label: t('summary.totalContracts'), value: ds.total },
          { label: t('summary.totalAmount'), value: fmt(ds.totalAmount) },
          { label: t('summary.remainingAmount'), value: fmt(ds.remainingAmount) },
          { label: t('summary.overdueCount'), value: ds.overdueCount, isAlert: ds.overdueCount > 0 },
          { label: t('summary.overdueAmount'), value: fmt(ds.overdueAmount), isAlert: toFloat(ds.overdueAmount) > 0 },
        ]}
      />

      {/* â”€â”€ Installments â”€â”€ */}
      <SectionCard
        title={t('summary.installments')}
        color="#16a34a"
        rows={[
          { label: t('summary.activeContracts'), value: ins.activeContracts },
          { label: t('summary.totalAmount'), value: fmt(ins.totalAmount) },
          { label: t('summary.remainingAmount'), value: fmt(ins.remainingAmount) },
          { label: t('summary.overdueSchedules'), value: ins.overdueSchedules, isAlert: ins.overdueSchedules > 0 },
          { label: t('summary.overdueAmount'), value: fmt(ins.overdueAmount), isAlert: toFloat(ins.overdueAmount) > 0 },
        ]}
      />
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
  content: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[8],
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[1],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionRow: {
    alignItems: 'center',
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  sectionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
});
