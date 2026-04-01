/**
 * More (Menu) Screen — Feature Hub
 *
 * The fifth tab — a grid of all modules not in the main tab bar.
 * Designed as a persistent entry point so every feature is reachable
 * within one tap from anywhere in the app.
 *
 * Layout:
 *   - User info banner (avatar + name + plan badge)
 *   - 2-column grid of feature cards
 *   - Bottom section: Settings + Logout
 *
 * Feature cards navigate via router.push() to hidden tab screens.
 * This pattern keeps the bottom tab bar clean while ensuring discoverability.
 */
import React, { useCallback, memo } from 'react';
import { UnreadBadge } from '@/features/notifications/components/UnreadBadge';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/stores/auth-store';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { ZText } from '@/components/ui/ZText';
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
  Layout,
} from '@/constants/theme';

// ─── Feature Card Definition ──────────────────────────────────────────────────

interface FeatureItem {
  key: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Accent color for the icon background pill */
  accent: string;
  accentLight: string;
}

/**
 * Feature grid definition.
 * Each item maps to a hidden tab screen navigable via router.push().
 * Add new modules here as they are implemented in later phases.
 */
const FEATURES: FeatureItem[] = [
  {
    key: 'expenses',
    route: '/(client)/expenses',
    icon: 'wallet-outline',
    accent: '#d97706',      // amber
    accentLight: '#fffbeb',
  },
  {
    key: 'products',
    route: '/(client)/products',
    icon: 'cube-outline',
    accent: '#0d9488',      // teal
    accentLight: '#f0fdfa',
  },
  {
    key: 'suppliers',
    route: '/(client)/suppliers',
    icon: 'storefront-outline',
    accent: '#7c3aed',      // violet
    accentLight: '#f5f3ff',
  },
  {
    key: 'employees',
    route: '/(client)/employees',
    icon: 'id-card-outline',
    accent: '#4f46e5',      // indigo
    accentLight: '#eef2ff',
  },
  {
    key: 'deferredSales',
    route: '/(client)/deferred-sales',
    icon: 'time-outline',
    accent: '#dc2626',      // red
    accentLight: '#fef2f2',
  },
  {
    key: 'installments',
    route: '/(client)/installments',
    icon: 'calendar-outline',
    accent: '#16a34a',      // green
    accentLight: '#f0fdf4',
  },
  {
    key: 'reports',
    route: '/(client)/reports',
    icon: 'bar-chart-outline',
    accent: '#2563eb',      // blue (brand)
    accentLight: '#eff6ff',
  },
  {
    key: 'payroll',
    route: '/(client)/payroll',
    icon: 'cash-outline',
    accent: '#4f46e5',      // indigo
    accentLight: '#eef2ff',
  },
  {
    key: 'notifications',
    route: '/(client)/notifications',
    icon: 'notifications-outline',
    accent: '#ea580c',      // orange
    accentLight: '#fff7ed',
  },
];

// ─── Feature Card ─────────────────────────────────────────────────────────────

interface FeatureCardProps {
  item: FeatureItem;
  label: string;
  isDark: boolean;
  palette: typeof Colors.light | typeof Colors.dark;
  fontSemi: string;
  onPress: (route: string) => void;
}

