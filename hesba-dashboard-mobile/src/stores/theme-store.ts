/**
 * Theme Store — Dafter Client Mobile
 *
 * Mirrors the web dashboard's src/stores/theme-store.ts exactly,
 * replacing localStorage with AsyncStorage (mobile equivalent).
 *
 * Architecture:
 * - Zustand + persist middleware for state management and persistence.
 * - `skipHydration: true` prevents automatic rehydration on store creation.
 *   We manually call `useThemeStore.persist.rehydrate()` inside the
 *   StoreHydration component to control the exact timing (after splash screen
 *   is shown, before the app renders).
 * - Selectors pattern prevents unnecessary re-renders in consumers.
 * - NativeWind's `setColorScheme` is synced via a Zustand subscription
 *   inside StoreHydration — this is the mobile equivalent of the web's
 *   `applyTheme()` that adds/removes `.dark` on `document.documentElement`.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    {
      name: "dafter-theme",
      storage: createJSONStorage(() => AsyncStorage),
      /**
       * skipHydration: true — prevents Zustand from auto-hydrating
       * when the store is first accessed. We control hydration timing
       * manually in StoreHydration.tsx to avoid theme flicker.
       */
      skipHydration: true,
    },
  ),
);

// ─── Selectors (prevent unnecessary re-renders) ───────────────────────────────

const selectTheme = (state: ThemeState) => state.theme;
const selectSetTheme = (state: ThemeState) => state.setTheme;
const selectToggleTheme = (state: ThemeState) => state.toggleTheme;

// ─── Primary Hook ─────────────────────────────────────────────────────────────

/**
 * Primary hook for consuming theme state.
 *
 * Returns a memoized object — same performance pattern as the web store.
 * Use this hook in components; use `useThemeStore.getState()` for non-React code
 * (e.g., inside the Axios client interceptor).
 *
 * @example
 *   const { isDark, toggleTheme } = useTheme();
 *   <View style={{ backgroundColor: isDark ? '#0f172a' : '#fff' }} />
 */
export function useTheme() {
  const theme = useThemeStore(selectTheme);
  const setTheme = useThemeStore(selectSetTheme);
  const toggleTheme = useThemeStore(selectToggleTheme);

  return useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      isLight: theme === "light",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );
}
