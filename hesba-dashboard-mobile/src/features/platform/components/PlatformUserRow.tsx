/**
 * PlatformUserRow — compact list item for the Platform Users screen.
 *
 * Shows: avatar initials | full name + email | role badge | active/disabled pill
 * OWNER rows are visually distinguished (violet badge).
 * Tap → callback for action sheet (disable / enable / edit).
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { PLATFORM_ACCENT, type PlatformUser } from '../types';

interface Props {
  user: PlatformUser;
  onPress: (user: PlatformUser) => void;
}

export const PlatformUserRow = memo(function PlatformUserRow({ user, onPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const palette = isDark ? Colors.dark : Colors.light;

  const isOwner = user.role === 'OWNER';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: isDark ? Colors.dark.surface : '#fff',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={() => onPress(user)}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <ZAvatar name={user.fullName} size="sm" />

      {/* Name + email */}
      <View style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <ZText size="sm" weight="semibold" numberOfLines={1} style={{ color: palette.text }}>
          {user.fullName}
        </ZText>
        <ZText size="xs" variant="secondary" numberOfLines={1}>
          {user.email}
        </ZText>
      </View>

      {/* Badges */}
      <View style={[styles.badges, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
        <View
          style={[
            styles.rolePill,
            {
              backgroundColor: isOwner ? `${PLATFORM_ACCENT}15` : (isDark ? Colors.dark.surfaceSecondary : '#f3f4f6'),
            },
          ]}
        >
          <ZText
            size="xs"
            weight="bold"
            style={{ color: isOwner ? PLATFORM_ACCENT : palette.textMuted }}
          >
            {isOwner ? t('users.roleOwner') : t('users.roleStaff')}
          </ZText>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: user.isActive ? '#f0fdf4' : '#fef2f2' },
          ]}
        >
          <ZText
            size="xs"
            weight="medium"
            style={{ color: user.isActive ? '#16a34a' : '#dc2626' }}
          >
            {user.isActive ? t('users.active') : t('users.disabled')}
          </ZText>
        </View>
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
  info: { flex: 1, gap: 2 },
  badges: { gap: Spacing[1] },
  rolePill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusPill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
});
