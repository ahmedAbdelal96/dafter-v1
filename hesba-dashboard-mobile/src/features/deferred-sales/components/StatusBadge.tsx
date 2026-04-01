/**
 * StatusBadge — Deferred Sale status chip
 *
 * Shows a colored pill for: PENDING | PARTIAL | PAID | OVERDUE
 * Colors auto-adapt to dark mode.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useTranslation } from 'react-i18next';
import { STATUS_CONFIG, type DeferredSaleStatus } from '../types';

interface StatusBadgeProps {
  status: DeferredSaleStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge = React.memo(function StatusBadge({
  status,
  size = 'md',
}: StatusBadgeProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation('deferredSales');

  const cfg = STATUS_CONFIG[status];
  const color = isDark ? cfg.darkColor : cfg.color;
  const bgColor = isDark ? cfg.darkBgColor : cfg.bgColor;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: bgColor },
      ]}
    >
      <ZText
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          { color },
        ]}
      >
        {t(`status.${status}`)}
      </ZText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
