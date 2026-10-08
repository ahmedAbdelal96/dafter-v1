/**
 * NotificationCard — single notification row.
 *
 * Visual hierarchy:
 *   [unread accent bar] [type icon box] [title + body] [time]
 *
 * Unread state: left accent border (orange) + slightly elevated bg
 * Read state: no border + muted bg
 *
 * Tapping auto-marks as read.
 */
import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  NOTIF_ACCENT,
  getTypeConfig,
  formatRelativeTime,
  type Notification,
} from '../types';

interface Props {
  item: Notification;
  onPress: (id: string) => void;
}

const NotificationCard = memo(function NotificationCard({ item, onPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  const isUnread = item.readAt === null;
  const typeConfig = getTypeConfig(item.type);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isUnread
            ? (isDark ? '#1c1917' : '#fff')
            : (isDark ? Colors.dark.surface : '#fafafa'),
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      {/* ── Unread accent bar ── */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: isUnread ? NOTIF_ACCENT : 'transparent',
            // For RTL, the bar goes on the right side
            [isRTL ? 'borderTopRightRadius' : 'borderTopLeftRadius']: Radius.xl,
            [isRTL ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: Radius.xl,
          },
        ]}
      />

      {/* ── Icon box ── */}
      <View
        style={[
          styles.iconBox,
          { backgroundColor: typeConfig.bgColor },
        ]}
      >
        <Ionicons
          name={typeConfig.icon as any}
          size={19}
          color={typeConfig.color}
        />
      </View>

      {/* ── Content ── */}
      <View style={[styles.content, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText
            weight={isUnread ? 'bold' : 'medium'}
            size="sm"
            numberOfLines={1}
            style={{ color: palette.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }}
          >
            {item.title}
          </ZText>
          {isUnread && (
            <View style={[styles.unreadDot, { backgroundColor: NOTIF_ACCENT }]} />
          )}
        </View>

        <ZText
          size="xs"
          variant="secondary"
          numberOfLines={2}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {item.body}
        </ZText>

        <ZText
          size="xs"
          style={{
            color: isUnread ? NOTIF_ACCENT : palette.textMuted,
            textAlign: isRTL ? 'right' : 'left',
            marginTop: 2,
          }}
        >
          {formatRelativeTime(item.createdAt)}
        </ZText>
      </View>
    </TouchableOpacity>
  );
});

export default NotificationCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing[3],
    marginStart: Spacing[3],
  },
  content: {
    flex: 1,
    gap: 3,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
  },
  titleRow: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
