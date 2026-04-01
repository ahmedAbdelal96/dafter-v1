/**
 * ZCard — Theme-aware Card container
 *
 * The base container component for all card-style surfaces.
 * Handles background, border, shadow, and border radius automatically
 * based on the current theme — no manual theming needed in consumers.
 *
 * Usage:
 *   <ZCard>
 *     <ZText>Booking summary</ZText>
 *   </ZCard>
 *
 *   <ZCard padding="lg" shadow="md" onPress={handlePress}>
 *     <ServiceItem />
 *   </ZCard>
 *
 *   <ZCard variant="brand">...</ZCard>  // Rose-tinted highlight card
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewProps,
  type TouchableOpacityProps,
} from 'react-native';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type CardVariant = 'default' | 'brand' | 'success' | 'error' | 'warning';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardShadow = 'none' | 'xs' | 'sm' | 'md';

interface ZCardProps extends ViewProps {
  variant?: CardVariant;
  padding?: CardPadding;
  shadow?: CardShadow;
  /** Makes the card pressable — wraps in TouchableOpacity */
  onPress?: TouchableOpacityProps['onPress'];
  /** Show bottom border separator (useful in lists) */
  separator?: boolean;
  children?: React.ReactNode;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: Spacing[3],
  md: Spacing[4],
  lg: Spacing[5],
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ZCard = React.memo(function ZCard({
  variant = 'default',
  padding = 'md',
  shadow = 'xs',
  onPress,
  separator = false,
  style,
  children,
  ...props
}: ZCardProps) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const cardStyle = StyleSheet.flatten([
    styles.base,
    {
      padding: PADDING_MAP[padding],
      backgroundColor: getBackgroundColor(variant, isDark),
      borderColor: getBorderColor(variant, isDark),
      borderBottomWidth: separator ? 1 : undefined,
    },
    shadow !== 'none' && !isDark ? Shadows[shadow] : undefined,
    // Dark mode: use border instead of shadow (shadows don't work well on dark)
    isDark && { borderWidth: 1, borderColor: palette.border },
    style,
  ]);

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBackgroundColor(variant: CardVariant, isDark: boolean): string {
  const palette = isDark ? Colors.dark : Colors.light;
  switch (variant) {
    case 'default':
      return isDark ? palette.surface : Colors.white;
    case 'brand':
      return isDark ? 'rgba(196, 120, 127, 0.15)' : Colors.brand.primaryLight;
    case 'success':
      return Colors.status.successLight;
    case 'error':
      return Colors.status.errorLight;
    case 'warning':
      return Colors.status.warningLight;
  }
}

function getBorderColor(variant: CardVariant, isDark: boolean): string {
  const palette = isDark ? Colors.dark : Colors.light;
  switch (variant) {
    case 'default':
      return palette.border;
    case 'brand':
      return isDark ? 'rgba(196, 120, 127, 0.3)' : 'rgba(196, 120, 127, 0.25)';
    case 'success':
      return 'rgba(18, 183, 106, 0.25)';
    case 'error':
      return 'rgba(240, 68, 56, 0.25)';
    case 'warning':
      return 'rgba(247, 144, 9, 0.25)';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
});
