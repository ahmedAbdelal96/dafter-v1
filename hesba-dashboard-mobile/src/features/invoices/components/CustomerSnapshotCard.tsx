/**
 * CustomerSnapshotCard — shows balance + overdue summary after customer selection.
 * Renders a skeleton while loading, a warning banner if overdue > 0.
 */
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCustomerSnapshot } from '../hooks/useInvoices';
import { toFloat, INVOICE_ACCENT } from '../types';

interface CustomerSnapshotCardProps {
  customerId: string;
}

export function CustomerSnapshotCard({ customerId }: CustomerSnapshotCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data: snapshot, isLoading, isError } = useCustomerSnapshot(customerId);

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: `${INVOICE_ACCENT}10` }]}>
        <ActivityIndicator size="small" color={INVOICE_ACCENT} />
        <ZText size="xs" variant="secondary">
          {t('snapshot.loading')}
        </ZText>
      </View>
    );
  }

  if (isError || !snapshot) return null;

  const balance = toFloat(snapshot.currentBalance);
  const overdue = toFloat(snapshot.overdueAmount);
  const hasOverdue = overdue > 0;

  // balance sign convention: positive = company owes customer, negative = customer owes company
  const balanceLabel = balance < 0
    ? Math.abs(balance).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
    : balance === 0
    ? '0.00'
    : balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 });

  const balanceColor =
    balance < 0 ? '#dc2626' : balance > 0 ? '#16a34a' : palette.textMuted;

  return (
    <View style={styles.wrapper}>
      {/* Main snapshot row */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {/* Balance */}
        <View style={styles.metricBlock}>
          <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
            {t('snapshot.balance')}
          </ZText>
          <ZText
            weight="bold"
            size="sm"
            style={{ color: balanceColor, textAlign: 'center' }}
          >
            {balanceLabel}
          </ZText>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Open invoices */}
        <View style={styles.metricBlock}>
          <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
            {t('snapshot.openInvoices')}
          </ZText>
          <ZText
            weight="bold"
            size="sm"
            style={{ color: palette.text, textAlign: 'center' }}
          >
            {snapshot.openInvoicesCount}
          </ZText>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Last invoice date */}
        <View style={styles.metricBlock}>
          <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
            {t('snapshot.lastInvoice')}
          </ZText>
          <ZText
            weight="medium"
            size="xs"
            style={{ color: palette.text, textAlign: 'center' }}
          >
            {snapshot.lastInvoiceDate
              ? new Date(snapshot.lastInvoiceDate).toLocaleDateString('ar-SA', {
                  day: 'numeric',
                  month: 'short',
                })
              : '—'}
          </ZText>
        </View>
      </View>

      {/* Overdue warning banner */}
      {hasOverdue && (
        <View
          style={[
            styles.warning,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name="warning-outline" size={14} color="#dc2626" />
          <ZText size="xs" style={{ color: '#dc2626', flex: 1 }}>
            {t('snapshot.overdueWarning', {
              amount: overdue.toLocaleString('ar-SA', {
                minimumFractionDigits: 2,
              }),
            })}
          </ZText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing[1] },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
  },
  metricBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 32,
  },
  warning: {
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
});
