/**
 * Forgot Password Screen — Dafter Mobile Dashboard
 *
 * Lets owners request a password reset email. On success shows a
 * confirmation message instead of the form.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";
import { authApi } from "@/lib/api/auth.api";
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
} from "@/constants/theme";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();

  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg =
    fontLocale === "arabic" ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontMed =
    fontLocale === "arabic" ? Fonts.arabic.medium : Fonts.latin.medium;
  const fontBold =
    fontLocale === "arabic" ? Fonts.arabic.bold : Fonts.latin.bold;
  const textAlign = isRTL ? "right" : "left";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError(t("errors.emailRequired"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t("errors.invalidEmail"));
      return false;
    }
    return true;
  }

  async function handleSend() {
    setApiError(null);
    if (!validate()) return;
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t("errors.loginFailed");
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={[
            styles.backBtn,
            { alignSelf: isRTL ? "flex-end" : "flex-start" },
          ]}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(auth)/login")
          }
        >
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={22}
            color={palette.text}
          />
          <Text
            style={[
              styles.backText,
              { color: palette.text, fontFamily: fontMed },
            ]}
          >
            {t("backToLogin")}
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: Colors.brand.primaryLight },
            ]}
          >
            <Ionicons
              name="key-outline"
              size={28}
              color={Colors.brand.primary}
            />
          </View>
          <Text
            style={[
              styles.title,
              { color: palette.text, fontFamily: fontBold },
            ]}
          >
            {t("resetPassword")}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: palette.textSecondary, fontFamily: fontReg },
            ]}
          >
            {t("resetDescription")}
          </Text>
        </View>

        {sent ? (
          /* ── Success state ── */
          <View
            style={[
              styles.successWrap,
              {
                backgroundColor: Colors.status.successLight,
                borderRadius: Radius.md,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={Colors.status.success}
            />
            <Text
              style={[
                styles.successText,
                { color: Colors.status.successDark, fontFamily: fontMed },
              ]}
            >
              {t("resetLinkSent")}
            </Text>
          </View>
        ) : (
          /* ── Form ── */
          <View style={styles.form}>
            {apiError && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: Colors.status.errorLight },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={Colors.status.error}
                />
                <Text style={[styles.errorText, { fontFamily: fontReg }]}>
                  {apiError}
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  { color: palette.text, fontFamily: fontMed, textAlign },
                ]}
              >
                {t("email")}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: palette.surface,
                    borderColor: emailError
                      ? Colors.status.error
                      : palette.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={palette.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setEmailError(null);
                  }}
                  placeholder={t("emailPlaceholder")}
                  placeholderTextColor={palette.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  style={[
                    styles.input,
                    { color: palette.text, fontFamily: fontReg, textAlign },
                  ]}
                />
              </View>
              {emailError && (
                <Text
                  style={[
                    styles.fieldError,
                    { fontFamily: fontReg, textAlign },
                  ]}
                >
                  {emailError}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: Colors.brand.primary,
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleSend}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[styles.submitText, { fontFamily: fontMed }]}>
                  {t("sendResetLink")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[14],
    paddingBottom: Spacing[12],
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    marginBottom: Spacing[8],
  },
  backText: { fontSize: FontSize.sm },
  header: {
    alignItems: "center",
    marginBottom: Spacing[8],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  title: {
    fontSize: FontSize.xl,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  successWrap: {
    alignItems: "center",
    gap: Spacing[3],
    padding: Spacing[6],
  },
  successText: {
    fontSize: FontSize.base,
    textAlign: "center",
  },
  form: { gap: Spacing[4] },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.status.errorDark,
    flex: 1,
  },
  field: { gap: Spacing[1.5] },
  label: { fontSize: FontSize.sm },
  inputWrap: {
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    height: 48,
    gap: Spacing[2],
  },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: FontSize.base,
  },
  fieldError: {
    fontSize: FontSize.xs,
    color: Colors.status.error,
  },
  submitBtn: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing[2],
    ...Shadows.sm,
  },
  submitText: {
    fontSize: FontSize.base,
    color: Colors.white,
  },
});
