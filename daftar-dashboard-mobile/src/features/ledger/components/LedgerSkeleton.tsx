/**
 * LedgerSkeleton — Loading placeholder for the statement screen.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { Colors, Spacing, Radius } from '@/constants/theme';

function EntryRowSkeleton() {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          shadowColor: isDark ? '#000' : '#64748b',
        },
      ]}
    >
      <Skeleton width={40} height={40} borderRadius={12} />
      <View style={styles.middle}>
        <Skeleton width={120} height={13} borderRadius={6} />
        <Skeleton width={80} height={11} borderRadius={5} />
      </View>
      <View style={styles.right}>
        <Skeleton width={70} height={13} borderRadius={6} />
        <Skeleton width={55} height={11} borderRadius={5} />
      </View>
    </View>
  );
}

export function LedgerSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
      {/* Balance strip skeleton */}
      <View style={styles.stripSkeleton}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.stripItem}>
            <Skeleton width={55} height={11} borderRadius={5} />
            <Skeleton width={75} height={16} borderRadius={7} />
          </View>
        ))}
      </View>
      {/* Entry rows */}
      {Array.from({ length: count }).map((_, i) => (
        <EntryRowSkeleton key={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing[8],
  },
  stripSkeleton: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
    gap: Spacing[2],
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(71,85,105,0.08)',
  },
  row: {
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
  middle: {
    flex: 1,
    gap: Spacing[2],
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing[2],
  },
});
