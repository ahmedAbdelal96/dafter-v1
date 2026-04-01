/**
 * Dafter Design System — Mobile Tokens
 *
 * Single source of truth for all design values.
 * Mirrors the CSS variables defined in dafter-dashboard/src/app/globals.css,
 * ensuring visual consistency across web and mobile platforms.
 *
 * Usage:
 *   import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
 *   const color = isDark ? Colors.dark.text : Colors.light.text;
 */

import { Platform } from "react-native";

// ─── Color Palette ────────────────────────────────────────────────────────────

export const Colors = {
  /**
   * Brand colors — Premium Green, matching Daftar design system.
   * These are locale/theme-independent; always the same raw values.
   */
  brand: {
    primary: "#1F7A5A", // Green — main brand color
    primaryHover: "#16624A",
    primaryActive: "#145742",
    primaryLight: "#E8F5EF", // Soft accent
    primaryDark: "#1a684b", // Dark mode variant
  },

  /**
   * Light mode semantic tokens.
   */
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceSecondary: "#F2F4F7",
    surfaceTertiary: "#EAECF0",
    text: "#111827",
    textSecondary: "#475467",
    textMuted: "#667085",
    textBrand: "#1F7A5A",
    border: "#EAECF0",
    borderStrong: "#D0D5DD",
    tint: "#1F7A5A",
    overlay: "rgba(0,0,0,0.4)",
  },

  /**
   * Dark mode semantic tokens.
   */
  dark: {
    background: "#0F1720",
    surface: "#151F2B",
    surfaceSecondary: "#1B2633",
    surfaceTertiary: "#2B3A4D",
    text: "#F5F7FA",
    textSecondary: "#D0D5DD",
    textMuted: "#98A2B3",
    textBrand: "#E8F5EF",
    border: "#223042",
    borderStrong: "#2B3A4D",
    tint: "#E8F5EF",
    overlay: "rgba(0,0,0,0.6)",
  },

  /** Status/feedback colors — same for both modes, use light/dark variants */
  status: {
    success: "#12b76a",
    successLight: "#f0fdf4",
    successDark: "#027a48",
    error: "#f04438",
    errorLight: "#fff1f3",
    errorDark: "#b42318",
    warning: "#f79009",
    warningLight: "#fffaeb",
    warningDark: "#b54708",
    info: "#2e90fa",
    infoLight: "#eff8ff",
    infoDark: "#175cd3",
  },

  /** Pure values — use sparingly */
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

// ─── Theme Palette Type ───────────────────────────────────────────────────────
/**
 * ColorPalette — the type for either `Colors.light` or `Colors.dark`.
 *
 * Using `typeof Colors.light | typeof Colors.dark` causes TS errors when you
 * pass `isDark ? Colors.dark : Colors.light` to a prop typed as one specific
 * mode literal (because literal strings differ between light/dark).
 *
 * `ColorPalette` is typed as a loose object so both modes are always assignable,
 * while still providing IDE autocomplete for palette keys.
 */
export type ColorPalette = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textBrand: string;
  border: string;
  borderStrong: string;
  tint: string;
  overlay: string;
};

// ─── Typography ───────────────────────────────────────────────────────────────

/**
 * Font family map.
 * Cairo for Arabic (RTL), Inter for English (LTR) — same fonts as the web.
 * Keys match the font names registered in expo-font's useFonts() call.
 */
export const Fonts = {
  arabic: {
    regular: "Cairo_400Regular",
    medium: "Cairo_500Medium",
    semibold: "Cairo_600SemiBold",
    bold: "Cairo_700Bold",
  },
  latin: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
} as const;

export type FontWeight = keyof typeof Fonts.arabic; // 'regular' | 'medium' | 'semibold' | 'bold'
export type FontLocale = keyof typeof Fonts; // 'arabic' | 'latin'

/** Returns the correct font family for a given locale and weight */
export function getFontFamily(
  locale: FontLocale,
  weight: FontWeight = "regular",
): string {
  return Fonts[locale][weight];
}

// ─── Font Sizes ───────────────────────────────────────────────────────────────

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
} as const;

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

// ─── Spacing (4px base grid) ──────────────────────────────────────────────────

export const Spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
// Platform-aware shadows: web uses boxShadow, iOS uses shadow* props, Android uses elevation.

type ShadowStyle = {
  boxShadow?: string;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
};

function makeShadow(
  webBoxShadow: string,
  iosShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  },
  androidElevation: number,
): ShadowStyle {
  return (Platform.select({
    web: { boxShadow: webBoxShadow } as ShadowStyle,
    ios: iosShadow as ShadowStyle,
    android: { elevation: androidElevation } as ShadowStyle,
    default: { elevation: androidElevation } as ShadowStyle,
  }) ?? {}) as ShadowStyle;
}

export const Shadows = {
  xs: makeShadow(
    "0 1px 4px rgba(16,24,40,0.05)",
    {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    1,
  ),
  sm: makeShadow(
    "0 2px 8px rgba(16,24,40,0.06)",
    {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    2,
  ),
  md: makeShadow(
    "0 4px 16px rgba(16,24,40,0.08)",
    {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    4,
  ),
  lg: makeShadow(
    "0 8px 32px rgba(16,24,40,0.1)",
    {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    8,
  ),
};

// ─── Animation Durations ──────────────────────────────────────────────────────

export const Duration = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const ZIndex = {
  base: 0,
  raised: 10,
  overlay: 100,
  modal: 1000,
  toast: 9999,
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────

export const Layout = {
  /** Horizontal screen padding — consistent across all screens */
  screenPadding: 20,
  /** Bottom tab bar height (used for scroll view inset) */
  tabBarHeight: 60,
  /** Header height */
  headerHeight: 56,
} as const;
