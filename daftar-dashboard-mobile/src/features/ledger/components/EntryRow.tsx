/**
 * EntryRow — Single row in the account statement.
 *
 * Layout (LTR):
 *   [Type Icon]  [Type label + Date/Note]  |  [Amount]
 *                                            [RB label + value]
 *
 * - Amount: green if positive (credit), red if negative (debit)
 * - Running balance: always muted gray
 * - Tap → EntryDetail modal
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
  ENTRY_TYPE_ICONS,
  ENTRY_TYPE_COLORS,
  type LedgerEntry,
} from '../types';

interface EntryRowProps {
  item: LedgerEntry;
  onPress: (entry: LedgerEntry) => void;
}

function formatMoney(value: string | number): string {
  const n = toFloat(value);
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${abs.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const EntryRow = memo(function EntryRow({ item, onPress }: EntryRowProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('ledger');
  const palette = isDark ? Colors.dark : Colors.light;

  const amount = toFloat(item.signedAmount);
  const amountColor = amount >= 0 ? '#16a34a' : '#dc2626';
  const typeColor = ENTRY_TYPE_COLORS[item.entryType] ?? '#475569';
  const iconName = ENTRY_TYPE_ICONS[item.entryType] ?? 'document-outline';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          shadowColor: isDark ? '#000' : '#64748b',
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Type Icon */}
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${typeColor}18` },
        ]}
      >
        <Ionicons
          name={iconName as React.ComponentProps<typeof Ionicons>['name']}
          size={18}
          color={typeColor}
        />
      </View>

      {/* Middle: type + date/note */}
      <View
        style={[
          styles.middle,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <ZText
          weight="semibold"
          size="sm"
          style={{ color: palette.text }}
        >
          {t(`entryType.${item.entryType}`)}
        </ZText>
        <ZText size="xs" variant="secondary">
          {formatDate(item.entryDate)}
          {item.note ? ` • ${item.note}` : ''}
        </ZText>
        {item.dueDate ? (
          <ZText size="xs" style={{ color: '#d97706' }}>
            {t('entry.dueDate')}: {formatDate(item.dueDate)}
          </ZText>
        ) : null}
      </View>

      {/* Right: amount + running balance */}
      <View
        style={[
          styles.right,
          { alignItems: isRTL ? 'flex-start' : 'flex-end' },
        ]}
      >
        <ZText weight="bold" size="sm" style={{ color: amountColor }}>
          {formatMoney(item.signedAmount)}
        </ZText>
        <ZText size="xs" variant="secondary">
          {toFloat(item.runningBalance).toLocaleString('ar-SA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </ZText>
      </View>
    </TouchableOpacity>
  );
});

export default EntryRow;

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    padding: Spacing[3],
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  right: {
    gap: 3,
    minWidth: 72,
  },
});
