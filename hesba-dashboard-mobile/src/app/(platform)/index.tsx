/**
 * Platform Dashboard — Super Admin overview
 *
 * Shows: total companies + breakdown by subscription status,
 * recent companies list (last 5), quick links.
 */
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useAuth } from '@/stores/auth-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { usePlatformStats, useCompanies } from '@/features/platform/hooks/usePlatform';
import { getActiveSubscription, PLATFORM_ACCENT } from '@/features/platform/types';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PlatformDashboard() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  const { stats, isLoading: statsLoading } = usePlatformStats();
  const { data: recentData, isLoading: recentLoading, refetch } = useCompanies({
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const recent = recentData?.data ?? [];

  const statCards = [
    { label: t('stats.total'), value: stats.total, color: PLATFORM_ACCENT, icon: 'business' },
    { label: t('stats.active'), value: stats.active, color: '#16a34a', icon: 'checkmark-circle' },
    { label: t('stats.trial'), value: stats.trial, color: '#2563eb', icon: 'time' },
    { label: t('stats.suspended'), value: stats.suspended, color: '#dc2626', icon: 'pause-circle' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <View>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('dashboard.title')}
          </ZText>
          <ZText size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {user?.fullName}
          </ZText>
        </View>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#fff" />
          <ZText size="xs" weight="bold" style={{ color: '#fff' }}>
            {t('dashboard.adminBadge')}
          </ZText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing[8] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recentLoading}
            onRefresh={refetch}
            tintColor={PLATFORM_ACCENT}
            colors={[PLATFORM_ACCENT]}
          />
        }
      >
        {/* Stats grid */}
        <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {statCards.map(({ label, value, color, icon }) => (
            <View
              key={label}
              style={[
                styles.statCard,
                { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon as any} size={20} color={color} />
              </View>
              {statsLoading ? (
                <Skeleton width={40} height={24} borderRadius={6} />
              ) : (
                <ZText weight="bold" size="2xl" style={{ color: palette.text }}>
                  {value}
                </ZText>
              )}
              <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
                {label}
              </ZText>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <ZText
          weight="semibold"
          size="xs"
          style={[styles.sectionTitle, { color: palette.textMuted, textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('dashboard.quickLinks').toUpperCase()}
        </ZText>

        <View style={[styles.quickLinks, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <QuickLink
            icon="business-outline"
            label={t('tabs.companies')}
            color={PLATFORM_ACCENT}
            onPress={() => router.push('/(platform)/companies')}
            isDark={isDark}
          />
          <QuickLink
            icon="layers-outline"
            label={t('tabs.plans')}
            color="#0284c7"
            onPress={() => router.push('/(platform)/plans')}
            isDark={isDark}
          />
          <QuickLink
            icon="flash-outline"
            label={t('dashboard.newCompany')}
            color="#16a34a"
            onPress={() => router.push('/(platform)/companies')}
            isDark={isDark}
          />
        </View>

        {/* Recent companies */}
        <ZText
          weight="semibold"
          size="xs"
          style={[styles.sectionTitle, { color: palette.textMuted, textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('dashboard.recentCompanies').toUpperCase()}
        </ZText>

        {recentLoading ? (
          <View style={{ gap: Spacing[2] }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.recentRow,
                  { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
                ]}
              >
                <Skeleton width={36} height={36} borderRadius={10} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Skeleton width="50%" height={12} borderRadius={6} />
                  <Skeleton width="30%" height={10} borderRadius={5} />
                </View>
                <Skeleton width={56} height={20} borderRadius={10} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: Spacing[2] }}>
            {recent.map((company) => {
              const sub = getActiveSubscription(company);
              return (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.recentRow,
                    {
                      backgroundColor: isDark ? Colors.dark.surface : '#fff',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => router.push('/(platform)/companies')}
                  activeOpacity={0.75}
                >
                  <View style={[styles.recentIcon, { backgroundColor: `${PLATFORM_ACCENT}15` }]}>
                    <Ionicons name="business" size={16} color={PLATFORM_ACCENT} />
                  </View>
                  <View
                    style={[
                      styles.recentInfo,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                  >
                    <ZText size="sm" weight="medium" numberOfLines={1} style={{ color: palette.text }}>
                      {company.name}
                    </ZText>
                    <ZText size="xs" variant="secondary">
                      {new Date(company.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                    </ZText>
                  </View>
                  {sub && (
                    <View
                      style={[
                        styles.subPill,
                        { backgroundColor: sub.status === 'ACTIVE' ? '#f0fdf4' : '#eff6ff' },
                      ]}
                    >
                      <ZText
                        size="xs"
                        weight="bold"
                        style={{ color: sub.status === 'ACTIVE' ? '#16a34a' : '#2563eb' }}
                      >
                        {t(`subStatus.${sub.status}`)}
                      </ZText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  color,
  onPress,
  isDark,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.quickLinkBtn,
        { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickLinkIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <ZText size="xs" weight="medium" style={{ color, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </ZText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: PLATFORM_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff' },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing[2],
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  scroll: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  statCard: {
    width: '47.5%',
    alignItems: 'center',
    padding: Spacing[4],
    borderRadius: Radius.xl,
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: Spacing[2],
    letterSpacing: 0.5,
  },
  quickLinks: {
    gap: Spacing[2],
  },
  quickLinkBtn: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.xl,
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    elevation: 1,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRow: {
    borderRadius: Radius.xl,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    elevation: 1,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1, gap: 2 },
  subPill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
});
