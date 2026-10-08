/**
 * KpiCard — Single KPI Metric Card
 *
 * Displays one financial KPI (value + label + icon pill).
 * Used in a 2×2 grid on the dashboard.
 *
 * memo() is required — the grid renders 4+ cards and the parent
 * re-renders on period change + data load, so memoisation prevents
 * unnecessary re-renders of unchanged cards.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
} from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';

interface KpiCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;    // pre-formatted string (e.g. "12,500 ج.م")
  accent: string;   // icon pill background (light mode)
  accentIcon: string; // icon color
  /** Optional: override value color for profit/loss signalling */
  valueColor?: string;
}

const KpiCard = memo(function KpiCard({
  icon,
  label,
  value,
  accent,
  accentIcon,
  valueColor,
}: KpiCardProps) {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();

  const palette  = isDark ? Colors.dark : Colors.light;
  const fontReg  = fontLocale === 'arabic' ? Fonts.arabic.regular  : Fonts.latin.regular;
  const fontBold = fontLocale === 'arabic' ? Fonts.arabic.bold     : Fonts.latin.bold;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          borderColor: palette.border,
        },
        Shadows.sm,
      ]}
    >
      {/* Icon pill */}
      <View
        style={[
          styles.iconPill,
          {
            backgroundColor: isDark
              ? `${accentIcon}22` // low-opacity tint in dark mode
              : accent,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={accentIcon} />
      </View>

      {/* Value */}
      <Text
        style={[
          styles.value,
          {
            color: valueColor ?? palette.text,
            fontFamily: fontBold,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      {/* Label */}
      <Text
        style={[
          styles.label,
          {
            color: palette.textMuted,
            fontFamily: fontReg,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
});

export default KpiCard;

const styles = StyleSheet.create({
  card: {
    // 47.5% width so 2 cards fit per row with a gap between them
    width: '47.5%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    gap: Spacing[1.5],
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  value: {
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.2,
  },
  label: {
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * 1.5,
  },
});
