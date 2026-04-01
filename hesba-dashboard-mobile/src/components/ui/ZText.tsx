/**
 * ZText — Theme-aware & locale-aware Text component
 *
 * The foundational typography component for the Zayna design system.
 * Automatically selects the correct font (Cairo/Inter) based on the
 * current locale, and the correct color based on the current theme.
 *
 * This eliminates the need to manually set fontFamily and color on every
 * <Text> element — instead, all text in the app goes through <ZText>.
 *
 * Usage:
 *   <ZText>Default regular text</ZText>
 *   <ZText weight="semibold" size="lg" variant="secondary">Subtitle</ZText>
 *   <ZText variant="brand" weight="bold" size="2xl">Zayna</ZText>
 */
import React, { useMemo } from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import {
  Colors,
  FontSize,
  getFontFamily,
  type FontWeight,
} from "@/constants/theme";
import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type TextVariant =
  | "primary" // Main text color
  | "secondary" // Muted label color
  | "muted" // Disabled / placeholder
  | "brand" // Rose Gold tint
  | "error" // Error / danger
  | "success" // Success / confirm
  | "inverse"; // White on dark backgrounds

type TextSize = keyof typeof FontSize;

interface ZTextProps extends TextProps {
  /** Font weight — automatically maps to Cairo or Inter variant */
  weight?: FontWeight;
  /** Font size from the design system scale */
  size?: TextSize;
  /** Semantic color variant */
  variant?: TextVariant;
  children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ZText = React.memo(function ZText({
  weight = "regular",
  size = "base",
  variant = "primary",
  style,
  children,
  ...props
}: ZTextProps) {
  const { isDark } = useTheme();
  const { fontLocale, isRTL } = useLocale();

  const textStyle = useMemo(() => {
    const palette = isDark ? Colors.dark : Colors.light;

    const colorMap: Record<TextVariant, string> = {
      primary: palette.text,
      secondary: palette.textSecondary,
      muted: palette.textMuted,
      brand: isDark ? Colors.brand.primaryDark : Colors.brand.primary,
      error: Colors.status.error,
      success: Colors.status.success,
      inverse: Colors.white,
    };

    return StyleSheet.flatten([
      {
        fontFamily: getFontFamily(fontLocale, weight),
        fontSize: FontSize[size],
        color: colorMap[variant],
        // RTL text alignment — respects writing direction
        textAlign: (isRTL ? "right" : "left") as "left" | "right",
        // Explicit writing direction for proper character rendering
        writingDirection: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr",
      },
      style,
    ]);
  }, [isDark, fontLocale, isRTL, weight, size, variant, style]);

  return (
    <Text style={textStyle} {...props}>
      {children}
    </Text>
  );
});
