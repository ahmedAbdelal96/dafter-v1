/**
 * ZConfirmDialog — Reusable confirmation / destructive action dialog.
 *
 * Shows a centered modal overlay (not a bottom sheet) to prompt the user
 * before any irreversible action: deletions, logouts, cancellations, etc.
 *
 * Usage:
 *   const [show, setShow] = useState(false);
 *
 *   <ZConfirmDialog
 *     visible={show}
 *     title="حذف الفاتورة"
 *     message="هل أنت متأكد أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."
 *     confirmLabel="حذف"
 *     variant="danger"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShow(false)}
 *   />
 */
import React, { useState } from "react";
import { Modal, View, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ZText } from "@/components/ui/ZText";
import { ZButton } from "@/components/ui/ZButton";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/stores/theme-store";

type DialogVariant = "default" | "primary" | "danger";

interface ZConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Label for the confirm/destructive button. Default: "تأكيد" */
  confirmLabel?: string;
  /** Label for the cancel button. Default: "إلغاء" */
  cancelLabel?: string;
  /** Expected label for confirm. Used for backwards compatibility */
  confirmText?: string;
  cancelText?: string;
  /** 'danger' renders confirm button in red. Default: 'default' */
  variant?: DialogVariant;
  /** Backwards compatibility */
  destructive?: boolean;
  /**
   * Called when the user presses the confirm button.
   * Can be async — a loading spinner is shown during execution.
   */
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

export function ZConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmText,
  cancelText,
  variant = "default",
  destructive,
  onConfirm,
  onCancel,
  loading: externalLoading,
}: ZConfirmDialogProps) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading || internalLoading;

  const finalConfirmLabel = confirmLabel || confirmText || "تأكيد";
  const finalCancelLabel = cancelLabel || cancelText || "إلغاء";
  const finalVariant = destructive ? "danger" : variant;

  const iconName =
    finalVariant === "danger" ? "trash-outline" : "help-circle-outline";
  const iconColor =
    finalVariant === "danger" ? Colors.status.error : Colors.brand.primary;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <View style={styles.overlay}>
        {/* Dialog card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              ...Platform.select({
                ios: {
                  shadowColor: isDark
                    ? Colors.dark.surfaceSecondary
                    : Colors.black,
                },
              }),
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor:
                  finalVariant === "danger"
                    ? Colors.status.errorLight
                    : Colors.brand.primaryLight,
              },
            ]}
          >
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>

          {/* Title */}
          <ZText weight="bold" size="lg" style={styles.title}>
            {title}
          </ZText>

          {/* Message */}
          {message && (
            <ZText variant="secondary" size="sm" style={styles.message}>
              {message}
            </ZText>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <ZButton
              variant="outline"
              fullWidth
              onPress={onCancel}
              disabled={isLoading}
            >
              {finalCancelLabel}
            </ZButton>

            <ZButton
              variant={finalVariant === "danger" ? "danger" : "primary"}
              fullWidth
              onPress={handleConfirm}
              loading={isLoading}
            >
              {finalConfirmLabel}
            </ZButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing[6],
  },
  card: {
    width: "100%",
    borderRadius: Radius.xl,
    padding: Spacing[6],
    alignItems: "center",
    gap: Spacing[3],
    // Shadow
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(0,0,0,0.15)" },
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[1],
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
});
