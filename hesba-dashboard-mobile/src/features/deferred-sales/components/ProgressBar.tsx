/**
 * ProgressBar — Payment progress for a deferred sale
 *
 * Shows a horizontal fill bar (paidAmount / totalAmount).
 * Turns red when status is OVERDUE, green when PAID.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { toFloat, DEFERRED_ACCENT, type DeferredSaleStatus } from '../types';

interface ProgressBarProps {
  totalAmount: string;
  paidAmount: string;
  status: DeferredSaleStatus;
}

export const ProgressBar = React.memo(function ProgressBar({
  totalAmount,
  paidAmount,
  status,
}: ProgressBarProps) {
  const { isDark } = useTheme();

  const total = toFloat(totalAmount);
  const paid = toFloat(paidAmount);
  // Clamp 0–1 defensively
  const ratio = total > 0 ? Math.min(Math.max(paid / total, 0), 1) : 0;
  const pct = Math.round(ratio * 100);

  // Fill color: red for overdue, green for paid, violet otherwise
  let fillColor = DEFERRED_ACCENT;
  if (status === 'PAID') fillColor = '#16a34a';
  else if (status === 'OVERDUE') fillColor = '#dc2626';

  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` as `${number}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      <ZText style={[styles.pct, { color: fillColor }]}>{pct}%</ZText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});
