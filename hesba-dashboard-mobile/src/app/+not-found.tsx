/**
 * 404 Not Found Screen
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { useTheme } from '@/stores/theme-store';
import { Colors, Layout, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  const { isDark } = useTheme();
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ZText size="5xl" style={styles.emoji}>🔍</ZText>
      <ZText weight="bold" size="2xl" style={styles.title}>404</ZText>
      <ZText variant="secondary" style={styles.subtitle}>
        الصفحة غير موجودة
      </ZText>
      <Link href={'/(client)' as never} asChild>
        <ZButton variant="primary" style={styles.btn}>
          العودة للرئيسية
        </ZButton>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.screenPadding,
    gap: Spacing[3],
  },
  emoji: { textAlign: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  btn: { marginTop: Spacing[4] },
});
