import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

export function UserSkeleton({ count = 6 }: { count?: number }) {
  const { isDark } = useTheme();
  const cardBg = isDark ? Colors.dark.surface : '#fff';

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.row, { backgroundColor: cardBg }]}>
          {/* Avatar */}
          <Skeleton width={44} height={44} borderRadius={22} />
          {/* Info */}
          <View style={styles.info}>
            <Skeleton width="55%" height={14} borderRadius={7} />
            <Skeleton width="75%" height={12} borderRadius={6} style={{ marginTop: 5 }} />
          </View>
          {/* Role badge placeholder */}
          <Skeleton width={48} height={22} borderRadius={11} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.xl,
  },
  info: { flex: 1, gap: 4 },
});
