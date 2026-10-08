/**
 * DeferredSaleCard — List item card for a deferred sale
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │  [Icon]  DEF-2024-0001    [StatusBadge] │
 *   │          Party name                     │
 *   │  ProgressBar ──────────── 60%           │
 *   │  Remaining: 2,000 SAR   Due: 15 Mar     │
 *   └─────────────────────────────────────────┘
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import {
  toFloat,
  DEFERRED_ACCENT,
  DEFERRED_ACCENT_LIGHT,
  type DeferredSale,
} from '../types';

interface DeferredSaleCardProps {
  sale: DeferredSale;
  partyName?: string | null;
  onPress: (sale: DeferredSale) => void;
}

/** Format a Decimal string as a readable currency amount */
function formatMoney(value: string | number): string {
  const n = toFloat(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

/** Format an ISO date string to a short readable date */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

export const DeferredSaleCard = React.memo(function DeferredSaleCard({
  sale,
  partyName,
  onPress,
}: DeferredSaleCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('deferredSales');

  const palette = isDark ? Colors.dark : Colors.light;
  const cardBg = isDark ? Colors.dark.surface : Colors.white;
  const remaining = toFloat(sale.remaining);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(sale)}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          shadowColor: isDark ? '#000' : '#64748b',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {/* Icon pill */}
      <View style={[styles.iconPill, { backgroundColor: DEFERRED_ACCENT_LIGHT }]}>
        <Ionicons name="receipt-outline" size={20} color={DEFERRED_ACCENT} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Row 1: reference + badge */}
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="sm" numberOfLines={1} style={styles.ref}>
            {sale.referenceNumber}
          </ZText>
          <StatusBadge status={sale.status} size="sm" />
        </View>

        {/* Row 2: party name */}
        {partyName && (
          <ZText
            variant="secondary"
            size="sm"
            numberOfLines={1}
            style={[styles.party, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {partyName}
          </ZText>
        )}

        {/* Row 3: progress bar */}
        <View style={styles.progressWrapper}>
          <ProgressBar
            totalAmount={sale.totalAmount}
            paidAmount={sale.paidAmount}
            status={sale.status}
          />
        </View>

        {/* Row 4: remaining + due date */}
        <View
          style={[
            styles.row,
            styles.metaRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons
              name="cash-outline"
              size={12}
              color={sale.status === 'PAID' ? '#16a34a' : sale.status === 'OVERDUE' ? '#dc2626' : palette.textMuted}
            />
            <ZText
              size="xs"
              style={[
                styles.metaText,
                {
                  color:
                    sale.status === 'PAID'
                      ? '#16a34a'
                      : sale.status === 'OVERDUE'
                      ? '#dc2626'
                      : palette.textSecondary,
                },
              ]}
            >
              {`${formatMoney(remaining)} ${t('detail.remainingAmount')}`}
            </ZText>
          </View>

          <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={sale.status === 'OVERDUE' ? '#dc2626' : palette.textMuted}
            />
            <ZText
              size="xs"
              style={[
                styles.metaText,
                { color: sale.status === 'OVERDUE' ? '#dc2626' : palette.textSecondary },
              ]}
            >
              {formatDate(sale.dueDate)}
            </ZText>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={16}
        color={palette.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    alignItems: 'center',
    gap: Spacing[3],
    // Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing[1.5],
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  ref: {
    flex: 1,
  },
  party: {
    marginTop: -2,
  },
  progressWrapper: {
    marginTop: Spacing[1],
  },
  metaRow: {
    marginTop: Spacing[1],
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  chevron: {
    marginStart: Spacing[1],
  },
});
