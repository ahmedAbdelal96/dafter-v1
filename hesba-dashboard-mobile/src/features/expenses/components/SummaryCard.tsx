/**
 * SummaryCard — Expenses overview card.
 *
 * Shows total amount + count at the top, then a breakdown bar
 * for each category sorted by highest spending first.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  toFloat,
  CATEGORY_CONFIG,
  EXPENSE_ACCENT,
  EXPENSE_ACCENT_LIGHT,
  type ExpenseSummary,
} from '../types';

interface SummaryCardProps {
  summary: ExpenseSummary | undefined;
  isLoading?: boolean;
}

export function SummaryCard({ summary, isLoading }: SummaryCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('expenses');
  const palette = isDark ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(true);

  const total = toFloat(summary?.totalAmount);
  const count = summary?.count ?? 0;
  // Sort by highest total descending
  const byCategory = [...(summary?.byCategory ?? [])].sort(
    (a, b) => toFloat(b.total) - toFloat(a.total),
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          shadowColor: isDark ? '#000' : '#92400e',
        },
      ]}
    >
      {/* ── Header row ── */}
      <TouchableOpacity
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.85}
      >
        {/* Icon */}
        <View style={[styles.iconBg, { backgroundColor: `${EXPENSE_ACCENT}18` }]}>
          <Ionicons name="wallet-outline" size={18} color={EXPENSE_ACCENT} />
        </View>

        {/* Label + total */}
        <View style={[styles.headerText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <ZText size="xs" variant="secondary">
            {t('summary.total')}
          </ZText>
          <ZText weight="bold" size="xl" style={{ color: EXPENSE_ACCENT }}>
            {isLoading ? '...' : total.toLocaleString('ar-SA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </ZText>
        </View>

        {/* Count + chevron */}
        <View style={{ alignItems: 'center', gap: 3 }}>
          <View style={[styles.countBadge, { backgroundColor: `${EXPENSE_ACCENT}18` }]}>
            <ZText size="xs" weight="bold" style={{ color: EXPENSE_ACCENT }}>
              {count}
            </ZText>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={palette.textMuted}
          />
        </View>
      </TouchableOpacity>

      {/* ── Category breakdown ── */}
      {expanded && byCategory.length > 0 && (
        <View style={styles.breakdown}>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          {byCategory.map((row) => {
            const cfg = CATEGORY_CONFIG[row.category];
            const rowAmount = toFloat(row.total);
            const pct = total > 0 ? rowAmount / total : 0;

            return (
              <View key={row.category} style={styles.categoryRow}>
                {/* Icon + label */}
                <View
                  style={[
                    styles.catLeft,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: `${cfg.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={12}
                      color={cfg.color}
                    />
                  </View>
                  <ZText size="xs" style={{ color: palette.textSecondary }}>
                    {t(`category.${row.category}`)}
                  </ZText>
                </View>

                {/* Progress bar + amount */}
                <View style={styles.catRight}>
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f1f5f9' },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(3, pct * 100)}%`,
                          backgroundColor: cfg.color,
                        },
                      ]}
                    />
                  </View>
                  <ZText
                    size="xs"
                    weight="medium"
                    style={{ color: palette.text, minWidth: 64, textAlign: 'right' }}
                  >
                    {rowAmount.toLocaleString('ar-SA', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </ZText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
    borderRadius: Radius.xl,
    padding: Spacing[4],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  countBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: Spacing[3],
  },
  breakdown: {},
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  catLeft: {
    alignItems: 'center',
    gap: Spacing[2],
    width: 110,
  },
  catIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
