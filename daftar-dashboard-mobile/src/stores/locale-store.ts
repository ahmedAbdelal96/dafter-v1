/**
 * Locale Store — Dafter Client Mobile
 *
 * Manages language (Arabic/English) and RTL/LTR direction.
 * Mirrors the web dashboard pattern, adapted for React Native's
 * I18nManager and the need for app restart when direction changes.
 *
 * Arabic is the default locale — same as web `defaultLocale: 'ar'`.
 *
 * RTL Notes:
 * - `I18nManager.forceRTL()` sets the layout direction.
 * - A full direction change (LTR ↔ RTL) requires an app restart for the
 *   React Native layout engine to re-apply flex direction, padding, etc.
 * - Text alignment and writingDirection styles can update without restart.
 * - The `changeLocale` action returns `{ needsRestart: boolean }` so the
 *   UI layer can show a "Please restart" dialog when needed.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = "ar" | "en";

interface LocaleState {
  locale: Locale;
  /**
   * Change the app locale. Updates i18n language immediately.
   * Returns `{ needsRestart: true }` if the RTL direction changed,
   * meaning the UI should prompt the user to restart.
   */
  changeLocale: (locale: Locale) => Promise<{ needsRestart: boolean }>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "ar", // Default: Arabic, same as web defaultLocale

      changeLocale: async (locale) => {
        // Update Zustand state and persist to AsyncStorage
        set({ locale });

        // Update i18n language immediately (translations update without restart)
        await i18n.changeLanguage(locale);

        // Determine if RTL direction needs to change
        const isRTL = locale === "ar";
        const directionChanged = I18nManager.isRTL !== isRTL;

        if (directionChanged) {
          // Apply the new RTL setting — takes full effect after restart
          I18nManager.forceRTL(isRTL);
        }

        // Tell the caller if a restart is needed for full layout direction change
        return { needsRestart: directionChanged };
      },
    }),
    {
      name: "dafter-locale",
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectLocale = (state: LocaleState) => state.locale;
const selectChangeLocale = (state: LocaleState) => state.changeLocale;

// ─── Primary Hook ─────────────────────────────────────────────────────────────

/**
 * Primary hook for consuming locale state.
 *
 * @example
 *   const { locale, isRTL, changeLocale } = useLocale();
 *   <Text style={{ textAlign: isRTL ? 'right' : 'left' }}>{...}</Text>
 */
export function useLocale() {
  const locale = useLocaleStore(selectLocale);
  const changeLocale = useLocaleStore(selectChangeLocale);

  return useMemo(
    () => ({
      locale,
      isRTL: locale === "ar",
      isArabic: locale === "ar",
      /** Font locale key for use with getFontFamily() from theme.ts */
      fontLocale: (locale === "ar" ? "arabic" : "latin") as "arabic" | "latin",
      changeLocale,
    }),
    [locale, changeLocale],
  );
}
