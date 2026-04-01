/**
 * Skeleton — Shimmer loading placeholder
 *
 * Uses react-native-reanimated's withRepeat for a 60fps shimmer animation
 * that sweeps across the placeholder — same pattern as Facebook/Instagram skeletons.
 *
 * Architecture:
 * - A single shared Animated.Value drives all instances simultaneously
 *   so they shimmer in sync (looks intentional vs. random flicker)
 * - Dark/light aware — uses appropriate background colors
 *
 * Usage:
 *   <Skeleton width={200} height={20} />
 *   <Skeleton width="100%" height={80} radius={12} style={{ marginBottom: 8 }} />
 *   <Skeleton circle size={44} />
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '@/stores/theme-store';
import { Colors, Radius } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  borderRadius?: number;
  /** Renders a perfect circle — ignores width/height, uses `size` */
  circle?: boolean;
  size?: number;
  style?: ViewStyle;
  isDark?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height = 16,
  radius = Radius.sm,
  borderRadius,
  circle = false,
  size = 40,
  style,
  isDark: propIsDark,
}: SkeletonProps) {
  const { isDark } = useTheme();

  // Shimmer value goes 0 → 1 → 0 in a loop
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse
    );
  }, [shimmer]);

  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.4, 0.8, 0.4]);
    return { opacity };
  });

  const baseColor = isDark ? Colors.dark.surfaceTertiary : Colors.light.surfaceTertiary;
  
  const finalRadius = borderRadius ?? radius;
  const circleStyle: ViewStyle = circle
    ? { width: size, height: size, borderRadius: size / 2 }
    : { width, height, borderRadius: finalRadius };

  return (
    <Animated.View
      style={[styles.base, { backgroundColor: baseColor }, circleStyle, animStyle, style]}
    />
  );
});

// ─── Preset compositions ──────────────────────────────────────────────────────

/** Skeleton for a booking/client list card */
export function CardSkeleton({ isDark }: { isDark: boolean }) {
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  const bgColor = isDark ? Colors.dark.surface : Colors.white;

  return (
    <View style={[skStyles.card, { backgroundColor: bgColor, borderColor }]}>
      <View style={skStyles.cardTop}>
        <Skeleton circle size={44} />
        <View style={skStyles.cardInfo}>
          <Skeleton width="60%" height={14} radius={6} />
          <Skeleton width="40%" height={12} radius={6} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={60} height={24} radius={12} />
      </View>
      <View style={[skStyles.cardBottom, { borderTopColor: borderColor }]}>
        <Skeleton width={80} height={12} radius={6} />
        <Skeleton width={60} height={12} radius={6} />
        <Skeleton width={70} height={12} radius={6} />
      </View>
    </View>
  );
}

/** Skeleton for a stat card */
export function StatCardSkeleton({ isDark }: { isDark: boolean }) {
  const bgColor = isDark ? Colors.dark.surface : Colors.white;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  return (
    <View style={[skStyles.statCard, { backgroundColor: bgColor, borderColor }]}>
      <Skeleton circle size={40} />
      <Skeleton width="70%" height={22} radius={6} style={{ marginTop: 8 }} />
      <Skeleton width="85%" height={12} radius={6} style={{ marginTop: 6 }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

const skStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flex: 1,
    minWidth: 140,
  },
});
