/**
 * StoreHydration — Zayna Client Mobile
 *
 * The app's bootstrap component. Mirrors ThemeHydration.tsx from the web
 * dashboard, extended with mobile-specific concerns (fonts, RTL, splash screen).
 *
 * Responsibilities (in order):
 * 1. Load custom fonts (Cairo + Inter) via expo-font.
 * 2. Rehydrate all Zustand stores from AsyncStorage (async operation).
 * 3. Apply the saved theme to NativeWind's colorScheme.
 * 4. Initialize i18n with the saved locale.
 * 5. Apply RTL/LTR direction via I18nManager.
 * 6. Subscribe to future theme changes → sync to NativeWind automatically.
 * 7. Hide the splash screen once everything is ready.
 *
 * The app renders null (splash screen remains visible) until all of the
 * above complete. This prevents any visible flash of wrong theme/language.
 */
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { I18nManager } from "react-native";
import { useColorScheme } from "nativewind";

// Google Fonts
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

// Stores
import { useThemeStore } from "@/stores/theme-store";
import { useLocaleStore } from "@/stores/locale-store";
import { useAuthStore } from "@/stores/auth-store";
import i18n from "@/i18n";

interface StoreHydrationProps {
  children: React.ReactNode;
}

export function StoreHydration({ children }: StoreHydrationProps) {
  const [isReady, setIsReady] = useState(false);

  // ── NativeWind color scheme setter ────────────────────────────────────────
  // This is the mobile equivalent of adding/removing `.dark` on <html>.
  const { setColorScheme } = useColorScheme();

  // ── Load fonts ────────────────────────────────────────────────────────────
  // Font keys MUST match the fontFamily values in tailwind.config.js and theme.ts.
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ── Subscribe to theme store → sync to NativeWind ─────────────────────────
  // Runs once on mount; the subscription stays active for the app's lifetime.
  // Zustand v5 subscribe takes a single (state, prevState) callback.
  // We compare theme values to avoid calling setColorScheme on unrelated changes.
  useEffect(() => {
    const unsubscribe = useThemeStore.subscribe((state, prevState) => {
      if (state.theme !== prevState.theme) {
        setColorScheme(state.theme);
      }
    });
    return unsubscribe;
  }, [setColorScheme]);

  // ── One-time boot hydration ───────────────────────────────────────────────
  useEffect(() => {
    // Wait for fonts before doing anything (avoids FOUT — flash of unstyled text)
    if (!fontsLoaded && !fontError) return;

    async function hydrate() {
      try {
        // Step 1: Rehydrate all persisted stores from AsyncStorage in parallel.
        // skipHydration: true in each store means they won't auto-hydrate;
        // we call rehydrate() here to control the exact timing.
        // Auth store uses SecureStore directly (not Zustand persist),
        // so it has no .persist — it's initialized separately below.
        await Promise.all([
          useThemeStore.persist.rehydrate(),
          useLocaleStore.persist.rehydrate(),
        ]);

        // Step 2: Apply saved theme to NativeWind.
        // getState() reads the now-hydrated state directly from the store.
        const { theme } = useThemeStore.getState();
        setColorScheme(theme);

        // Step 3: Initialize i18n with the saved locale.
        const { locale } = useLocaleStore.getState();
        await i18n.changeLanguage(locale);

        // Step 4: Apply RTL/LTR layout direction.
        // allowRTL must be called before forceRTL to take effect.
        const isRTL = locale === "ar";
        I18nManager.allowRTL(true);
        // Only change direction if it differs — avoids unnecessary layout work.
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.forceRTL(isRTL);
          // Note: A direction change here only fully applies after app restart.
          // On first install, this runs before the first render, so it IS correct.
          // For subsequent locale changes (ltr↔rtl), the locale store's
          // changeLocale() action informs the UI to prompt for restart.
        }

        // Step 5: Initialize auth (validates stored tokens)
        await useAuthStore.getState().initialize();
      } catch (error) {
        // Fail gracefully — app renders with defaults rather than staying stuck.
        if (__DEV__) {
          console.error("[StoreHydration] Hydration failed:", error);
        }
      } finally {
        // Step 6: Mark as ready and hide the splash screen.
        // `finally` ensures this always runs, even if an error occurred.
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {
          // hideAsync can throw if splash was already hidden — safe to ignore.
        });
      }
    }

    hydrate();
  }, [fontsLoaded, fontError, setColorScheme]);

  // Render nothing until everything is ready.
  // The native splash screen is still visible at this point.
  if (!isReady) return null;

  return <>{children}</>;
}
