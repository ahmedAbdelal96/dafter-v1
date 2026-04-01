/**
 * ZAvatar — User/staff/client avatar with image fallback to initials.
 *
 * Shows a circular image if a URL is provided, otherwise renders
 * initials on a brand-tinted background. Size variants match common usages.
 */
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ZText } from './ZText';
import { Colors, Radius } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ZAvatarProps {
  uri?: string | null;
  initials?: string;
  name?: string;
  size?: AvatarSize | number;
  color?: string;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<AvatarSize, { container: number; fontSize: number }> = {
  xs: { container: 28, fontSize: 10 },
  sm: { container: 36, fontSize: 13 },
  md: { container: 44, fontSize: 16 },
  lg: { container: 56, fontSize: 20 },
  xl: { container: 72, fontSize: 26 },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getInitials(name?: string, initials?: string): string {
  if (initials) return initials.slice(0, 2).toUpperCase();
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ZAvatar = React.memo(function ZAvatar({
  uri,
  initials,
  name,
  size = 'md',
}: ZAvatarProps) {
  const { isDark } = useTheme();
  
  const container = typeof size === 'number' ? size : SIZE_MAP[size].container;
  const fontSize = typeof size === 'number' ? size * 0.4 : SIZE_MAP[size].fontSize;
  
  const letters = getInitials(name, initials);

  const containerStyle = {
    width: container,
    height: container,
    borderRadius: Radius.full,
    overflow: 'hidden' as const,
  };

  if (uri) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor: isDark
            ? 'rgba(196, 120, 127, 0.25)'
            : Colors.brand.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <ZText
        weight="semibold"
        style={{ fontSize, color: isDark ? Colors.brand.primaryDark : Colors.brand.primaryActive }}
      >
        {letters}
      </ZText>
    </View>
  );
});
