/**
 * Tailwind CSS configuration for Hasba Client Mobile.
 *
 * Design system mirroring the new premium SaaS design.
 * Brand color: Premium Green #1F7A5A
 *
 * Key decisions:
 * - `presets: [require("nativewind/preset")]` — NativeWind v4 requirement that
 *   patches Tailwind for React Native (no DOM, different box model, etc.)
 * - NativeWind v4 handles dark mode via its own colorScheme system,
 *   controlled programmatically by our Zustand theme store.
 * - Font families match exactly what's loaded via expo-font in src/app/_layout.tsx.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ── Brand colors ────────────────────────────────────────────────────────
      colors: {
        primary: {
          DEFAULT: '#1F7A5A',
          hover: '#16624A',
          active: '#145742',
          light: '#E8F5EF', // Soft accent
          dark: '#1a684b', // Dark mode variant
        },
        surface: {
          light: '#FFFFFF',
          DEFAULT: '#FFFFFF', // card
          secondary: '#F2F4F7', // light mode secondary
          tertiary: '#EAECF0',
          dark: '#151F2B', // dark mode card
          darkSecondary: '#1B2633', // dark mode secondary
        },
        background: {
          light: '#F8FAFC',
          dark: '#0F1720',
        },
        text: {
          primary: '#111827',
          secondary: '#475467',
          muted: '#667085',
          darkPrimary: '#F5F7FA',
          darkSecondary: '#D0D5DD',
          darkMuted: '#98A2B3',
        },
        border: {
          light: '#EAECF0',
          strong: '#D0D5DD',
          dark: '#223042',
          darkStrong: '#2B3A4D',
        },
        success: { DEFAULT: '#12b76a', light: '#f0fdf4', dark: '#027a48' },
        error: { DEFAULT: '#f04438', light: '#fff1f3', dark: '#b42318' },
        warning: { DEFAULT: '#f79009', light: '#fffaeb', dark: '#b54708' },
        info: { DEFAULT: '#2e90fa', light: '#eff8ff', dark: '#175cd3' },
      },

      // ── Typography — names MUST match useFonts() keys in src/app/_layout.tsx ──
      fontFamily: {
        'cairo-regular': ['Cairo_400Regular'],
        'cairo-medium': ['Cairo_500Medium'],
        'cairo-semibold': ['Cairo_600SemiBold'],
        'cairo-bold': ['Cairo_700Bold'],
        'inter-regular': ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },

      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
      },

      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