const FeatureCard = memo(function FeatureCard({
  item,
  label,
  isDark,
  palette,
  fontSemi,
  onPress,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.featureCard,
        {
          backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
          borderColor: palette.border,
        },
      ]}
      onPress={() => onPress(item.route)}
      activeOpacity={0.75}
    >
      {/* Icon pill */}
      <View style={{ position: 'relative' }}>
        <View
          style={[
            styles.featureIconPill,
            {
              backgroundColor: isDark
                ? `${item.accent}22`   // low-opacity tint in dark mode
                : item.accentLight,
            },
          ]}
        >
          <Ionicons name={item.icon} size={22} color={item.accent} />
        </View>
        {/* Unread badge — only on notifications card */}
        {item.key === 'notifications' && <UnreadBadge top={-4} right={-4} />}
      </View>

      {/* Label */}
      <Text
        style={[
          styles.featureLabel,
          { color: palette.text, fontFamily: fontSemi },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ─── Settings Row ─────────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  palette: typeof Colors.light | typeof Colors.dark;
  fontReg: string;
  onPress: () => void;
  isDanger?: boolean;
}

function SettingsRow({
  icon,
  label,
  palette,
  fontReg,
  onPress,
  isDanger = false,
}: SettingsRowProps) {
  const color = isDanger ? Colors.status.error : palette.text;
  return (
    <TouchableOpacity
      style={[styles.settingsRow, { borderBottomColor: palette.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.settingsLabel, { color, fontFamily: fontReg }]}>
        {label}
      </Text>
      {!isDanger && (
        <Ionicons
          name="chevron-back-outline"
          size={16}
          color={palette.textMuted}
          style={styles.settingsChevron}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MenuScreen() {
  const { t } = useTranslation('common');
  const tSettings = useTranslation('settings').t;
  const router = useRouter();
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const { user, tenant, logout, displayName, initials } = useAuth();
  const insets = useSafeAreaInsets();

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg =
    fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontSemi =
    fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const fontBold =
    fontLocale === 'arabic' ? Fonts.arabic.bold : Fonts.latin.bold;

  const navigate = useCallback(
    async (route: string) => {
      await Haptics.selectionAsync();
      router.push(route as never);
    },
    [router],
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }, [logout]);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Premium Header */}
      <View style={[styles.header, { 
        paddingTop: Math.max(insets.top, Spacing[4]) + Spacing[2],
        backgroundColor: isDark ? Colors.dark.surface : Colors.white,
        borderBottomColor: palette.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
      }]}>
        <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="2xl" style={{ color: palette.text }}>
            {t('nav.more', 'المزيد')}
          </ZText>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User banner ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.userBanner,
            {
              backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
              borderColor: palette.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigate('/(client)/profile')}
          activeOpacity={0.8}
        >
          <ZAvatar name={displayName} size="md" />

          <View
            style={[
              styles.userInfo,
              {
                alignItems: isRTL ? 'flex-end' : 'flex-start',
                marginStart: Spacing[3],
              },
            ]}
          >
            <Text
              style={[
                styles.userName,
                { color: palette.text, fontFamily: fontBold },
              ]}
              numberOfLines={1}
            >
              {displayName || 'Dafter User'}
            </Text>
            {tenant?.name ? (
              <Text
                style={[
                  styles.userCompany,
                  { color: palette.textSecondary, fontFamily: fontReg },
                ]}
                numberOfLines={1}
              >
                {tenant.name}
              </Text>
            ) : null}
            {user?.role === 'OWNER' && (
              <View style={styles.rolePill}>
                <Text style={[styles.rolePillText, { fontFamily: fontSemi }]}>
                  {t(`subscription.${tenant?.subscriptionPlan ?? 'FREE'}`)}
                </Text>
              </View>
            )}
          </View>

          <Ionicons
            name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
            size={18}
            color={palette.textMuted}
            style={styles.bannerChevron}
          />
        </TouchableOpacity>

        {/* ── Feature grid ─────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: palette.textSecondary,
              fontFamily: fontSemi,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {isRTL ? 'الأقسام' : 'Modules'}
        </Text>

        <View style={[styles.featureGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {FEATURES.map((item) => (
            <FeatureCard
              key={item.key}
              item={item}
              label={t(`nav.${item.key}`)}
              isDark={isDark}
              palette={palette}
              fontSemi={fontSemi}
              onPress={navigate}
            />
          ))}
        </View>

        {/* ── Settings / Account ───────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: palette.textSecondary,
              fontFamily: fontSemi,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {tSettings('sections.account')}
        </Text>

        <View
          style={[
            styles.settingsCard,
            {
              backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
              borderColor: palette.border,
            },
          ]}
        >
          {user?.role === 'OWNER' && (
            <SettingsRow
              icon="people-circle-outline"
              label={t('nav.users')}
              palette={palette}
              fontReg={fontReg}
              onPress={() => navigate('/(client)/users')}
            />
          )}
          <SettingsRow
            icon="settings-outline"
            label={tSettings('title')}
            palette={palette}
            fontReg={fontReg}
            onPress={() => navigate('/(client)/profile')}
          />
          <SettingsRow
            icon="log-out-outline"
            label={tSettings('account.logout')}
            palette={palette}
            fontReg={fontReg}
            isDanger
            onPress={() => setShowLogoutConfirm(true)}
          />
        </View>
      </ScrollView>

      {/* ── Logout confirmation dialog ───────────────────────────────────── */}
      <ZConfirmDialog
        visible={showLogoutConfirm}
        variant="danger"
        title={tSettings('account.logout')}
        message={tSettings('account.logoutConfirm')}
        confirmLabel={tSettings('account.logout')}
        cancelLabel={t('actions.cancel')}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[4],
  },
  headerTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scrollContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[6],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
  },

  // User banner
  userBanner: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    alignItems: 'center',
  },
  userInfo: { flex: 1, gap: Spacing[0.5] },
  userName: { fontSize: FontSize.md },
  userCompany: { fontSize: FontSize.sm },
  rolePill: {
    marginTop: Spacing[1],
    backgroundColor: Colors.brand.primaryLight,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  rolePillText: {
    fontSize: FontSize.xs,
    color: Colors.brand.primary,
  },
  bannerChevron: { marginStart: Spacing[2] },

  // Section headers
  sectionTitle: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
    paddingHorizontal: Spacing[1],
  },

  // Feature grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '3.5%', // Slightly more than width
  },
  featureCard: {
    width: '31%', // 3 columns
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    gap: Spacing[2],
  },
  featureIconPill: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.4,
  },

  // Settings card
  settingsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3.5],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsLabel: { flex: 1, fontSize: FontSize.sm },
  settingsChevron: { marginStart: 'auto' },
});
