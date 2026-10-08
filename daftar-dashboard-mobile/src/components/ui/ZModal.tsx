/**
 * ZModal — Theme-aware generic modal wrapper.
 *
 * Wraps React Native's Modal with the app's design system:
 * - Dark overlay backdrop
 * - Slide-up sheet with rounded top corners
 * - Optional title and close button
 * - Safe area aware (content above home indicator)
 * - RTL support
 * - Keyboard-aware: sheet lifts above the software keyboard automatically
 *
 * Usage:
 *   <ZModal visible={showModal} onClose={() => setShowModal(false)} title="فلترة">
 *     <YourContent />
 *   </ZModal>
 */
import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ModalProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ZText } from "@/components/ui/ZText";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/stores/theme-store";

interface ZModalProps extends Pick<ModalProps, "visible" | "animationType"> {
  onClose: () => void;
  /** Optional header title. If omitted, no header is shown. */
  title?: string;
  /** Content rendered inside the sheet */
  children: React.ReactNode;
}

export function ZModal({
  visible,
  onClose,
  title,
  animationType = "slide",
  children,
}: ZModalProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType={animationType}
      transparent
      statusBarTranslucent
    >
      {/* Overlay — tap to close */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/*
       * KeyboardAvoidingView lifts the sheet above the software keyboard.
       * ROOT CAUSE FIX: Without this, the sheet stays at bottom:0 and the
       * keyboard renders on top of it, hiding the save button.
       *
       * pointerEvents="box-none": the KAV itself does not intercept touches —
       * only its children do. This ensures backdrop taps still reach the overlay.
       */}
      <KeyboardAvoidingView
        style={styles.kbContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        {/* Sheet */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              paddingBottom: insets.bottom + Spacing[4],
            },
          ]}
        >
          {/* Drag indicator */}
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          {title && (
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
              <ZText weight="semibold" size="lg">
                {title}
              </ZText>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="إغلاق"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  /**
   * flex:1 + justifyContent:'flex-end' replaces position:absolute + bottom:0.
   * The sheet naturally sits at the bottom of this flex container.
   * When KeyboardAvoidingView adds padding-bottom (keyboard height), the sheet
   * floats above the keyboard instead of being hidden beneath it.
   */
  kbContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    minHeight: 120,
    maxHeight: "85%",
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
  },
});
