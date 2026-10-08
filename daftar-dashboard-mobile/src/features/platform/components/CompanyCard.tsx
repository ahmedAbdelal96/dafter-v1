/**
 * CompanyCard — tenant row for the Super Admin companies list.
 *
 * Shows: company name, phone, user count, active subscription status + plan name.
 * Status pill is color-coded by subscription status.
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
  PLATFORM_ACCENT,
  getSubStatusConfig,
  getActiveSubscription,
  type Company,
} from '../types';

interface Props {
  item: Company;
  onPress: (company: Company) => void;
}

const CompanyCard = memo(function CompanyCard({ item, onPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const palette = isDark ? Colors.dark : Colors.light;

  const sub = getActiveSubscription(item);
  const statusConfig = sub ? getSubStatusConfig(sub.status) : null;
  const attentionLabel = item.isDeleted
    ? t('companies.attention.archived', { defaultValue: 'Archived workspace' })
    : !item.isActive
      ? t('companies.attention.inactive', { defaultValue: 'Inactive workspace' })
      : sub?.status === 'SUSPENDED'
        ? t('companies.attention.suspended', { defaultValue: 'Subscription suspended' })
        : sub?.status === 'EXPIRED'
          ? t('companies.attention.expired', { defaultValue: 'Subscription expired' })
          : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : '#fff',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Icon box */}
      <View style={[styles.iconBox, { backgroundColor: `${PLATFORM_ACCENT}15` }]}>
        <Ionicons name="business" size={20} color={PLATFORM_ACCENT} />
      </View>

      {/* Info */}
      <View
        style={[
          styles.info,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <ZText
          weight="semibold"
          size="sm"
          numberOfLines={1}
          style={{ color: palette.text }}
        >
          {item.name}
        </ZText>
        <View
          style={[
            styles.metaRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {item.phone ? (
            <ZText size="xs" variant="secondary" numberOfLines={1}>
              {item.phone}
            </ZText>
          ) : null}
          <View
            style={[
              styles.userCount,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons name="people-outline" size={11} color={palette.textMuted} />
            <ZText size="xs" variant="secondary">
              {item._count.users}
            </ZText>
          </View>
        </View>

        {/* Plan name */}
        {sub?.plan?.name ? (
          <ZText size="xs" style={{ color: PLATFORM_ACCENT }}>
            {sub.plan.name}
          </ZText>
        ) : null}
        {attentionLabel ? (
          <View style={styles.attentionBadge}>
            <Ionicons name="alert-circle-outline" size={12} color="#b45309" />
            <ZText size="xs" weight="bold" style={{ color: '#b45309' }}>
              {attentionLabel}
            </ZText>
          </View>
        ) : null}
      </View>

      {/* Status pill */}
      {statusConfig ? (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusConfig.bgColor },
          ]}
        >
          <Ionicons
            name={statusConfig.icon as any}
            size={12}
            color={statusConfig.color}
          />
          <ZText
            size="xs"
            weight="bold"
            style={{ color: statusConfig.color }}
          >
            {t(`subStatus.${sub!.status}`)}
          </ZText>
        </View>
      ) : (
        <View style={[styles.statusPill, { backgroundColor: '#f3f4f6' }]}>
          <ZText size="xs" style={{ color: palette.textMuted }}>
            {t('noSub')}
          </ZText>
        </View>
      )}

      <Ionicons
        name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
        size={15}
        color={palette.textMuted}
        style={{ marginStart: Spacing[1] }}
      />
    </TouchableOpacity>
  );
});

export default CompanyCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    alignItems: 'center',
    padding: Spacing[3],
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  userCount: {
    alignItems: 'center',
    gap: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  attentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
});
