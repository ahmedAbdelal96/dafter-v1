import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

function SkeletonCard() {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
      ]}
    >
      <View style={styles.row}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <View style={{ flex: 1, gap: Spacing[1] }}>
          <View style={styles.topRow}>
            <Skeleton width={120} height={14} borderRadius={6} />
            <Skeleton width={56} height={20} borderRadius={8} />
          </View>
          <Skeleton width={150} height={12} borderRadius={5} />
          <Skeleton width={100} height={11} borderRadius={5} />
        </View>
        <Skeleton width={64} height={16} borderRadius={6} />
      </View>
    </View>
  );
}

export function InvoiceSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 7 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing[2] },
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    padding: Spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
