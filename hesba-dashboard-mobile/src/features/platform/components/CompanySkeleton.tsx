import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius } from '@/constants/theme';

export function CompanySkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.top}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <View style={styles.info}>
              <Skeleton width="55%" height={14} borderRadius={7} />
              <Skeleton width="35%" height={11} borderRadius={5} style={{ marginTop: 5 }} />
            </View>
            <Skeleton width={60} height={22} borderRadius={11} />
          </View>
          <View style={styles.bottom}>
            <Skeleton width="40%" height={11} borderRadius={5} />
            <Skeleton width="30%" height={11} borderRadius={5} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing[2] },
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    padding: Spacing[3],
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    gap: Spacing[3],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  info: { flex: 1, gap: 4 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
