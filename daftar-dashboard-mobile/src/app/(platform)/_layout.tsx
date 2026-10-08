/**
 * Platform Layout — Super Admin tab navigator
 *
 * Only accessible to SUPER_ADMIN role.
 * Any other role is redirected to (client) immediately.
 *
 * Tabs: Dashboard | Companies | Plans | More
 */
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/auth-store';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Colors, Fonts, FontSize, Spacing } from '@/constants/theme';
import { PLATFORM_ACCENT } from '@/features/platform/types';

export default function PlatformLayout() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const { isDark } = useTheme();
  const { fontLocale } = useLocale();
  const { t } = useTranslation('platform');

  const palette = isDark ? Colors.dark : Colors.light;
  const fontFamily =
    fontLocale === 'arabic' ? Fonts.arabic.medium : Fonts.latin.medium;

  if (!isInitialized) return <LoadingScreen />;

  // Redirect non-authenticated users to login
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // Redirect company users (non-super-admin) to their area
  if (user?.role !== 'SUPER_ADMIN') return <Redirect href="/(client)" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: PLATFORM_ACCENT,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          borderTopColor: palette.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: Spacing[1.5],
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.2 : 0.07,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        },
        tabBarLabelStyle: {
          fontFamily,
          fontSize: FontSize.xs,
          marginTop: Spacing[0.5],
          marginBottom: Platform.OS === 'android' ? Spacing[1] : 0,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          title: t('tabs.companies'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: t('tabs.subscriptions'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t('tabs.plans'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screen — no tab bar entry */}
      <Tabs.Screen
        name="company-users"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="audit-logs"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="platform-settings"
        options={{ href: null }}
      />
    </Tabs>
  );
}
