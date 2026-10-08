/**
 * Root Layout — Dafter Client Mobile
 *
 * Entry point for the entire application.
 * Responsibilities (in order):
 * 1. Import global.css to activate NativeWind Tailwind processing.
 * 2. Call SplashScreen.preventAutoHideAsync() at module level (before render).
 * 3. Allow RTL layout at module level (must be before any rendering).
 * 4. Wrap everything in AppProviders (React Query + i18n).
 * 5. Render StoreHydration which: loads fonts, rehydrates stores,
 *    applies theme/locale/RTL, then hides splash.
 * 6. Render the themed navigator (only after hydration is complete).
 */

// IMPORTANT: global.css MUST be first import so NativeWind
// processes Tailwind classes before any component renders.
import "../global.css";

import React from "react";
import { Stack } from "expo-router";
import { I18nManager } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { AppProviders } from "@/components/providers/AppProviders";
import { StoreHydration } from "@/components/providers/StoreHydration";
import { LoggerSetup } from "@/components/providers/LoggerSetup";
import { useTheme } from "@/stores/theme-store";
import { Colors } from "@/constants/theme";

// ── Module-level side effects (run before first render) ───────────────────────

/**
 * Keep the splash screen visible until StoreHydration calls hideAsync().
 * Prevents any flash of wrong theme, language, or unstyled content.
 */
SplashScreen.preventAutoHideAsync();

/**
 * Allow RTL layout globally — must be called before the first render
 * for I18nManager to register the direction with the RN layout engine.
 * Actual direction (RTL/LTR) is set in StoreHydration from persisted locale.
 */
I18nManager.allowRTL(true);

// ── Customized React Navigation Themes ───────────────────────────────────────
// Extends default themes with Dafter brand colors so all RN navigation
// elements (headers, tab bars, modals) use the correct palette.

const DafterLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.brand.primary,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const DafterDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.brand.primaryDark,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <AppProviders>
      {/*
       * StoreHydration handles all async boot work.
       * Children only render AFTER hydration is complete.
       */}
      <StoreHydration>
        <ThemedNavigator />
      </StoreHydration>
    </AppProviders>
  );
}

/**
 * ThemedNavigator is a separate component so it can consume the theme store.
 * It only renders after StoreHydration completes, guaranteeing the store
 * has the correct persisted theme when useTheme() is first called.
 */
function ThemedNavigator() {
  const { isDark } = useTheme();

  return (
    <ThemeProvider value={isDark ? DafterDarkTheme : DafterLightTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LoggerSetup />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Public screens — no authentication required */}
        <Stack.Screen name="(auth)" />
        {/* Company user screens (OWNER / STAFF) */}
        <Stack.Screen name="(client)" />
        {/* Super Admin screens — completely separate navigation tree */}
        <Stack.Screen name="(platform)" />
        {/* Developer log viewer — navigate with router.push('/(debug)/logs') */}
        <Stack.Screen name="(debug)/logs" />
        {/* 404 fallback */}
        <Stack.Screen
          name="+not-found"
          options={{ headerShown: true, title: "Not Found" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
