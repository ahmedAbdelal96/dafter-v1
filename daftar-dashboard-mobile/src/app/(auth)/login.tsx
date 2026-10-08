/**
 * Login Screen — Dafter Mobile Dashboard
 *
 * Polished mobile-first auth screen with:
 * - Animated logo entrance (Reanimated spring scale-in)
 * - Decorative background circles for visual depth
 * - Input focus ring animation (border color interpolation)
 * - Haptic feedback on submit and validation errors
 * - Forgot password link navigating to /(auth)/forgot-password
 * - Safe area insets for notch/home indicator
 * - Smooth error banner slide-in
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/stores/auth-store";
import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
} from "@/constants/theme";

type TestAccount = {
  key: "superAdmin" | "owner" | "owner2" | "staff";
  icon: keyof typeof Ionicons.glyphMap;
  email: string;
  password: string;
  tint: string;
  bg: string;
};

const TEST_ACCOUNTS: TestAccount[] = [
  {
    key: "superAdmin",
    icon: "sparkles-outline",
    email: "superadmin@daftar.com",
    password: "superadmin123",
    tint: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
  },
  {
    key: "owner",
    icon: "business-outline",
    email: "owner@daftar.com",
    password: "owner123",
    tint: "#2563eb",
    bg: "rgba(37, 99, 235, 0.08)",
  },
  {
    key: "owner2",
    icon: "briefcase-outline",
    email: "owner2@daftar.com",
    password: "owner123",
    tint: "#0891b2",
    bg: "rgba(8, 145, 178, 0.08)",
  },
  {
    key: "staff",
    icon: "calculator-outline",
    email: "staff1@daftar.com",
    password: "owner123",
    tint: "#16a34a",
    bg: "rgba(22, 163, 74, 0.08)",
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email.trim()) return "emailRequired";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalidEmail";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "passwordRequired";
  if (password.length < 6) return "passwordTooShort";
  return null;
}

// ─── Animated input wrapper ────────────────────────────────────────────────────
// Interpolates border color between idle → focused → error states

interface AnimatedInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "sentences";
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  hasError: boolean;
  palette: typeof Colors.light | typeof Colors.dark;
  isRTL: boolean;
  fontRegular: string;
  textAlign: "right" | "left";
  rightSlot?: React.ReactNode;
}

const AnimatedInputField = React.memo(function AnimatedInputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  hasError,
  palette,
  isRTL,
  fontRegular,
  textAlign,
  rightSlot,
}: AnimatedInputProps) {
  const focusAnim = useSharedValue(0); // 0 = idle, 1 = focused
  const errorAnim = useSharedValue(0); // 0 = ok, 1 = error

  useEffect(() => {
    errorAnim.value = withTiming(hasError ? 1 : 0, { duration: 200 });
  }, [hasError, errorAnim]);

  const animatedBorder = useAnimatedStyle(() => {
    const color = interpolateColor(
      errorAnim.value,
      [0, 1],
      [
        interpolateColor(
          focusAnim.value,
          [0, 1],
          [palette.border, Colors.brand.primary],
        ),
        Colors.status.error,
      ],
    );
    return { borderColor: color };
  });

  return (
    <Animated.View
      style={[
        styles.inputWrap,
        {
          backgroundColor: palette.surface,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
        animatedBorder,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={palette.textMuted}
        style={styles.inputIcon}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        secureTextEntry={secureTextEntry}
        onFocus={() => {
          focusAnim.value = withTiming(1, { duration: 180 });
        }}
        onBlur={() => {
          focusAnim.value = withTiming(0, { duration: 180 });
        }}
        style={[
          styles.input,
          { color: palette.text, fontFamily: fontRegular, textAlign },
        ]}
      />
      {rightSlot}
    </Animated.View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const { login, isLoading, error, clearError } = useAuth();

  const palette = isDark ? Colors.dark : Colors.light;
  const fontRegular =
    fontLocale === "arabic" ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontMedium =
    fontLocale === "arabic" ? Fonts.arabic.medium : Fonts.latin.medium;
  const fontBold =
    fontLocale === "arabic" ? Fonts.arabic.bold : Fonts.latin.bold;
  const textAlign = isRTL ? "right" : "left";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const passwordRef = useRef<TextInput>(null);

  // ── Entrance animations ─────────────────────────────────────────────────────

  // Logo: scale + fade
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);

  // Header text: slide up + fade
  const headerY = useSharedValue(24);
  const headerOpacity = useSharedValue(0);

  // Form: slide up + fade
  const formY = useSharedValue(32);
  const formOpacity = useSharedValue(0);

  // Submit button: scale press feedback
  const btnScale = useSharedValue(1);

  // Error banner: slide down
  const errorHeight = useSharedValue(0);
  const errorOpacity = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance on mount
    logoScale.value = withDelay(
      0,
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
    logoOpacity.value = withDelay(0, withTiming(1, { duration: 300 }));
    headerY.value = withDelay(
      120,
      withSpring(0, { damping: 20, stiffness: 180 }),
    );
    headerOpacity.value = withDelay(120, withTiming(1, { duration: 350 }));
    formY.value = withDelay(
      220,
      withSpring(0, { damping: 20, stiffness: 180 }),
    );
    formOpacity.value = withDelay(220, withTiming(1, { duration: 350 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error) {
      errorHeight.value = withSpring(1, { damping: 18, stiffness: 200 });
      errorOpacity.value = withTiming(1, { duration: 200 });
    } else {
      errorHeight.value = withTiming(0, {
        duration: 180,
        easing: Easing.in(Easing.ease),
      });
      errorOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [error, errorHeight, errorOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOpacity.value,
  }));
  const formStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formY.value }],
    opacity: formOpacity.value,
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));
  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
    transform: [
      { scaleY: errorHeight.value },
      { translateY: (1 - errorHeight.value) * -10 },
    ],
    overflow: "hidden" as const,
  }));

  // ── Form logic ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const nextErrors = {
      email: emailErr ? t(`errors.${emailErr}`) : undefined,
      password: passwordErr ? t(`errors.${passwordErr}`) : undefined,
    };
    setErrors(nextErrors);

    if (emailErr || passwordErr) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    return !emailErr && !passwordErr;
  }

  const handleLogin = useCallback(async () => {
    clearError();
    btnScale.value = withSpring(0.96, { damping: 10, stiffness: 300 }, () => {
      btnScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });

    if (!validate()) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await login({ email: email.trim().toLowerCase(), password });
      // Auth store sets isAuthenticated → true → layout redirects to (client)
    } catch {
      // Error stored in auth store state — shown via error banner
    }
  }, [email, password, login, clearError]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTestAccount = useCallback(
    async (account: TestAccount) => {
      await Haptics.selectionAsync();
      clearError();
      setEmail(account.email);
      setPassword(account.password);
      setShowPass(false);
      setErrors({});
    },
    [clearError],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Decorative background ───────────────────────────────────────────── */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        <View
          style={[
            styles.circle1,
            { backgroundColor: Colors.brand.primaryLight },
          ]}
        />
        <View
          style={[
            styles.circle2,
            {
              backgroundColor: isDark
                ? "rgba(196,120,127,0.06)"
                : "rgba(196,120,127,0.04)",
            },
          ]}
        />
        <View
          style={[
            styles.circle3,
            { backgroundColor: Colors.brand.primaryLight },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing[8],
            paddingBottom: insets.bottom + Spacing[8],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, logoStyle]}>
          <View
            style={[
              styles.logoWrap,
              { backgroundColor: Colors.brand.primaryLight },
              Shadows.md,
            ]}
          >
            <Ionicons name="sparkles" size={34} color={Colors.brand.primary} />
          </View>
        </Animated.View>

        {/* ── Header text ─────────────────────────────────────────────────── */}
        <Animated.View style={[styles.headerText, headerStyle]}>
          <Text
            style={[
              styles.brand,
              { color: Colors.brand.primary, fontFamily: fontBold },
            ]}
          >
            دفتر
          </Text>
          <Text
            style={[
              styles.title,
              { color: palette.text, fontFamily: fontBold },
            ]}
          >
            {t("welcomeBack")}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: palette.textSecondary, fontFamily: fontRegular },
            ]}
          >
            {t("signInDescription")}
          </Text>
        </Animated.View>

        {/* ── Form ────────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.form, formStyle]}>
          {/* API error banner */}
          <Animated.View style={errorStyle}>
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: Colors.status.errorLight,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={16}
                color={Colors.status.error}
              />
              <Text
                style={[
                  styles.errorBannerText,
                  { fontFamily: fontRegular, textAlign },
                ]}
              >
                {error}
              </Text>
            </View>
          </Animated.View>

          {/* Email field */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: palette.text, fontFamily: fontMedium, textAlign },
              ]}
            >
              {t("email")}
            </Text>
            <AnimatedInputField
              icon="mail-outline"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setErrors((e) => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              hasError={!!errors.email}
              palette={palette}
              isRTL={isRTL}
              fontRegular={fontRegular}
              textAlign={textAlign}
            />
            {errors.email ? (
              <Text
                style={[
                  styles.fieldError,
                  { fontFamily: fontRegular, textAlign },
                ]}
              >
                {errors.email}
              </Text>
            ) : null}
          </View>

          {/* Password field */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: palette.text, fontFamily: fontMedium, textAlign },
              ]}
            >
              {t("password")}
            </Text>
            <AnimatedInputField
              icon="lock-closed-outline"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              inputRef={passwordRef}
              hasError={!!errors.password}
              palette={palette}
              isRTL={isRTL}
              fontRegular={fontRegular}
              textAlign={textAlign}
              rightSlot={
                <TouchableOpacity
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setShowPass((s) => !s);
                  }}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={palette.textMuted}
                  />
                </TouchableOpacity>
              }
            />
            {errors.password ? (
              <Text
                style={[
                  styles.fieldError,
                  { fontFamily: fontRegular, textAlign },
                ]}
              >
                {errors.password}
              </Text>
            ) : null}
          </View>

          {/* Forgot password link */}
          <TouchableOpacity
            onPress={() => {
              void Haptics.selectionAsync();
              router.push("/(auth)/forgot-password" as never);
            }}
            style={[
              styles.forgotWrap,
              { alignSelf: isRTL ? "flex-start" : "flex-end" },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.forgotText,
                { color: Colors.brand.primary, fontFamily: fontMedium },
              ]}
            >
              {t("forgotPassword")}
            </Text>
          </TouchableOpacity>

          {__DEV__ ? (
            <View
              style={[
                styles.testAccountsWrap,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.testAccountsTitle,
                  {
                    color: palette.textSecondary,
                    fontFamily: fontMedium,
                    textAlign,
                  },
                ]}
              >
                {t("testAccounts.title")}
              </Text>

              <View style={styles.testAccountsList}>
                {TEST_ACCOUNTS.map((account) => (
                  <TouchableOpacity
                    key={account.key}
                    style={[
                      styles.testAccountCard,
                      {
                        backgroundColor: account.bg,
                        borderColor: palette.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      void handleSelectTestAccount(account);
                    }}
                  >
                    <View
                      style={[
                        styles.testAccountHeader,
                        { flexDirection: isRTL ? "row-reverse" : "row" },
                      ]}
                    >
                      <View
                        style={[
                          styles.testAccountIcon,
                          { backgroundColor: account.bg },
                        ]}
                      >
                        <Ionicons
                          name={account.icon}
                          size={16}
                          color={account.tint}
                        />
                      </View>
                      <Text
                        style={[
                          styles.testAccountRole,
                          {
                            color: account.tint,
                            fontFamily: fontMedium,
                            textAlign,
                          },
                        ]}
                      >
                        {t(`testAccounts.roles.${account.key}`)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.testAccountLine,
                        {
                          color: palette.text,
                          fontFamily: fontRegular,
                          textAlign,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {account.email}
                    </Text>
                    <Text
                      style={[
                        styles.testAccountPassword,
                        {
                          color: palette.textSecondary,
                          fontFamily: fontRegular,
                          textAlign,
                        },
                      ]}
                    >
                      {account.password}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Submit button */}
          <Animated.View style={btnStyle}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isLoading
                    ? Colors.brand.primaryHover
                    : Colors.brand.primary,
                },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                // Minimal loading indicator — three animated dots replaced by a simple text for RTL compat
                <View
                  style={[
                    styles.loadingRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
                    color={Colors.white}
                  />
                </View>
              ) : (
                <Text style={[styles.submitText, { fontFamily: fontMedium }]}>
                  {t("signIn")}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Decorative background circles
  circle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -100,
    right: -80,
    opacity: 0.6,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 60,
    left: -60,
  },
  circle3: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: -40,
    right: -20,
    opacity: 0.5,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing[6],
  },

  // Logo block
  header: {
    alignItems: "center",
    marginBottom: Spacing[6],
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  // Header text block
  headerText: {
    alignItems: "center",
    marginBottom: Spacing[8],
  },
  brand: {
    fontSize: FontSize["3xl"],
    marginBottom: Spacing[1],
  },
  title: {
    fontSize: FontSize.xl,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
    maxWidth: 260,
  },

  // Form
  form: {
    gap: Spacing[4],
  },

  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.sm,
  },
  errorBannerText: {
    fontSize: FontSize.sm,
    color: Colors.status.errorDark,
    flex: 1,
  },

  // Field
  field: {
    gap: Spacing[1.5],
  },
  label: {
    fontSize: FontSize.sm,
  },

  // Input
  inputWrap: {
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    height: 52,
    gap: Spacing[2],
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: FontSize.base,
  },
  eyeBtn: {
    padding: Spacing[1],
    flexShrink: 0,
  },
  fieldError: {
    fontSize: FontSize.xs,
    color: Colors.status.error,
  },

  // Forgot password
  forgotWrap: {
    marginTop: -Spacing[2],
  },
  forgotText: {
    fontSize: FontSize.sm,
  },

  testAccountsWrap: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  testAccountsTitle: {
    fontSize: FontSize.xs,
  },
  testAccountsList: {
    gap: Spacing[2.5],
  },
  testAccountCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[1.5],
  },
  testAccountHeader: {
    alignItems: "center",
    gap: Spacing[2],
  },
  testAccountIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  testAccountRole: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  testAccountLine: {
    fontSize: FontSize.sm,
  },
  testAccountPassword: {
    fontSize: FontSize.xs,
  },

  // Submit
  submitBtn: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  submitText: {
    fontSize: FontSize.base,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  loadingRow: {
    alignItems: "center",
    gap: Spacing[2],
  },
});
