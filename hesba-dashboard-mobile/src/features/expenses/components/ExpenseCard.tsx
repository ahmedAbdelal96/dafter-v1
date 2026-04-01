/**
 * ExpenseCard — Single expense row in the FlatList.
 *
 * Layout (RTL-aware):
 *   [Category Icon] | Description + Date | Amount
 *                   | Category label     | Supplier (if linked)
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  toFloat,
  formatDate,
  CATEGORY_CONFIG,
  EXPENSE_ACCENT,
  type Expense,
} from '../types';

interface ExpenseCardProps {
  item: Expense;
  onPress: (id: string) => void;
}

const ExpenseCard = memo(function ExpenseCard({ item, onPress }: ExpenseCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('expenses');
  const palette = isDark ? Colors.dark : Colors.light;

  const cfg = CATEGORY_CONFIG[item.category];
  const amount = toFloat(item.amount);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          shadowColor: isDark ? '#000' : '#92400e',
        },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      {/* Category icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: `${cfg.color}18` }]}>
        <Ionicons
          name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']}
          size={20}
          color={cfg.color}
        />
      </View>

      {/* Info: description/category + date + supplier */}
      <View
        style={[
          styles.info,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <ZText
          weight="semibold"
          size="sm"
          style={{ color: palette.text }}
          numberOfLines={1}
        >
          {item.description || t(`category.${item.category}`)}
        </ZText>
        <ZText size="xs" variant="secondary">
          {formatDate(item.expenseDate)}
          {item.supplier ? ` • ${item.supplier.name}` : ''}
        </ZText>
        {item.description ? (
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: `${cfg.color}15` },
            ]}
          >
            <ZText size="xs" style={{ color: cfg.color }}>
              {t(`category.${item.category}`)}
            </ZText>
          </View>
        ) : null}
      </View>

      {/* Amount */}
      <ZText weight="bold" size="sm" style={[styles.amount, { color: EXPENSE_ACCENT }]}>
        {amount.toLocaleString('ar-SA', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </ZText>
    </TouchableOpacity>
  );
});

export default ExpenseCard;

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    padding: Spacing[3],
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  amount: {
    minWidth: 72,
    textAlign: 'right',
  },
});
