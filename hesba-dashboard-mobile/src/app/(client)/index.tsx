/**
 * Dashboard Screen — Home Tab (Daftar)
 *
 * Professional, calm, fast, and highly legible commands center for merchants.
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";


import {
  useOverview,
  useAlerts,
  useReceivables,
  useOverdueCustomers,
} from "@/features/dashboard/hooks/useDashboard";
import { DashboardSkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import AlertBanner from "@/features/dashboard/components/AlertBanner";
import { useAuth } from "@/stores/auth-store";
import { UnreadBadge } from "@/features/notifications/components/UnreadBadge";
import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";
import { ZAvatar } from "@/components/ui/ZAvatar";
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Layout,
  Shadows,
} from "@/constants/theme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(raw: string, currency: string): string {
  const n = parseFloat(String(raw)) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1_000_000)
    return `${sign}${(abs / 1_000_000).toFixed(1)}M ${currency}`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K ${currency}`;
  return `${sign}${abs.toLocaleString("en-US")} ${currency}`; // Modern startups often use standard number formatting even in AR
}

function getGreeting(hour: number, isArabic: boolean): string {
  if (isArabic) {
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء النور";
  }
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { t } = useTranslation("dashboard");
  const tCommon = useTranslation("common").t;
  const router = useRouter();

  const { isDark } = useTheme();
  const { isRTL, isArabic, fontLocale } = useLocale();
  const { displayName } = useAuth();

  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg = fontLocale === "arabic" ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontSemi = fontLocale === "arabic" ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const fontBold = fontLocale === "arabic" ? Fonts.arabic.bold : Fonts.latin.bold;
  const currency = tCommon("currency");

  const { data: overview, isLoading, isRefetching, refetch } = useOverview("month");
  const { data: receivables } = useReceivables();
  const { data: overdueCustomers } = useOverdueCustomers(5);

  const navigate = useCallback(
    async (href: string) => {
      await Haptics.selectionAsync();
      router.push(href as never);
    },
    [router]
  );

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return <DashboardSkeleton />;

  const kpis = overview?.kpis;
  const greeting = getGreeting(new Date().getHours(), isArabic);
  const today = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* ── Header (Sticky-like feel natively inside ScrollView or fixed) ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? "rgba(15, 23, 32, 0.9)" : "rgba(248, 250, 252, 0.9)",
            borderBottomColor: palette.border,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <View style={[styles.headerProfile, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity onPress={() => navigate("/(client)/profile")} activeOpacity={0.8}>
            <ZAvatar name={displayName} size="md" />
          </TouchableOpacity>
          <View style={{ alignItems: isRTL ? "flex-end" : "flex-start", marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
            <Text style={[styles.greeting, { color: Colors.brand.primary, fontFamily: fontSemi }]}>
              {greeting}
            </Text>
            <Text style={[styles.userName, { color: palette.text, fontFamily: fontBold }]} numberOfLines={1}>
              {displayName || "User"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notificationBtn} onPress={() => navigate("/(client)/notifications")} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={22} color={Colors.brand.primary} />
          {/* Notification Badge indicator */}
          <UnreadBadge top={2} right={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.brand.primary}
            colors={[Colors.brand.primary]}
          />
        }
      >
        {/* ── Today's Summary ── */}
        <View style={{ marginBottom: Spacing[6] }}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.sectionTitle, { color: palette.text, fontFamily: fontBold }]}>
              {t("sections.todaySnapshot", "ملخص اليوم")}
            </Text>
            <Text style={[styles.dateText, { color: Colors.brand.primary, fontFamily: fontSemi }]}>
              {today}
            </Text>
          </View>

          <View style={styles.kpiGrid}>
            {/* Sales */}
            <View style={[styles.kpiCard, { backgroundColor: isDark ? "rgba(31, 122, 90, 0.1)" : "rgba(31, 122, 90, 0.05)", borderColor: isDark ? "rgba(31, 122, 90, 0.2)" : "rgba(31, 122, 90, 0.1)" }]}>
              <View style={[styles.kpiCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Ionicons name="trending-up" size={20} color={Colors.brand.primary} />
              </View>
              <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontFamily: fontReg, textAlign: isRTL ? "right" : "left" }]}>
                {t("todayKpis.sales", "مبيعات اليوم")}
              </Text>
              <Text style={[styles.kpiValue, { color: palette.text, fontFamily: fontBold, textAlign: isRTL ? "right" : "left" }]}>
                {formatMoney(kpis?.totalSales ?? "0", currency)}
              </Text>
            </View>

            {/* Collections */}
            <View style={[styles.kpiCard, { backgroundColor: isDark ? "rgba(31, 122, 90, 0.1)" : "rgba(31, 122, 90, 0.05)", borderColor: isDark ? "rgba(31, 122, 90, 0.2)" : "rgba(31, 122, 90, 0.1)" }]}>
              <View style={[styles.kpiCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Ionicons name="cash" size={20} color={Colors.brand.primary} />
              </View>
              <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontFamily: fontReg, textAlign: isRTL ? "right" : "left" }]}>
                {t("todayKpis.collections", "التحصيلات")}
              </Text>
              <Text style={[styles.kpiValue, { color: palette.text, fontFamily: fontBold, textAlign: isRTL ? "right" : "left" }]}>
                {formatMoney(kpis?.collectionAmount ?? "0", currency)}
              </Text>
            </View>

            {/* Unpaid Invoices */}
            <View style={[styles.kpiCard, { backgroundColor: isDark ? "rgba(240, 68, 56, 0.1)" : "rgba(240, 68, 56, 0.05)", borderColor: isDark ? "rgba(240, 68, 56, 0.2)" : "rgba(240, 68, 56, 0.1)" }]}>
              <View style={[styles.kpiCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Ionicons name="document-text" size={20} color={Colors.status.error} />
              </View>
              <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontFamily: fontReg, textAlign: isRTL ? "right" : "left" }]}>
                {t("todayKpis.pending", "فواتير غير مدفوعة")}
              </Text>
              <Text style={[styles.kpiValue, { color: palette.text, fontFamily: fontBold, textAlign: isRTL ? "right" : "left" }]}>
                {receivables?.pendingInvoicesCount ?? 0}
              </Text>
            </View>

            {/* Overdue Customers */}
            <View style={[styles.kpiCard, { backgroundColor: isDark ? "rgba(247, 144, 9, 0.1)" : "rgba(247, 144, 9, 0.05)", borderColor: isDark ? "rgba(247, 144, 9, 0.2)" : "rgba(247, 144, 9, 0.1)" }]}>
              <View style={[styles.kpiCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Ionicons name="people" size={20} color={Colors.status.warning} />
              </View>
              <Text style={[styles.kpiLabel, { color: palette.textSecondary, fontFamily: fontReg, textAlign: isRTL ? "right" : "left" }]}>
                {t("todayKpis.overdue", "عملاء متأخرون")}
              </Text>
              <Text style={[styles.kpiValue, { color: palette.text, fontFamily: fontBold, textAlign: isRTL ? "right" : "left" }]}>
                {receivables?.overdueCustomersCount ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{ marginBottom: Spacing[6] }}>
          <Text style={[styles.sectionTitle, { color: palette.text, fontFamily: fontBold, textAlign: isRTL ? "right" : "left", marginBottom: Spacing[3] }]}>
            {t("sections.quickActions", "إجراءات سريعة")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.quickActionsScroll, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            {/* Primary Action */}
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: Colors.brand.primary, ...Shadows.md }]}
              onPress={() => navigate("/(client)/invoices")}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={28} color={Colors.white} style={{ marginBottom: 8 }} />
              <Text style={[styles.quickActionText, { color: Colors.white, fontFamily: fontBold }]}>
                {t("ctas.newInvoice", "إنشاء فاتورة")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: isDark ? "rgba(31, 122, 90, 0.2)" : "rgba(31, 122, 90, 0.1)", borderColor: "rgba(31, 122, 90, 0.1)", borderWidth: 1 }]}
              onPress={() => navigate("/(client)/payments")}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt" size={28} color={Colors.brand.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.quickActionText, { color: Colors.brand.primary, fontFamily: fontBold }]}>
                {t("ctas.recordPayment", "تسجيل دفعة")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: isDark ? "rgba(31, 122, 90, 0.2)" : "rgba(31, 122, 90, 0.1)", borderColor: "rgba(31, 122, 90, 0.1)", borderWidth: 1 }]}
              onPress={() => navigate("/(client)/customers")}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={28} color={Colors.brand.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.quickActionText, { color: Colors.brand.primary, fontFamily: fontBold }]}>
                {t("ctas.newCustomer", "إضافة عميل")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: isDark ? "rgba(31, 122, 90, 0.2)" : "rgba(31, 122, 90, 0.1)", borderColor: "rgba(31, 122, 90, 0.1)", borderWidth: 1 }]}
              onPress={() => navigate("/(client)/products")}
              activeOpacity={0.8}
            >
              <Ionicons name="cube" size={28} color={Colors.brand.primary} style={{ marginBottom: 8 }} />
              <Text style={[styles.quickActionText, { color: Colors.brand.primary, fontFamily: fontBold }]}>
                {t("ctas.newProduct", "منتج جديد")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Recent Activity / Overdue ── */}
        {overdueCustomers && overdueCustomers.length > 0 && (
          <View style={{ marginBottom: Spacing[6] }}>
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Text style={[styles.sectionTitle, { color: palette.text, fontFamily: fontBold }]}>
                {t("sections.recentActivity", "نشاط يستدعي الانتباه")}
              </Text>
              <TouchableOpacity onPress={() => navigate("/(client)/customers")}>
                <Text style={[styles.viewAllText, { color: Colors.brand.primary, fontFamily: fontBold }]}>
                  {t("common.viewAll", "عرض الكل")}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.activityContainer, { backgroundColor: palette.surface }]}>
              {overdueCustomers.slice(0, 3).map((c, idx) => (
                <TouchableOpacity
                  key={c.customerId}
                  style={[
                    styles.activityRow,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      borderBottomWidth: idx < 2 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: palette.border,
                    },
                  ]}
                  onPress={() => navigate(`/(client)/customers?highlight=${c.customerId}` as never)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.activityIconBox, { backgroundColor: isDark ? "rgba(240, 68, 56, 0.15)" : "rgba(240, 68, 56, 0.1)" }]}>
                    <Ionicons name="alert" size={20} color={Colors.status.error} />
                  </View>
                  <View style={[styles.activityContent, { alignItems: isRTL ? "flex-end" : "flex-start", marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
                    <Text style={[styles.activityTitle, { color: palette.text, fontFamily: fontBold }]} numberOfLines={1}>
                      {c.customerName}
                    </Text>
                    <Text style={[styles.activitySub, { color: palette.textSecondary, fontFamily: fontReg }]}>
                      {t("activity.overdue", "تجاوز موعد استحقاق السداد")}
                    </Text>
                  </View>
                  <View style={[styles.activityStatus, { backgroundColor: isDark ? "rgba(240, 68, 56, 0.15)" : "rgba(240, 68, 56, 0.1)" }]}>
                    <Text style={[styles.activityStatusText, { color: Colors.status.error, fontFamily: fontBold }]}>
                      {formatMoney(c.overdueAmount, currency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerProfile: {
    alignItems: "center",
  },
  greeting: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  userName: {
    fontSize: FontSize.md,
  },
  notificationBtn: {
    padding: Spacing[2],
    backgroundColor: "rgba(31, 122, 90, 0.1)",
    borderRadius: Radius.lg,
    position: "relative",
  },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[5],
    paddingBottom: Spacing[24], // space for bottom nav
  },
  sectionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontSize: FontSize.lg,
  },
  dateText: {
    fontSize: FontSize.xs,
  },
  viewAllText: {
    fontSize: FontSize.xs,
    padding: Spacing[2],
    margin: -Spacing[2],
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12, // React Native requires careful handling of gap vs margins, assuming newer RN version supports it in flex containers
  },
  kpiCard: {
    width: "48%", // approximations for 2 columns with gap
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
  },
  kpiCardHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing[1],
  },
  kpiValue: {
    fontSize: FontSize.xl,
  },
  quickActionsScroll: {
    paddingBottom: Spacing[2],
    gap: Spacing[3],
  },
  quickActionCard: {
    width: 110,
    height: 110,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[2],
  },
  quickActionText: {
    fontSize: FontSize.xs,
    textAlign: "center",
  },
  activityContainer: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  activityRow: {
    padding: Spacing[3],
    alignItems: "center",
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  activitySub: {
    fontSize: FontSize.xs,
  },
  activityStatus: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.sm,
  },
  activityStatusText: {
    fontSize: 10,
  },
});
