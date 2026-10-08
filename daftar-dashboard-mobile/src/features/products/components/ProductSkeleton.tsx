import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius } from '@/constants/theme';

export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          {/* Icon box */}
          <Skeleton width={48} height={48} borderRadius={14} />
          {/* Info */}
          <View style={styles.info}>
            <Skeleton width="55%" height={15} borderRadius={7} />
            <Skeleton width="35%" height={12} borderRadius={6} style={{ marginTop: 5 }} />
            <Skeleton width="45%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
          </View>
          {/* Price */}
          <View style={styles.right}>
            <Skeleton width={60} height={15} borderRadius={7} />
            <Skeleton width={40} height={20} borderRadius={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { paddingTop: Spacing[2] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.xl,
    backgroundColor: '#fff',
    gap: Spacing[3],
  },
  info: { flex: 1, gap: 4 },
  right: { alignItems: 'flex-end' },
});
