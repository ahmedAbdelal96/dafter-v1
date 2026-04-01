/**
 * ToastContainer — Global animated toast notifications
 *
 * Renders the active toast queue from the toast store.
 * Each toast slides in from the top, waits, then slides out.
 *
 * Architecture:
 * - Uses react-native-reanimated for 60fps animations with native driver
 * - Stacks up to 3 toasts; older ones are dismissed automatically
 * - Safe area aware (renders below status bar + notch)
 * - Mount this ONCE at the root level inside SafeAreaProvider
 */
import React, { useEffect, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  useToastStore,
  type ToastMessage,
  type ToastType,
} from "@/stores/toast-store";
import { useLocale } from "@/stores/locale-store";
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
} from "@/constants/theme";

// ─── Toast config ─────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  ToastType,
  { bg: string; icon: string; iconColor: string; text: string }
> = {
  success: {
    bg: Colors.status.successLight,
    icon: "checkmark-circle",
    iconColor: Colors.status.success,
    text: Colors.status.successDark,
  },
  error: {
    bg: Colors.status.errorLight,
    icon: "alert-circle",
    iconColor: Colors.status.error,
    text: Colors.status.errorDark,
  },
  info: {
    bg: Colors.status.infoLight,
    icon: "information-circle",
    iconColor: Colors.status.info,
    text: Colors.status.infoDark,
  },
  warning: {
    bg: Colors.status.warningLight,
    icon: "warning",
    iconColor: Colors.status.warning,
    text: Colors.status.warningDark,
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  isRTL: boolean;
  fontFamily: string;
}

function ToastItem({ toast, onDismiss, isRTL, fontFamily }: ToastItemProps) {
  const config = TOAST_CONFIG[toast.type];
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);

  useEffect(() => {
    // Slide in
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });

    // Auto-dismiss
    const timer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 250 }, () => {
        runOnJS(dismiss)();
      });
      opacity.value = withTiming(0, { duration: 200 });
    }, toast.duration ?? 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animStyle, styles.toastWrap]}>
      <TouchableOpacity
        style={[
          styles.toast,
          {
            backgroundColor: config.bg,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
          Shadows.md,
        ]}
        onPress={dismiss}
        activeOpacity={0.9}
      >
        <Ionicons
          name={config.icon as React.ComponentProps<typeof Ionicons>["name"]}
          size={20}
          color={config.iconColor}
          style={styles.toastIcon}
        />
        <Text
          style={[
            styles.toastText,
            {
              color: config.text,
              fontFamily,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
          numberOfLines={3}
        >
          {toast.message}
        </Text>
        <Ionicons
          name="close"
          size={16}
          color={config.text}
          style={styles.closeIcon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const { isRTL, fontLocale } = useLocale();

  const fontFamily =
    fontLocale === "arabic" ? Fonts.arabic.medium : Fonts.latin.medium;

  // Show at most 3 toasts to avoid overwhelming the UI
  const visible = toasts.slice(-3);

  if (visible.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + Spacing[2] }]}>
      {visible.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={dismiss}
          isRTL={isRTL}
          fontFamily={fontFamily}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing[4],
    right: Spacing[4],
    zIndex: 9999,
    gap: Spacing[2],
    pointerEvents: "box-none",
  },
  toastWrap: {
    width: "100%",
  },
  toast: {
    alignItems: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.lg,
    minHeight: 52,
  },
  toastIcon: {
    flexShrink: 0,
  },
  toastText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  closeIcon: {
    flexShrink: 0,
    opacity: 0.6,
  },
});
