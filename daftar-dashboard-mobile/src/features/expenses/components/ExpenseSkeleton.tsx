/**
 * ExpenseSkeleton — Placeholder while the expenses list is loading.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { Colors, Spacing, Radius } from '@/constants/theme';

function CardSkeleton() {
  const { isDark } = useTheme();
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
      <Skeleton width={44} height={44} borderRadius={14} />
      <View style={styles.info}>
        <Skeleton width={140} height={13} borderRadius={6} />
        <Skeleton width={80} height={11} borderRadius={5} />
      </View>
      <Skeleton width={72} height={16} borderRadius={7} />
    </View>
  );
}

function SummarySkeleton() {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.summary,
        { backgroundColor: isDark ? Colors.dark.surface : Colors.white },
      ]}
    >
      <View style={styles.summaryRow}>
        <Skeleton width={100} height={12} borderRadius={5} />
        <Skeleton width={90} height={20} borderRadius={8} />
      </View>
      <View style={styles.summaryRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.summaryItem}>
            <Skeleton width={40} height={11} borderRadius={5} />
            <Skeleton width={55} height={14} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ExpenseSkeleton({ count = 7 }: { count?: number }) {
  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
      <SummarySkeleton />
      {/* Category chip strip skeleton */}
      <View style={styles.chipRow}>
        {[80, 60, 70, 65, 75].map((w, i) => (
          <Skeleton key={i} width={w} height={32} borderRadius={16} />
        ))}
      </View>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: Spacing[8] },
  summary: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing[3],
  },
  summaryItem: { gap: Spacing[2], alignItems: 'center' },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    padding: Spacing[3],
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  info: { flex: 1, gap: Spacing[2] },
});
