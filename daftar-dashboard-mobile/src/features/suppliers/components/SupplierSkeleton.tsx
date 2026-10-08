/**
 * SupplierSkeleton — Loading placeholder that mirrors the list layout.
 */
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { Colors, Spacing, Radius } from '@/constants/theme';

function CardSkeleton() {
  const { isDark } = useTheme();
  const cardBg = isDark ? Colors.dark.surface : Colors.white;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          shadowColor: isDark ? '#000' : '#64748b',
        },
      ]}
    >
      {/* Avatar */}
      <Skeleton width={44} height={44} borderRadius={22} />

      {/* Lines */}
      <View style={styles.lines}>
        <Skeleton width={140} height={14} borderRadius={7} />
        <Skeleton width={100} height={12} borderRadius={6} />
      </View>

      {/* Balance pill */}
      <Skeleton width={72} height={24} borderRadius={12} />
    </View>
  );
}

export function SupplierSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      scrollEnabled={false}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[3],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lines: {
    flex: 1,
    gap: Spacing[2],
  },
});
