/**
 * UserCard — single staff member row.
 *
 * Visual hierarchy:
 *   [Avatar] [fullName + email] [role badge] [status dot]
 *
 * Status: green dot = ACTIVE, gray dot = DISABLED
 * Role badge: Owner = sky-filled, Staff = sky-outlined
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { USERS_ACCENT, type User } from '../types';

interface Props {
  item: User;
  onPress: (user: User) => void;
}

const UserCard = memo(function UserCard({ item, onPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('users');
  const palette = isDark ? Colors.dark : Colors.light;

  const isActive = item.status === 'ACTIVE';
  const isOwner = item.role === 'OWNER';

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
      {/* Avatar with status indicator */}
      <View style={styles.avatarWrap}>
        <ZAvatar name={item.fullName} size={44} color={USERS_ACCENT} />
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isActive ? '#16a34a' : palette.textMuted,
              [isRTL ? 'left' : 'right']: 0,
            },
          ]}
        />
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
          {item.fullName}
        </ZText>
        <ZText
          size="xs"
          variant="secondary"
          numberOfLines={1}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {item.email}
        </ZText>
      </View>

      {/* Role badge */}
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor: isOwner ? USERS_ACCENT : `${USERS_ACCENT}18`,
            borderWidth: isOwner ? 0 : 1,
            borderColor: `${USERS_ACCENT}40`,
          },
        ]}
      >
        <ZText
          size="xs"
          weight="bold"
          style={{ color: isOwner ? '#fff' : USERS_ACCENT }}
        >
          {t(`role.${item.role}`)}
        </ZText>
      </View>

      {/* Chevron */}
      <Ionicons
        name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
        size={15}
        color={palette.textMuted}
        style={{ marginStart: Spacing[1] }}
      />
    </TouchableOpacity>
  );
});

export default UserCard;

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
  avatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  roleBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
});
