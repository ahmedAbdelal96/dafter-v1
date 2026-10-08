/**
 * BottomSheet — Modal bottom drawer with Reanimated gestures
 *
 * A lightweight bottom sheet that slides up from the bottom of the screen.
 * Used for: filter panels, confirmation dialogs, quick-action menus.
 *
 * Architecture:
 * - Backdrop overlay that dismisses on tap
 * - Drag handle indicator at the top
 * - Content scrollable if it exceeds max height
 * - Safe-area aware (adds bottom inset padding automatically)
 * - Animated with Reanimated spring for natural feel
 *
 * Usage:
 *   <BottomSheet visible={show} onClose={() => setShow(false)} title="تصفية">
 *     <FilterContent />
 *   </BottomSheet>
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Max height as fraction of screen height. Default: 0.75 */
  maxHeightFraction?: number;
  children: React.ReactNode;
  /** Show a primary action button at the bottom */
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BottomSheet({
  visible,
  onClose,
  title,
  maxHeightFraction = 0.75,
  children,
  actionLabel,
  onAction,
  actionLoading = false,
}: BottomSheetProps) {
  const { isDark }             = useTheme();
  const { isRTL, fontLocale }  = useLocale();
  const insets                 = useSafeAreaInsets();

  const palette    = isDark ? Colors.dark : Colors.light;
  const fontMed    = fontLocale === 'arabic' ? Fonts.arabic.medium   : Fonts.latin.medium;
  const fontSemi   = fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;

  // Translate: 0 = visible, 500 = off screen
  const translateY = useSharedValue(500);
  const opacity    = useSharedValue(0);

  const animateIn = useCallback(() => {
    opacity.value    = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    translateY.value = withSpring(0, { damping: 22, stiffness: 250 });
  }, [opacity, translateY]);

  const animateOut = useCallback((onDone: () => void) => {
    opacity.value    = withTiming(0, { duration: 200 });
    translateY.value = withTiming(400, { duration: 220, easing: Easing.in(Easing.ease) }, () => {
      runOnJS(onDone)();
    });
  }, [opacity, translateY]);

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, animateIn]);

  const handleClose = useCallback(() => {
    animateOut(onClose);
  }, [animateOut, onClose]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const bottomPad = insets.bottom + (actionLabel ? 0 : Spacing[4]);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose} statusBarTranslucent hardwareAccelerated={Platform.OS === 'android'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.surface,
            maxHeight: `${maxHeightFraction * 100}%` as any,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: palette.borderStrong }]} />
        </View>

        {/* Header */}
        {title && (
          <View style={[styles.header, { borderBottomColor: palette.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.headerTitle, { color: palette.text, fontFamily: fontSemi }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <View style={[styles.closeBtnInner, { backgroundColor: palette.surfaceTertiary }]}>
                <Text style={[styles.closeBtnText, { color: palette.textMuted }]}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>

        {/* Primary action */}
        {actionLabel && onAction && (
          <View style={[styles.actionBar, { borderTopColor: palette.border, paddingBottom: insets.bottom + Spacing[3] }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.brand.primary, opacity: actionLoading ? 0.7 : 1 }]}
              onPress={onAction}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { fontFamily: fontMed }]}>
                {actionLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    overflow: 'hidden',
    // Shadow for the sheet itself
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    flex: 1,
  },
  closeBtn: {
    padding: Spacing[1],
  },
  closeBtnInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
  },
  actionBar: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: FontSize.base,
    color: Colors.white,
  },
});
