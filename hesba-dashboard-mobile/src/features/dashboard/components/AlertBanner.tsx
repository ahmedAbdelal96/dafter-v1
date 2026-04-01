/**
 * AlertBanner — Dashboard Alert Summary Row
 *
 * Displayed when the overview reports overdue deferred sales or installments.
 * Tapping navigates the user to the relevant module with a pre-applied filter.
 *
 * Severity mapping:
 *   overdueDeferredSales  → red   → navigate to /(client)/deferred-sales
 *   overdueInstallments   → amber → navigate to /(client)/installments
 *
 * memo() because it re-renders only when alert counts change.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
} from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';

interface AlertBannerProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
  /** 'danger' = red, 'warning' = amber */
  variant: 'danger' | 'warning';
  onPress: () => void;
}

const VARIANT_COLORS = {
  danger:  { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#b45309' },
};

const VARIANT_COLORS_DARK = {
  danger:  { bg: '#450a0a', border: '#7f1d1d', icon: '#f87171', text: '#fca5a5' },
  warning: { bg: '#451a03', border: '#78350f', icon: '#fbbf24', text: '#fcd34d' },
};

const AlertBanner = memo(function AlertBanner({
  icon,
  message,
  variant,
  onPress,
}: AlertBannerProps) {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();

  const colors = isDark ? VARIANT_COLORS_DARK[variant] : VARIANT_COLORS[variant];
  const fontSemi = fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Alert icon */}
      <Ionicons name={icon} size={18} color={colors.icon} />

      {/* Message */}
      <Text
        style={[
          styles.message,
          {
            color: colors.text,
            fontFamily: fontSemi,
            textAlign: isRTL ? 'right' : 'left',
            marginStart: Spacing[2],
            flex: 1,
          },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>

      {/* Chevron — points inward for both LTR and RTL */}
      <Ionicons
        name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
        size={16}
        color={colors.icon}
        style={{ marginStart: Spacing[1] }}
      />
    </TouchableOpacity>
  );
});

export default AlertBanner;

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
  },
  message: {
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.4,
  },
});
