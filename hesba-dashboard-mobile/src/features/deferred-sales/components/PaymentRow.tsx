/**
 * PaymentRow — Single payment history item inside detail sheet
 *
 * Layout:
 *   [💰 icon]  500.00 SAR          15 Mar 2024
 *              Bank Transfer       Note text…
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { toFloat, type DeferredPayment } from '../types';

interface PaymentRowProps {
  payment: DeferredPayment;
  index: number;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const PaymentRow = React.memo(function PaymentRow({
  payment,
  index,
}: PaymentRowProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  const amount = toFloat(payment.amount);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f9fafb',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {/* Payment index badge */}
      <View style={[styles.indexBadge, { backgroundColor: '#dcfce7' }]}>
        <ZText style={styles.indexText}>#{index + 1}</ZText>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View
          style={[
            styles.topLine,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <ZText weight="bold" size="sm" style={{ color: '#16a34a' }}>
            {amount.toLocaleString('ar-SA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </ZText>
          <ZText size="xs" variant="secondary">
            {formatDate(payment.paymentDate)}
          </ZText>
        </View>

        {payment.paymentMethod && (
          <View
            style={[
              styles.metaLine,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons name="card-outline" size={12} color={palette.textMuted} />
            <ZText size="xs" variant="secondary">
              {payment.paymentMethod}
            </ZText>
          </View>
        )}

        {payment.notes && (
          <ZText
            size="xs"
            variant="secondary"
            numberOfLines={2}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          >
            {payment.notes}
          </ZText>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLine: {
    alignItems: 'center',
    gap: 4,
  },
});
