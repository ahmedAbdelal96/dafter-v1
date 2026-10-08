/**
 * ZButton — Theme-aware & accessible Button component
 *
 * Supports multiple visual variants mirroring the web dashboard buttons.
 * Uses Animated for a subtle press feedback (scale down on press).
 *
 * Usage:
 *   <ZButton onPress={handleBooking}>Book Now</ZButton>
 *   <ZButton variant="outline" size="sm" onPress={cancel}>Cancel</ZButton>
 *   <ZButton loading>Processing...</ZButton>
 *   <ZButton disabled>Not available</ZButton>
 */
import React, { useCallback, useRef } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  View,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ZText } from "./ZText";
import { Colors, Spacing, Radius, FontSize } from "@/constants/theme";
import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ZButtonProps extends Omit<TouchableOpacityProps, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** Outer wrapper style — use for margins/positioning (not for internal button styling) */
  style?: StyleProp<ViewStyle>;
  /** Left icon — rendered before the label */
  leftIcon?: React.ReactNode;
  /** Right icon — rendered after the label (auto-flipped in RTL) */
  rightIcon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const SIZE_MAP: Record<
  ButtonSize,
  { height: number; paddingH: number; fontSize: number }
> = {
  sm: { height: 36, paddingH: Spacing[3], fontSize: FontSize.sm },
  md: { height: 48, paddingH: Spacing[5], fontSize: FontSize.base },
  lg: { height: 56, paddingH: Spacing[6], fontSize: FontSize.lg },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ZButton = React.memo(function ZButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  leftIcon,
  rightIcon,
  title,
  children,
  onPress,
  ...props
}: ZButtonProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ── Press animations ─────────────────────────────────────────────────────
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  // ── Style computation ────────────────────────────────────────────────────
  const { height, paddingH, fontSize } = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  const containerStyle = StyleSheet.flatten([
    styles.base,
    {
      height,
      paddingHorizontal: paddingH,
      alignSelf: (fullWidth ? "stretch" : "flex-start") as
        | "stretch"
        | "flex-start",
    },
    getVariantStyle(variant, isDark),
    isDisabled && styles.disabled,
  ]);

  const textColor = getTextColor(variant, isDark);
  // In RTL, reverse the icon order so left/right still make semantic sense
  const iconOrder = isRTL ? "row-reverse" : "row";

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "primary" ? Colors.white : Colors.brand.primary}
          />
        ) : (
          <View style={[styles.content, { flexDirection: iconOrder }]}>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <ZText
              weight="semibold"
              style={{ fontSize, color: textColor, lineHeight: fontSize * 1.3 }}
            >
              {children || title}
            </ZText>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVariantStyle(variant: ButtonVariant, isDark: boolean) {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: Colors.brand.primary,
        borderWidth: 0,
      };
    case "secondary":
      return {
        backgroundColor: Colors.brand.primaryLight,
        borderWidth: 1.5,
        borderColor: Colors.brand.primary,
      };
    case "outline":
      return {
        backgroundColor: Colors.transparent,
        borderWidth: 1.5,
        borderColor: isDark ? Colors.dark.border : Colors.light.border,
      };
    case "ghost":
      return {
        backgroundColor: Colors.transparent,
        borderWidth: 0,
      };
    case "danger":
      return {
        backgroundColor: Colors.status.error,
        borderWidth: 0,
      };
  }
}

function getTextColor(variant: ButtonVariant, isDark: boolean): string {
  switch (variant) {
    case "primary":
      return Colors.white;
    case "danger":
      return Colors.white;
    case "secondary":
      return Colors.brand.primary;
    case "outline":
      return isDark ? Colors.dark.text : Colors.light.text;
    case "ghost":
      return Colors.brand.primary;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: {
    alignItems: "center",
    gap: Spacing[2],
  },
  iconLeft: {
    marginEnd: Spacing[1],
  },
  iconRight: {
    marginStart: Spacing[1],
  },
  disabled: {
    opacity: 0.5,
  },
});
