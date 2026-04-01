/**
 * ZBadge — Status badge component for booking/client statuses.
 *
 * Maps every status enum value to a consistent color + label.
 * Supports two sizes: 'sm' (inline) and 'md' (standalone).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ZText } from './ZText';
import { Colors, Radius, Spacing } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'brand';

type BadgeSize = 'sm' | 'md';

interface ZBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

// ─── Variant colors ───────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#f1f5f9', text: '#475569' },
  success: { bg: Colors.status.successLight, text: Colors.status.successDark },
  warning: { bg: Colors.status.warningLight, text: Colors.status.warningDark },
  error:   { bg: Colors.status.errorLight,   text: Colors.status.errorDark },
  info:    { bg: Colors.status.infoLight,     text: Colors.status.infoDark },
  purple:  { bg: '#f3e8ff', text: '#7e22ce' },
  brand:   { bg: Colors.brand.primaryLight,  text: Colors.brand.primaryActive },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ZBadge = React.memo(function ZBadge({
  label,
  variant = 'default',
  size = 'md',
}: ZBadgeProps) {
  const { bg, text } = VARIANT_STYLES[variant];
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg, paddingVertical: isSm ? 2 : Spacing[1], paddingHorizontal: isSm ? Spacing[2] : Spacing[3] },
      ]}
    >
      <ZText
        size={isSm ? 'xs' : 'sm'}
        weight="medium"
        style={{ color: text }}
        numberOfLines={1}
      >
        {label}
      </ZText>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
});
