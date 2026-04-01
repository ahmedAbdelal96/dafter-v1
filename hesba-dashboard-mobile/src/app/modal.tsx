/**
 * Modal screen — kept from template, updated to use Zayna design system.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { Colors, Layout } from '@/constants/theme';

export default function ModalScreen() {
  const { isDark } = useTheme();
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ZText weight="bold" size="xl">Modal</ZText>
      <Link href={'/(client)' as never} style={styles.link}>
        <ZText variant="brand">Go to Home</ZText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Layout.screenPadding },
  link: { marginTop: 15, paddingVertical: 15 },
});
