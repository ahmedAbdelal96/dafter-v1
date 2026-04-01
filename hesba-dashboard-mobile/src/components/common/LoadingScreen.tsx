/**
 * LoadingScreen — Full-screen loading state
 *
 * Used as a fallback while data is loading or screens are transitioning.
 * Respects the current theme for background color.
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ZText } from '@/components/ui/ZText';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { isDark } = useTheme();
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
      {message && (
        <ZText variant="secondary" size="sm" style={styles.message}>
          {message}
        </ZText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    marginTop: 8,
  },
});
