/**
 * EmptyState — Shown when a list has no data.
 *
 * Provides a centered icon, title, description, and optional CTA button.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'document-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { isDark } = useTheme();
  const iconColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.light.surface },
        ]}
      >
        <Ionicons name={icon} size={40} color={iconColor} />
      </View>

      <ZText weight="semibold" size="lg" style={styles.title}>
        {title}
      </ZText>

      {description && (
        <ZText variant="secondary" size="sm" style={styles.description}>
          {description}
        </ZText>
      )}

      {actionLabel && onAction && (
        <ZButton onPress={onAction} size="md" style={styles.action}>
          {actionLabel}
        </ZButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[12],
    gap: Spacing[3],
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: Spacing[2],
  },
});
