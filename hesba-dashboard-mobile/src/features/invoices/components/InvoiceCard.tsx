// F2.1 — Status badge colours updated to match new workflow statuses
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  toFloat,
  formatDate,
  STATUS_CONFIG,
  type InvoiceListItem,
} from '../types';

interface InvoiceCardProps {
  item: InvoiceListItem;
  onPress: (id: string) => void;
}

function InvoiceCardComponent({ item, onPress }: InvoiceCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const palette = isDark ? Colors.dark : Colors.light;

  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DRAFT;
  const amount = toFloat(item.totalAmount);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
          borderColor: palette.border,
        },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
    >
      <View
        style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        {/* Icon */}
        <View
          style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(31, 122, 90, 0.15)' : 'rgba(31, 122, 90, 0.08)' }]}
        >
          <Ionicons name="receipt-outline" size={20} color={Colors.brand.primary} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View
            style={[
              styles.topRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <ZText
              weight="bold"
              size="sm"
              style={{ color: palette.text, flexShrink: 1 }}
            >
              {item.invoiceNumber}
            </ZText>
            {/* F2.1 — status badge */}
            <View
              style={[
                styles.statusBadge, 
                { backgroundColor: isDark ? `${statusCfg.bg}20` : statusCfg.bg },
              ]}
            >
              <ZText size="xs" weight="medium" style={{ color: statusCfg.color }}>
                {t(`status.${item.status}`)}
              </ZText>
            </View>
          </View>

          <ZText
            size="sm"
            style={{ color: palette.textSecondary, textAlign: isRTL ? 'right' : 'left' }}
          >
            {item.customer?.name ?? '—'}
          </ZText>

          <ZText
            size="xs"
            style={{ color: palette.textMuted, textAlign: isRTL ? 'right' : 'left' }}
          >
            {formatDate(item.issueDate)}
            {item.dueDate ? ` · ${formatDate(item.dueDate)}` : ''}
          </ZText>
        </View>

        {/* Amount */}
        <ZText weight="bold" style={{ color: palette.text, fontSize: 15 }}>
          {amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </ZText>
      </View>
    </TouchableOpacity>
  );
}

export const InvoiceCard = memo(InvoiceCardComponent);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  row: { alignItems: 'center', gap: Spacing[3] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
});
