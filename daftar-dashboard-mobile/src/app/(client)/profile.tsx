/**
 * Profile Screen — Dafter Mobile Dashboard
 *
 * Displays the logged-in owner's profile, company info, subscription details,
 * app settings (theme + language), and logout button.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/stores/auth-store";
import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";
import { ZAvatar } from "@/components/ui/ZAvatar";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
  Layout,
  type ColorPalette,
} from "@/constants/theme";

// ─── Menu row helper ──────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  palette: ColorPalette;
  fontMed: string;
  fontReg: string;
  isRTL: boolean;
  destructive?: boolean;
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
  right,
  palette,
  fontMed,
  fontReg,
  isRTL,
  destructive,
}: MenuRowProps) {
  const textColor = destructive ? Colors.status.error : palette.text;
  const iconColor = destructive ? Colors.status.error : palette.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          borderBottomColor: palette.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        style={[
          styles.menuRowLeft,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.menuIconWrap,
            {
              backgroundColor: destructive
                ? Colors.status.errorLight
                : palette.surfaceSecondary,
            },
          ]}
        >
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text
          style={[styles.menuLabel, { color: textColor, fontFamily: fontMed }]}
        >
          {label}
        </Text>
      </View>

      <View
        style={[
          styles.menuRowRight,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {value && (
          <Text
            style={[
              styles.menuValue,
              { color: palette.textMuted, fontFamily: fontReg },
            ]}
          >
            {value}
          </Text>
        )}
        {right}
        {onPress && !right && (
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={16}
            color={palette.textMuted}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation("profile");
  const tCommon = useTranslation("common").t;
  const router = useRouter();
  const { user, tenant, logout, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { locale, isRTL, fontLocale, changeLocale } = useLocale();

  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg =
    fontLocale === "arabic" ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontMed =
    fontLocale === "arabic" ? Fonts.arabic.medium : Fonts.latin.medium;
  const fontSemi =
    fontLocale === "arabic" ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const fontBold =
    fontLocale === "arabic" ? Fonts.arabic.bold : Fonts.latin.bold;

  const fullName = user?.fullName ?? "";

  const handleLogout = useCallback(() => {
    Alert.alert(t("actions.logout"), t("actions.logoutConfirm"), [
      { text: tCommon("actions.cancel"), style: "cancel" },
      {
        text: t("actions.logout"),
        style: "destructive",
        onPress: () => void logout(),
      },
    ]);
  }, [t, tCommon, logout]);

  const handleLanguageToggle = useCallback(async () => {
    const next = locale === "ar" ? "en" : "ar";
    const result = await changeLocale(next);
    if (result.needsRestart) {
      Alert.alert(t("language.restartRequired"));
    }
  }, [locale, changeLocale, t]);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScreenHeader title={t("title")} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile hero ── */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <ZAvatar name={fullName} size="xl" />
          <View style={{ alignItems: "center", gap: Spacing[0.5] }}>
            <Text
              style={[
                styles.userName,
                { color: palette.text, fontFamily: fontBold },
              ]}
            >
              {fullName}
            </Text>
            <Text
              style={[
                styles.userEmail,
                { color: palette.textSecondary, fontFamily: fontReg },
              ]}
            >
              {user?.email}
            </Text>
            {user?.role && (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: Colors.brand.primaryLight },
                ]}
              >
                <Text style={[styles.roleText, { fontFamily: fontMed }]}>
                  {t(`roles.${user.role}`)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Salon info ── */}
        {tenant && (
          <View
            style={[
              styles.section,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: palette.text,
                  fontFamily: fontSemi,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("companyInfo")}
            </Text>

            <MenuRow
              icon="business-outline"
              label={t("fields.companyName")}
              value={tenant.name}
              palette={palette}
              fontMed={fontMed}
              fontReg={fontReg}
              isRTL={isRTL}
            />
            {tenant.address && (
              <MenuRow
                icon="location-outline"
                label={t("fields.city")}
                value={tenant.address}
                palette={palette}
                fontMed={fontMed}
                fontReg={fontReg}
                isRTL={isRTL}
              />
            )}
            <MenuRow
              icon="card-outline"
              label={t("fields.plan")}
              value={t(`plans.${tenant.subscriptionPlan}`)}
              palette={palette}
              fontMed={fontMed}
              fontReg={fontReg}
              isRTL={isRTL}
            />
            {user?.role === "OWNER" && (
              <MenuRow
                icon="create-outline"
                label={t("editCompany")}
                onPress={() => router.push("/(client)/company-settings" as never)}
                palette={palette}
                fontMed={fontMed}
                fontReg={fontReg}
                isRTL={isRTL}
              />
            )}
            {user?.role === "OWNER" && (
              <MenuRow
                icon="shield-checkmark-outline"
                label={t("subscription.manage")}
                onPress={() => router.push("/(client)/subscriptions" as never)}
                palette={palette}
                fontMed={fontMed}
                fontReg={fontReg}
                isRTL={isRTL}
              />
            )}
          </View>
        )}

        {/* ── Personal info ── */}
        {user && (
          <View
            style={[
              styles.section,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: palette.text,
                  fontFamily: fontSemi,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("personalInfo")}
            </Text>

            <MenuRow
              icon="mail-outline"
              label={t("fields.email")}
              value={user.email}
              palette={palette}
              fontMed={fontMed}
              fontReg={fontReg}
              isRTL={isRTL}
            />
          </View>
        )}

        {/* ── App settings ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: palette.text,
                fontFamily: fontSemi,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {t("settings.title")}
          </Text>

          {/* Dark mode toggle */}
          <MenuRow
            icon={isDark ? "moon" : "sunny-outline"}
            label={isDark ? t("settings.darkMode") : t("settings.lightMode")}
            palette={palette}
            fontMed={fontMed}
            fontReg={fontReg}
            isRTL={isRTL}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{
                  true: Colors.brand.primary,
                  false: palette.borderStrong,
                }}
                thumbColor={Colors.white}
              />
            }
          />

          {/* Language toggle */}
          <MenuRow
            icon="language-outline"
            label={t("settings.language")}
            value={locale === "ar" ? t("language.ar") : t("language.en")}
            onPress={handleLanguageToggle}
            palette={palette}
            fontMed={fontMed}
            fontReg={fontReg}
            isRTL={isRTL}
          />
        </View>

        {/* ── Account actions ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: palette.text,
                fontFamily: fontSemi,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {t("account")}
          </Text>

          <MenuRow
            icon="log-out-outline"
            label={t("actions.logout")}
            onPress={handleLogout}
            palette={palette}
            fontMed={fontMed}
            fontReg={fontReg}
            isRTL={isRTL}
            destructive
          />
        </View>

        {/* App version footer */}
        <Text
          style={[
            styles.version,
            { color: palette.textMuted, fontFamily: fontReg },
          ]}
        >
          Dafter v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing[10],
    gap: Spacing[3],
    paddingTop: Spacing[3],
  },
  profileCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing[6],
    alignItems: "center",
    gap: Spacing[3],
    ...Shadows.xs,
  },
  userName: { fontSize: FontSize.xl },
  userEmail: { fontSize: FontSize.sm },
  roleBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[0.5],
    borderRadius: Radius.full,
    marginTop: Spacing[1],
  },
  roleText: {
    fontSize: FontSize.xs,
    color: Colors.brand.primary,
  },
  section: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
    ...Shadows.xs,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    padding: Spacing[4],
    paddingBottom: Spacing[2],
  },
  menuRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuRowLeft: {
    alignItems: "center",
    gap: Spacing[3],
    flex: 1,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: FontSize.base, flex: 1 },
  menuRowRight: {
    alignItems: "center",
    gap: Spacing[2],
  },
  menuValue: { fontSize: FontSize.sm },
  version: {
    fontSize: FontSize.xs,
    textAlign: "center",
    paddingVertical: Spacing[4],
  },
});
