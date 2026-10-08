/**
 * InstallmentsSkeleton — Loading placeholder that mirrors the list layout.
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
      <Skeleton width={44} height={44} borderRadius={14} />
      <View style={styles.lines}>
        <View style={styles.topRow}>
          <Skeleton width={130} height={14} borderRadius={6} />
          <Skeleton width={64} height={20} borderRadius={10} />
        </View>
        <Skeleton width={160} height={12} borderRadius={6} />
        <Skeleton width="100%" height={5} borderRadius={3} />
        <View style={styles.bottomRow}>
          <Skeleton width={90} height={11} borderRadius={5} />
          <Skeleton width={90} height={11} borderRadius={5} />
        </View>
      </View>
    </View>
  );
}

export function InstallmentsSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
      {/* Filter chips */}
      <View style={styles.chips}>
        {[60, 56, 64, 72, 56, 72].map((w, i) => (
          <Skeleton key={i} width={w} height={32} borderRadius={16} />
        ))}
      </View>
      {/* Cards */}
      {Array.from({ length: 5 }).map((_, i) => (
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
  chips: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    flexWrap: 'wrap',
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
