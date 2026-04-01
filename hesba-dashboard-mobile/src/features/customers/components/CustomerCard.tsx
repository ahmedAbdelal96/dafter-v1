/**
 * CustomerCard — List item for a single customer.
 *
 * Layout (LTR):
 *   [Avatar]  [Name + Phone]           [Balance pill] [›]
 *
 * Balance pill color:
 *   > 0  → Red  (customer owes us)
 *   < 0  → Green (we owe customer)
 *   = 0  → Muted gray
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { CUSTOMER_ACCENT, toFloat, type Customer } from '../types';

interface CustomerCardProps {
  item: Customer;
  onPress: (id: string) => void;
}

const CustomerCard = memo(function CustomerCard({ item, onPress }: CustomerCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  const balance = toFloat(item.balance);
  const balanceColor =
    balance > 0 ? '#dc2626' :
    balance < 0 ? '#16a34a' :
    palette.textMuted;
  const balanceBg =
    balance > 0 ? (isDark ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2') :
    balance < 0 ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4') :
    isDark ? Colors.dark.surfaceSecondary : '#f1f5f9';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
          borderColor: palette.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <ZAvatar name={item.name} size="md" />

      {/* Name + phone */}
      <View style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="semibold" style={{ color: palette.text }}>{item.name}</ZText>
          {!item.isActive && (
            <View style={[styles.inactivePill, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}>
              <ZText size="xs" style={{ color: palette.textMuted }}>غير نشط</ZText>
            </View>
          )}
        </View>
        {item.phone ? (
          <ZText size="sm" style={{ color: palette.textSecondary }}>{item.phone}</ZText>
        ) : null}
      </View>

      {/* Balance pill + chevron */}
      <View style={[styles.right, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.balancePill, { backgroundColor: balanceBg }]}>
          <ZText size="xs" weight="bold" style={{ color: balanceColor }}>
            {Math.abs(balance).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </ZText>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
          size={16}
          color={palette.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
});

export default CustomerCard;

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    alignItems: 'center',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  inactivePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  right: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  balancePill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    minWidth: 60,
    alignItems: 'center',
  },
});
