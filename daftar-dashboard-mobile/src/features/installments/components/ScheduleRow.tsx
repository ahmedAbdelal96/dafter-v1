/**
 * ScheduleRow — Single installment row in the contract detail schedule list.
 *
 * Layout:
 *   [#N Badge]  [Due Date]      [Amount]  [StatusBadge]
 *               [PaidAmount]              [Pay Button if payable]
 */
import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  INSTALLMENT_ACCENT,
  SCHEDULE_STATUS_CONFIG,
  toFloat,
  type InstallmentSchedule,
} from '../types';

interface ScheduleRowProps {
  schedule: InstallmentSchedule;
  onPay?: (schedule: InstallmentSchedule) => void;
  isLast?: boolean;
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

function formatMoney(value: string | number): string {
  const n = toFloat(value);
  return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ScheduleRow = memo(function ScheduleRow({
  schedule,
  onPay,
  isLast = false,
}: ScheduleRowProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('installments');
  const palette = isDark ? Colors.dark : Colors.light;

  const cfg = SCHEDULE_STATUS_CONFIG[schedule.status];
  const statusColor = isDark ? cfg.darkColor : cfg.color;
  const statusBg    = isDark ? cfg.darkBgColor : cfg.bgColor;

  const isPayable = schedule.status === 'PENDING' || schedule.status === 'PARTIAL' || schedule.status === 'OVERDUE';
  const paidAmt   = toFloat(schedule.paidAmount);

  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: palette.border },
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {/* Installment number badge */}
      <View style={[styles.numBadge, { backgroundColor: `${INSTALLMENT_ACCENT}18` }]}>
        <ZText size="xs" weight="bold" style={{ color: INSTALLMENT_ACCENT }}>
          {schedule.installmentNumber}
        </ZText>
      </View>

      {/* Info */}
      <View style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <ZText size="sm" weight="medium" style={{ color: palette.text }}>
          {formatDate(schedule.dueDate)}
        </ZText>
        {paidAmt > 0 && schedule.status !== 'PAID' && (
          <ZText size="xs" style={{ color: '#16a34a' }}>
            {`${t('detail.paidAmount')}: ${formatMoney(paidAmt)}`}
          </ZText>
        )}
        {schedule.notes && (
          <ZText size="xs" style={{ color: palette.textMuted }} numberOfLines={1}>
            {schedule.notes}
          </ZText>
        )}
      </View>

      {/* Right: amount + status + pay btn */}
      <View style={[styles.right, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
        <ZText weight="bold" size="sm" style={{ color: palette.text }}>
          {formatMoney(schedule.amount)}
        </ZText>
        <View style={[styles.badge, { backgroundColor: statusBg }]}>
          <ZText size="xs" style={{ color: statusColor, fontWeight: '600' }}>
            {t(`scheduleStatus.${schedule.status}`)}
          </ZText>
        </View>
        {isPayable && onPay && (
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: `${INSTALLMENT_ACCENT}18` }]}
            onPress={() => onPay(schedule)}
            activeOpacity={0.75}
          >
            <Ionicons name="card-outline" size={14} color={INSTALLMENT_ACCENT} />
            <ZText size="xs" style={{ color: INSTALLMENT_ACCENT, fontWeight: '600' }}>
              {t('detail.payInstallment')}
            </ZText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default ScheduleRow;

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  right: {
    flexShrink: 0,
    gap: Spacing[1],
  },
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-end',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.md,
    marginTop: 2,
  },
});
