/**
 * ZInput — Theme-aware & RTL-aware Text Input component
 *
 * Handles the common input patterns in the Zayna app:
 * - Automatic RTL text direction based on locale
 * - Theme-aware background, border, and text colors
 * - Focused border state (rose gold tint)
 * - Error state with message
 * - Secure text entry toggle (for password fields)
 * - Left/right icon slots
 *
 * Usage:
 *   <ZInput label="رقم الهاتف" placeholder="01xxxxxxxxx" />
 *   <ZInput label="Password" secureTextEntry error="Required" />
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Animated,
} from 'react-native';
import { ZText } from './ZText';
import { Colors, Spacing, Radius, FontSize, Fonts } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Full width (default: true) */
  fullWidth?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ZInput = React.memo(
  React.forwardRef<TextInput, ZInputProps>(function ZInput(
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      secureTextEntry,
      fullWidth = true,
      ...props
    },
    ref
  ) {
    const { isDark } = useTheme();
    const { fontLocale, isRTL } = useLocale();
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureVisible, setIsSecureVisible] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

  const palette = isDark ? Colors.dark : Colors.light;
  const fontFamily = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;

  // ── Focus animation ──────────────────────────────────────────────────────
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    props.onFocus?.({} as never);
  }, [borderAnim, props]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    props.onBlur?.({} as never);
  }, [borderAnim, props]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? Colors.status.error : palette.border,
      error ? Colors.status.error : Colors.brand.primary,
    ],
  });

  // ── RTL icon order ───────────────────────────────────────────────────────
  // In RTL layout, left/right are flipped so icons stay semantically correct
  const iconDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View style={[styles.container, !fullWidth && styles.inline]}>
      {/* Label */}
      {label && (
        <ZText
          weight="medium"
          size="sm"
          variant={error ? 'error' : isFocused ? 'brand' : 'secondary'}
          style={styles.label}
        >
          {label}
        </ZText>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: palette.surface,
            borderColor,
          },
        ]}
      >
        <View style={[styles.innerRow, { flexDirection: iconDirection }]}>
          {/* Left icon */}
          {leftIcon && (
            <View style={styles.icon}>{leftIcon}</View>
          )}

          {/* Text Input */}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                fontFamily,
                fontSize: FontSize.base,
                color: palette.text,
                textAlign,
                // writingDirection is key for correct cursor placement in Arabic
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
            placeholderTextColor={palette.textMuted}
            secureTextEntry={secureTextEntry && !isSecureVisible}
            onFocus={handleFocus}
            onBlur={handleBlur}
            textAlignVertical="center"
            {...props}
          />

          {/* Secure text toggle */}
          {secureTextEntry && (
            <TouchableOpacity
              style={styles.icon}
              onPress={() => setIsSecureVisible((v) => !v)}
              accessibilityLabel={isSecureVisible ? 'Hide password' : 'Show password'}
            >
              <ZText variant="muted" size="sm">
                {isSecureVisible ? '👁️' : '👁️‍🗨️'}
              </ZText>
            </TouchableOpacity>
          )}

          {/* Right icon (only if no secure toggle) */}
          {rightIcon && !secureTextEntry && (
            <View style={styles.icon}>{rightIcon}</View>
          )}
        </View>
      </Animated.View>

      {/* Error message */}
      {error && (
        <ZText variant="error" size="xs" style={styles.hint}>
          {error}
        </ZText>
      )}

      {/* Hint message */}
      {hint && !error && (
        <ZText variant="muted" size="xs" style={styles.hint}>
          {hint}
        </ZText>
      )}
    </View>
  );
}));

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing[1.5],
  },
  inline: {
    width: 'auto',
  },
  label: {
    marginBottom: Spacing[0.5],
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  innerRow: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    minHeight: 48,
  },
  input: {
    flex: 1,
    height: 48,
    paddingVertical: 0, // Reset Android default padding
  },
  icon: {
    paddingHorizontal: Spacing[1],
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    marginTop: Spacing[0.5],
  },
});
