/**
 * ContractCard — List card for a single installment contract.
 *
 * Layout:
 *   [Icon Pill]  [CNT-2026-0001]  [StatusBadge]
 *                [Party Name · Type]
 *                [ProgressBar]
 *                [Paid: 2,000]  [Remaining: 8,000]
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  INSTALLMENT_ACCENT,
  INSTALLMENT_ACCENT_LIGHT,
  CONTRACT_STATUS_CONFIG,
  toFloat,
  type InstallmentContract,
} from '../types';

interface ContractCardProps {
  item: InstallmentContract;
  onPress: (id: string) => void;
}

const ContractCard = memo(function ContractCard({ item, onPress }: ContractCardProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('installments');
  const palette = isDark ? Colors.dark : Colors.light;

  const statusCfg = CONTRACT_STATUS_CONFIG[item.status];
  const statusColor = isDark ? statusCfg.darkColor : statusCfg.color;
  const statusBg    = isDark ? statusCfg.darkBgColor : statusCfg.bgColor;

  const total     = toFloat(item.totalAmount);
  const paid      = toFloat(item.paidAmount);
  const remaining = Math.max(0, total - paid);
  const progress  = total > 0 ? Math.min(1, paid / total) : 0;

  // Progress bar color by status
  const barColor =
    item.status === 'COMPLETED' ? '#2563eb' :
    item.status === 'OVERDUE'   ? '#dc2626' :
    INSTALLMENT_ACCENT;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          shadowColor: isDark ? '#000' : '#64748b',
        },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      {/* Icon Pill */}
      <View style={[styles.iconPill, { backgroundColor: INSTALLMENT_ACCENT_LIGHT }]}>
        <Ionicons name="calendar-number-outline" size={22} color={INSTALLMENT_ACCENT} />
      </View>

      {/* Content */}
      <View style={[styles.content, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        {/* Top row: contract number + status badge */}
        <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="sm" style={{ color: palette.text, flex: 1 }}>
            {item.contractNumber}
          </ZText>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <ZText size="xs" style={{ color: statusColor, fontWeight: '600' }}>
              {t(`contractStatus.${item.status}`)}
            </ZText>
          </View>
        </View>

        {/* Party name + type */}
        {item.partyName && (
          <ZText size="sm" style={{ color: palette.textSecondary }} numberOfLines={1}>
            {item.partyName}
            {' · '}
            {t(`partyType.${item.partyType}`)}
          </ZText>
        )}

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: barColor },
            ]}
          />
        </View>

        {/* Bottom row: paid + remaining */}
        <View style={[styles.bottomRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText size="xs" style={{ color: palette.textMuted }}>
            {`${t('detail.paidAmount')}: `}
            <ZText size="xs" weight="medium" style={{ color: '#16a34a' }}>
              {paid.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </ZText>
          </ZText>
          <ZText size="xs" style={{ color: palette.textMuted }}>
            {`${t('detail.remainingAmount')}: `}
            <ZText
              size="xs"
              weight="medium"
              style={{ color: remaining === 0 ? '#16a34a' : '#dc2626' }}
            >
              {remaining.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </ZText>
          </ZText>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons
        name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
        size={16}
        color={palette.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
});

export default ContractCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[3],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    alignItems: 'center',
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: Spacing[1],
  },
  topRow: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: Spacing[1],
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    justifyContent: 'space-between',
  },
  chevron: {
    flexShrink: 0,
  },
});
