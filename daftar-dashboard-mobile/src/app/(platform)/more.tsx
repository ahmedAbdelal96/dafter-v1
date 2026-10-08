/**
 * More Screen — Super Admin profile, app settings, and account actions.
 */
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useAuth } from '@/stores/auth-store';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { PLATFORM_ACCENT } from '@/features/platform/types';

// ─── Menu Row ─────────────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
}

function MenuRow({ icon, label, value, onPress, right, destructive = false }: MenuRowProps) {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;
  const fontMed = fontLocale === 'arabic' ? Fonts.arabic.medium : Fonts.latin.medium;
  const fontReg = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;
  const color = destructive ? '#dc2626' : palette.text;

  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          borderBottomColor: palette.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={0.7}
    >
      <View style={[styles.menuLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.menuIconWrap,
            {
              backgroundColor: destructive
                ? '#fef2f2'
                : isDark ? Colors.dark.surfaceSecondary : '#f3f4f6',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={destructive ? '#dc2626' : palette.textMuted}
          />
        </View>
        <ZText
          size="sm"
          weight="medium"
          style={{ color, fontFamily: fontMed, flex: 1 }}
        >
          {label}
        </ZText>
      </View>

      <View style={[styles.menuRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {value ? (
          <ZText size="sm" style={{ color: palette.textMuted, fontFamily: fontReg }}>
            {value}
          </ZText>
        ) : null}
        {right ?? null}
        {onPress && !right ? (
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={16}
            color={palette.textMuted}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlatformMore() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { isRTL, locale, fontLocale, changeLocale } = useLocale();
  const { t } = useTranslation('platform');
  const tProfile = useTranslation('profile').t;
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;
  const fontSemi = fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const fontReg = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = React.useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }, [logout]);

  const handleLanguageToggle = React.useCallback(async () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    const result = await changeLocale(next);
    if (result.needsRestart) {
      Alert.alert(tProfile('language.restartRequired'));
    }
  }, [locale, changeLocale, tProfile]);

  return (
    <>
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('more.title')}
          </ZText>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing[8] }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Admin profile card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: isDark ? Colors.dark.surface : '#fff',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <ZAvatar name={user?.fullName ?? 'Admin'} size="lg" />
            <View
              style={[
                styles.profileInfo,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}
            >
              <ZText weight="bold" size="base" style={{ color: palette.text }}>
                {user?.fullName}
              </ZText>
              <ZText size="xs" variant="secondary">{user?.email}</ZText>
              <View
                style={[styles.roleTag, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Ionicons name="shield-checkmark" size={12} color={PLATFORM_ACCENT} />
                <ZText size="xs" weight="bold" style={{ color: PLATFORM_ACCENT }}>
                  {t('more.superAdmin')}
                </ZText>
              </View>
            </View>
          </View>

          {/* Section: App Settings */}
          <ZText
            weight="semibold"
            size="xs"
            style={[
              styles.sectionTitle,
              {
                color: palette.textMuted,
                textAlign: isRTL ? 'right' : 'left',
                fontFamily: fontSemi,
              },
            ]}
          >
            {tProfile('settings.title').toUpperCase()}
          </ZText>

          <View
            style={[
              styles.section,
              { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
            ]}
          >
            <MenuRow
              icon={isDark ? 'moon' : 'sunny-outline'}
              label={isDark ? tProfile('settings.darkMode') : tProfile('settings.lightMode')}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ true: PLATFORM_ACCENT, false: palette.border }}
                  thumbColor="#fff"
                />
              }
            />
            <MenuRow
              icon="language-outline"
              label={tProfile('settings.language')}
              value={locale === 'ar' ? tProfile('language.ar') : tProfile('language.en')}
              onPress={handleLanguageToggle}
            />
            <MenuRow
              icon="receipt-outline"
              label={t('more.auditLogs')}
              onPress={() => router.push('/(platform)/audit-logs')}
            />
            <MenuRow
              icon="settings-outline"
              label={t('more.platformSettings')}
              onPress={() => router.push('/(platform)/platform-settings')}
            />
          </View>

          {/* Section: Account */}
          <ZText
            weight="semibold"
            size="xs"
            style={[
              styles.sectionTitle,
              {
                color: palette.textMuted,
                textAlign: isRTL ? 'right' : 'left',
                fontFamily: fontSemi,
              },
            ]}
          >
            {tProfile('account').toUpperCase()}
          </ZText>

          {/* Info note */}
          <View
            style={[
              styles.infoNote,
              {
                backgroundColor: `${PLATFORM_ACCENT}10`,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color={PLATFORM_ACCENT} />
            <ZText size="sm" style={{ color: PLATFORM_ACCENT, flex: 1 }}>
              {t('more.adminNote')}
            </ZText>
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
            ]}
          >
            <MenuRow
              icon="log-out-outline"
              label={t('more.logout')}
              destructive
              onPress={() => setShowLogoutConfirm(true)}
            />
          </View>

          {/* Version */}
          <ZText
            size="xs"
            style={{
              color: palette.textMuted,
              textAlign: 'center',
              fontFamily: fontReg,
              paddingVertical: Spacing[2],
            }}
          >
            Dafter v1.0.0
          </ZText>
        </ScrollView>
      </View>

      {/* Logout confirmation dialog */}
      <ZConfirmDialog
        visible={showLogoutConfirm}
        variant="danger"
        title={t('more.logout')}
        message={tProfile('actions.logoutConfirm')}
        confirmLabel={t('more.logout')}
        cancelLabel={tProfile('actions.cancel')}
        loading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: PLATFORM_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerTitle: { color: '#fff' },
  scroll: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  profileCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: { flex: 1, gap: 3 },
  roleTag: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${PLATFORM_ACCENT}12`,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  sectionTitle: {
    marginTop: Spacing[1],
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoNote: {
    borderRadius: Radius.xl,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
  },
  menuRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLeft: {
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRight: {
    alignItems: 'center',
    gap: Spacing[2],
  },
});
