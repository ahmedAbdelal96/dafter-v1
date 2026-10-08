/**
 * ScreenHeader — Consistent top header for all dashboard screens.
 *
 * Provides: title, optional subtitle, optional back button, and an
 * optional right-side action slot (e.g. a "+ New" button or filter icon).
 * Adapts to RTL layout automatically.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { Colors, Spacing, Layout } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
}: ScreenHeaderProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();

  const palette = isDark ? Colors.dark : Colors.light;
  // In RTL, the back chevron points to the right
  const backIcon: React.ComponentProps<typeof Ionicons>['name'] = isRTL
    ? 'chevron-forward'
    : 'chevron-back';

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          borderBottomColor: palette.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      {/* Back button */}
      {showBack && (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name={backIcon} size={24} color={palette.text} />
        </TouchableOpacity>
      )}

      {/* Title block */}
      <View style={styles.titleBlock}>
        <ZText weight="bold" size="xl" numberOfLines={1}>
          {title}
        </ZText>
        {subtitle && (
          <ZText variant="secondary" size="sm" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </ZText>
        )}
      </View>

      {/* Right action */}
      {rightAction && (
        <View style={styles.rightAction}>{rightAction}</View>
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: Layout.headerHeight,
    paddingHorizontal: Layout.screenPadding,
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: Spacing[1],
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 1,
  },
  rightAction: {
    marginStart: Spacing[2],
  },
});
