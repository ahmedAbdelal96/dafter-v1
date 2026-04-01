/**
 * NetworkBanner — Shows a dismissible banner at the top of the screen
 * when the device loses internet connectivity.
 *
 * Mount this once inside AppProviders (or root layout) so it's always visible.
 * It hides itself automatically when the connection is restored.
 *
 * Usage:
 *   // In AppProviders or _layout.tsx, after other providers:
 *   <NetworkBanner />
 */
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ZText } from "@/components/ui/ZText";
import { Colors, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const BANNER_HEIGHT = 40;

export function NetworkBanner() {
  const { isConnected } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const { t } = useTranslation("common");

  // null = still checking — don't show anything yet
  const isOffline = isConnected === false;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -BANNER_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }], pointerEvents: "none" },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
        <ZText variant="inverse" size="sm" weight="medium">
          {t("offline", "لا يوجد اتصال بالإنترنت")}
        </ZText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    backgroundColor: Colors.status.error,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
});
