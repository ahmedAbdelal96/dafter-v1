/**
 * DashboardSkeleton — Loading Placeholder for the Dashboard Screen
 *
 * Mirrors the exact layout of the real dashboard so the transition
 * from loading to loaded feels seamless (no layout shift).
 *
 * Structure:
 *   - Greeting header (name + avatar)
 *   - Period selector chips
 *   - Hero financial summary card
 *   - 2×2 KPI grid
 *   - Operations row (3 stat chips)
 *   - Quick actions row
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Colors,
  Spacing,
  Radius,
  Layout,
} from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

export function DashboardSkeleton() {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>

      {/* Header — greeting + avatar */}
      <View style={[styles.header, { backgroundColor: isDark ? Colors.dark.surface : Colors.white, borderBottomColor: palette.border }]}>
        <View style={styles.headerText}>
          <Skeleton width={80} height={13} radius={6} isDark={isDark} />
          <Skeleton width={160} height={22} radius={8} style={{ marginTop: 6 }} isDark={isDark} />
        </View>
        <Skeleton circle size={40} isDark={isDark} />
      </View>

      {/* Scrollable content */}
      <View style={styles.content}>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {[72, 88, 80, 64].map((w, i) => (
            <Skeleton key={i} width={w} height={32} radius={Radius.full} isDark={isDark} />
          ))}
        </View>

        {/* Hero card */}
        <Skeleton
          width="100%"
          height={118}
          radius={Radius.xl}
          isDark={isDark}
        />

        {/* 2×2 KPI grid */}
        <View style={styles.kpiGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.kpiCard,
                { backgroundColor: isDark ? Colors.dark.surface : Colors.white },
              ]}
            >
              <Skeleton width={36} height={36} radius={Radius.md} isDark={isDark} />
              <Skeleton width="70%" height={20} radius={8} style={{ marginTop: 8 }} isDark={isDark} />
              <Skeleton width="50%" height={12} radius={6} style={{ marginTop: 6 }} isDark={isDark} />
            </View>
          ))}
        </View>

        {/* Operations row */}
        <View style={styles.opsRow}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ flex: 1 }} height={64} radius={Radius.lg} isDark={isDark} />
          ))}
        </View>

        {/* Quick actions */}
        <Skeleton width="100%" height={48} radius={Radius.md} isDark={isDark} />
        <Skeleton width="100%" height={48} radius={Radius.md} isDark={isDark} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[6],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1, marginEnd: Spacing[3] },

  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[4],
    gap: Spacing[3],
  },

  periodRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  kpiCard: {
    width: '47.5%',
    borderRadius: Radius.lg,
    padding: Spacing[3],
  },

  opsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
});
