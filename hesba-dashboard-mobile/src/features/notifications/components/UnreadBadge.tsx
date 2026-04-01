/**
 * UnreadBadge — small orange badge showing unread notification count.
 *
 * Usage: Place over notification menu item in menu.tsx
 *   <View>
 *     <Ionicons name="notifications-outline" />
 *     <UnreadBadge />
 *   </View>
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ZText } from '@/components/ui/ZText';
import { useUnreadCount } from '../hooks/useNotifications';
import { NOTIF_ACCENT } from '../types';

interface Props {
  /** Override position for absolute placement */
  top?: number;
  right?: number;
}

export function UnreadBadge({ top = -4, right = -6 }: Props) {
  const { data: count = 0 } = useUnreadCount();

  if (count === 0) return null;

  return (
    <View style={[styles.badge, { top, right, backgroundColor: NOTIF_ACCENT }]}>
      <ZText size="xs" weight="bold" style={styles.text}>
        {count > 99 ? '99+' : String(count)}
      </ZText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  text: {
    color: '#fff',
    fontSize: 9,
    lineHeight: 13,
  },
});
