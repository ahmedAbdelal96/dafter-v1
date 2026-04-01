/**
 * SubscriptionRow — compact list item for the Subscriptions screen.
 *
 * Shows: company icon + name + phone | plan + billing cycle | status pill + days-left badge
 * Tap → CompanyDetailSheet (which has all action forms).
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
  getActiveSubscription,
  getSubStatusConfig,
  PLATFORM_ACCENT,
  type Company,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDaysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  company: Company;
  onPress: (company: Company) => void;
}

export const SubscriptionRow = memo(function SubscriptionRow({ company, onPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const palette = isDark ? Colors.dark : Colors.light;

  const sub = getActiveSubscription(company);
  const cfg = sub ? getSubStatusConfig(sub.status) : null;
  const days = sub?.endDate ? calcDaysLeft(sub.endDate) : null;
  const isExpiringSoon = days !== null && days >= 0 && days <= 14;
  const isExpired = days !== null && days < 0;

  // Days-left text color
  const daysColor = isExpired
    ? '#dc2626'
    : isExpiringSoon
    ? '#d97706'
    : palette.textMuted;

  // Days-left label
  const daysLabel =
    days === null
      ? null
      : isExpired
      ? t('subscriptions.expired')
      : t('subscriptions.daysLeft', { count: days });

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isDark ? Colors.dark.surface : '#fff',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={() => onPress(company)}
      activeOpacity={0.75}
    >
      {/* Company icon */}
      <View style={[styles.icon, { backgroundColor: `${PLATFORM_ACCENT}15` }]}>
        <Ionicons name="business" size={18} color={PLATFORM_ACCENT} />
      </View>

      {/* Name + plan */}
      <View
        style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
      >
        <ZText
          size="sm"
          weight="semibold"
          numberOfLines={1}
          style={{ color: palette.text }}
        >
          {company.name}
        </ZText>

        {sub ? (
          <ZText size="xs" variant="secondary" numberOfLines={1}>
            {sub.plan.name}
            {' · '}
            {t(`billing.${sub.plan.billingCycle}`)}
          </ZText>
        ) : (
          <ZText size="xs" variant="secondary">
            {t('subscriptions.noSub')}
          </ZText>
        )}
      </View>

      {/* Status pill + days left */}
      <View style={[styles.right, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
        {cfg ? (
          <View style={[styles.pill, { backgroundColor: cfg.bgColor }]}>
            <ZText size="xs" weight="bold" style={{ color: cfg.color }}>
              {t(`subStatus.${sub!.status}`)}
            </ZText>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: palette.surfaceSecondary ?? '#f3f4f6' }]}>
            <ZText size="xs" variant="secondary">—</ZText>
          </View>
        )}

        {daysLabel ? (
          <ZText size="xs" style={{ color: daysColor, marginTop: 3 }}>
            {daysLabel}
          </ZText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    elevation: 1,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  right: { gap: 0 },
  pill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
});
