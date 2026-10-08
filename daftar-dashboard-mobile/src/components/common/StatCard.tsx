/**
 * StatCard — KPI metric card for the dashboard overview.
 *
 * Shows an icon, numeric value, label, and optional trend indicator.
 * Mirrors the EcommerceMetrics cards from the web dashboard.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZCard } from '@/components/ui/ZCard';
import { ZText } from '@/components/ui/ZText';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Primary numeric or text value */
  value: string | number;
  label: string;
  /** Optional trend: positive = green, negative = red */
  trend?: { value: string; isPositive: boolean };
  /** Rose-gold accent background for the icon */
  accent?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StatCard = React.memo(function StatCard({
  icon,
  value,
  label,
  trend,
  accent = false,
}: StatCardProps) {
  const { isDark } = useTheme();
  const iconBg = accent
    ? Colors.brand.primaryLight
    : isDark
    ? Colors.dark.surfaceTertiary
    : Colors.light.surfaceSecondary;
  const iconColor = accent ? Colors.brand.primary : isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

  return (
    <ZCard padding="md" shadow="sm" style={styles.card}>
      {/* Icon */}
      <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      {/* Value */}
      <ZText weight="bold" size="2xl" style={styles.value} numberOfLines={1}>
        {String(value)}
      </ZText>

      {/* Label + optional trend */}
      <View style={styles.footer}>
        <ZText variant="secondary" size="xs" numberOfLines={1} style={styles.label}>
          {label}
        </ZText>
        {trend && (
          <View style={styles.trend}>
            <Ionicons
              name={trend.isPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend.isPositive ? Colors.status.success : Colors.status.error}
            />
            <ZText
              size="xs"
              weight="medium"
              style={{ color: trend.isPositive ? Colors.status.success : Colors.status.error }}
            >
              {trend.value}
            </ZText>
          </View>
        )}
      </View>
    </ZCard>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    gap: Spacing[2],
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  value: {
    marginTop: Spacing[1],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    flexWrap: 'wrap',
  },
  label: {
    flex: 1,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
