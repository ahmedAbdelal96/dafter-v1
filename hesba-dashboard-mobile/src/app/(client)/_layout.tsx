/**
 * Client Tab Layout — Protected bottom-tab navigator (Daftar)
 *
 * Tab structure (5 tabs — optimised for merchant accounting workflow):
 *   1. Home       — Dashboard KPIs & quick actions
 *   2. Customers  — Customer list
 *   3. Invoices   — Invoice management
 *   4. Payments   — Payments / Receivables management
 *   5. More       — All other modules
 *
 * Hidden screens remain reachable via programmatic navigation.
 */
import React from 'react';
import { StyleSheet, Animated, Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/stores/auth-store';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Colors, Fonts, FontSize, Spacing } from '@/constants/theme';

// ─── Icon Registry ────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconDef {
  outline: IoniconsName;
  filled: IoniconsName;
}

const TAB_ICONS: Record<string, TabIconDef> = {
  index:     { outline: 'home-outline',      filled: 'home' },
  customers: { outline: 'people-outline',    filled: 'people' },
  invoices:  { outline: 'receipt-outline',   filled: 'receipt' },
  payments:  { outline: 'cash-outline',      filled: 'cash' },
  menu:      { outline: 'grid-outline',      filled: 'grid' },
  
  // Hidden tabs
  ledger:        { outline: 'book-outline',        filled: 'book' },
  suppliers:     { outline: 'storefront-outline',  filled: 'storefront' },
  employees:     { outline: 'id-card-outline',     filled: 'id-card' },
  expenses:      { outline: 'wallet-outline',      filled: 'wallet' },
  products:      { outline: 'cube-outline',        filled: 'cube' },
  reports:       { outline: 'bar-chart-outline',   filled: 'bar-chart' },
  notifications: { outline: 'notifications-outline', filled: 'notifications' },
  profile:       { outline: 'settings-outline',    filled: 'settings' },
};

// ─── Animated Tab Icon ────────────────────────────────────────────────────────

function AnimatedTabIcon({
  routeName,
  color,
  focused,
  size,
}: {
  routeName: string;
  color: string;
  focused: boolean;
  size: number;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 10,
    }).start();
  }, [focused, scaleAnim]);

  const def = TAB_ICONS[routeName] ?? {
    outline: 'ellipse-outline',
    filled: 'ellipse',
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Ionicons
        name={focused ? def.filled : def.outline}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function ClientLayout() {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const { isDark } = useTheme();
  const { fontLocale } = useLocale();
  const { t } = useTranslation('common');

  const palette = isDark ? Colors.dark : Colors.light;
  const fontFamily =
    fontLocale === 'arabic' ? Fonts.arabic.medium : Fonts.latin.medium;

  if (!isInitialized) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role === 'SUPER_ADMIN') return <Redirect href="/(platform)" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,

        // ── Tab bar appearance ─────────────────────────────────────────────
        tabBarStyle: {
          backgroundColor: isDark ? "rgba(15, 23, 32, 0.95)" : "rgba(255, 255, 255, 0.95)", // Glass effect base
          borderTopColor: palette.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: Spacing[2],
          paddingBottom: Platform.OS === 'ios' ? 24 : Spacing[2],
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 12,
            },
            android: { elevation: 12 },
          }),
        },

        tabBarActiveTintColor: Colors.brand.primary,
        tabBarInactiveTintColor: palette.textMuted,

        tabBarLabelStyle: {
          fontFamily,
          fontSize: 10,
          marginTop: 4,
        },

        tabBarHideOnKeyboard: true,

        tabBarIcon: ({ color, focused, size }) => (
          <AnimatedTabIcon
            routeName={route.name}
            color={color}
            focused={focused}
            size={24}
          />
        ),
      })}
    >
      {/* ── Visible tabs ────────────────────────────────────────────────── */}

      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home', 'الرئيسية') }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: t('nav.customers', 'العملاء'),
          popToTopOnBlur: true,
        }}
      />

      <Tabs.Screen
        name="invoices"
        options={{
          title: t('nav.invoices', 'الفواتير'),
          popToTopOnBlur: true,
        }}
      />

      <Tabs.Screen
        name="payments"
        options={{
          title: t('nav.payments', 'المدفوعات'),
          popToTopOnBlur: true,
        }}
      />

      <Tabs.Screen
        name="menu"
        options={{ title: t('nav.more', 'المزيد') }}
      />

      {/* ── Hidden screens ─────── */}
      <Tabs.Screen name="ledger"         options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="suppliers"      options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="employees"      options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="expenses"       options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="products"       options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="deferred-sales" options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="installments"   options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="payroll"        options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="reports"        options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="notifications"  options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="users"          options={{ href: null, popToTopOnBlur: true }} />
      <Tabs.Screen name="profile"        options={{ href: null }} />
      <Tabs.Screen name="company-settings" options={{ href: null }} />
      <Tabs.Screen name="subscriptions"  options={{ href: null }} />
    </Tabs>
  );
}
