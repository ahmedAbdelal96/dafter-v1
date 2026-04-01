import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing, Radius } from '@/constants/theme';

export function NotificationSkeleton({ count = 7 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          {/* Unread indicator */}
          <Skeleton width={3} height={52} borderRadius={2} />
          {/* Icon */}
          <Skeleton width={44} height={44} borderRadius={13} />
          {/* Text */}
          <View style={styles.text}>
            <Skeleton width="65%" height={14} borderRadius={7} />
            <Skeleton width="90%" height={12} borderRadius={6} style={{ marginTop: 5 }} />
            <Skeleton width="30%" height={10} borderRadius={5} style={{ marginTop: 5 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing[2] },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
    marginHorizontal: Spacing[4],
    padding: Spacing[3],
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    gap: Spacing[3],
  },
  text: { flex: 1, gap: 4 },
});
