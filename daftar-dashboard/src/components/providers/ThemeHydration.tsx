"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useSidebarStore } from "@/stores/sidebar-store";

/**
 * Store Hydration Component
 * يحمل الـ stores من localStorage/sessionStorage بعد mount
 */
export function StoreHydration() {
  useEffect(() => {
    // Rehydrate theme store
    useThemeStore.persist.rehydrate();
    
    // Apply the theme to the DOM
    const theme = useThemeStore.getState().theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Rehydrate sidebar store
    useSidebarStore.persist.rehydrate();

    // Auth state is sourced from AuthProvider/cookies.
    // Avoid rehydrating stale sessionStorage auth snapshot that can drift permissions.
  }, []);

  return null;
}

// For backwards compatibility
export const ThemeHydration = StoreHydration;
