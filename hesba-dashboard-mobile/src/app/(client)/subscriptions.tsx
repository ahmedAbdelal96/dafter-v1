/**
 * Subscriptions Screen — إدارة الاشتراك
 *
 * Layout:
 *   ┌── Purple Header ──────────────────────────────────────────┐
 *   │  إدارة الاشتراك                                           │
 *   └───────────────────────────────────────────────────────────┘
 *   Plan Hero Card: name + status badge + end date
 *   Quotas Section: progress bars (users/customers/suppliers/employees)
 *   Features Section: grouped by module with enabled/disabled chips
 *   Contact CTA: "للترقية تواصل معنا"
 *
 * Data: GET /my/entitlements — read-only view (plan changes via SuperAdmin only)
 */
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, type ColorPalette } from '@/constants/theme';
import { useMyEntitlements } from '@/features/subscriptions/hooks/useSubscriptions';
import {
  SUBS_ACCENT,
  FEATURE_MODULE_ICONS,
  parseFeatureModule,
  getStatusConfig,
  getQuotaBarColor,
  type QuotaType,
} from '@/features/subscriptions/types';

// All possible feature modules in order
const ALL_MODULES = [
  'dashboard',
  'customers',
  'suppliers',
  'employees',
  'ledger',
  'expenses',
  'products',
  'invoices',
  'deferred_sales',
  'installments',
  'reports',
] as const;

const QUOTA_KEYS: QuotaType[] = [
  'customers',
  'suppliers',
  'employees',
  'users',
  'ledgerEntries',
];

export default function SubscriptionsScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('subscriptions');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading, isError, refetch } = useMyEntitlements();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('title')}
          </ZText>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={SUBS_ACCENT} />
        </View>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('title')}
          </ZText>
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={52} color={palette.textMuted} />
          <ZText weight="bold" style={{ color: palette.text, marginTop: Spacing[3] }}>
            {t('errorLoad')}
          </ZText>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: SUBS_ACCENT }]}
            onPress={() => refetch()}
          >
            <ZText size="sm" weight="bold" style={{ color: '#fff' }}>
              {t('retry')}
            </ZText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const statusConfig = getStatusConfig(data.subscriptionStatus);

  // Format end date
  const endDate = new Date(data.endDate);
  const endDateStr = endDate.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Days remaining
  const daysLeft = Math.ceil(
    (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const daysLeftPositive = Math.max(0, daysLeft);

  // Enabled modules set
  const enabledModules = new Set(
    data.features.map((f) => parseFeatureModule(f)),
  );

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <ZText weight="bold" size="xl" style={styles.headerTitle}>
          {t('title')}
        </ZText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Plan Hero Card ── */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: isDark ? Colors.dark.surface : '#fff',
              shadowColor: SUBS_ACCENT,
            },
          ]}
        >
          {/* Top row: plan name + status */}
          <View
            style={[
              styles.planTop,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.planIconBox,
                { backgroundColor: `${SUBS_ACCENT}18` },
              ]}
            >
              <Ionicons name="star" size={24} color={SUBS_ACCENT} />
            </View>
            <View
              style={[
                styles.planNameBlock,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}
            >
              <ZText weight="bold" size="xl" style={{ color: palette.text }}>
                {data.planName}
              </ZText>
              <ZText size="xs" variant="secondary">
                {t('currentPlan')}
              </ZText>
            </View>
            {/* Status pill */}
            <View
              style={[styles.statusPill, { backgroundColor: statusConfig.bgColor }]}
            >
              <Ionicons
                name={statusConfig.icon as any}
                size={13}
                color={statusConfig.color}
              />
              <ZText
                size="xs"
                weight="bold"
                style={{ color: statusConfig.color, marginStart: 4 }}
              >
                {t(`status.${data.subscriptionStatus}`)}
              </ZText>
            </View>
          </View>

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: palette.border }]}
          />

          {/* End date + days left */}
          <View
            style={[
              styles.planBottom,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.planMeta,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}
            >
              <ZText size="xs" variant="secondary">
                {t('endDate')}
              </ZText>
              <ZText size="sm" weight="medium" style={{ color: palette.text }}>
                {endDateStr}
              </ZText>
            </View>
            <View
              style={[
                styles.daysLeft,
                {
                  backgroundColor:
                    daysLeftPositive <= 7
                      ? '#fef2f2'
                      : daysLeftPositive <= 30
                        ? '#fffbeb'
                        : `${SUBS_ACCENT}12`,
                },
              ]}
            >
              <ZText
                weight="bold"
                size="lg"
                style={{
                  color:
                    daysLeftPositive <= 7
                      ? '#dc2626'
                      : daysLeftPositive <= 30
                        ? '#d97706'
                        : SUBS_ACCENT,
                }}
              >
                {daysLeftPositive}
              </ZText>
              <ZText
                size="xs"
                style={{
                  color:
                    daysLeftPositive <= 7
                      ? '#dc2626'
                      : daysLeftPositive <= 30
                        ? '#d97706'
                        : SUBS_ACCENT,
                }}
              >
                {t('daysLeft')}
              </ZText>
            </View>
          </View>
        </View>

        {/* ── Quotas Section ── */}
        <SectionTitle title={t('section.quotas')} palette={palette} isRTL={isRTL} />

        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
          ]}
        >
          {QUOTA_KEYS.map((key, idx) => {
            const quota = data.quotas[key];
            if (!quota) return null;
            const pct = quota.usagePercent ?? 0;
            const barColor = quota.isUnlimited
              ? SUBS_ACCENT
              : getQuotaBarColor(pct);

            return (
              <View key={key}>
                {idx > 0 && (
                  <View
                    style={[styles.rowDivider, { backgroundColor: palette.border }]}
                  />
                )}
                <View
                  style={[
                    styles.quotaRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={[
                      styles.quotaLabel,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                  >
                    <ZText
                      size="sm"
                      weight="medium"
                      style={{ color: palette.text }}
                    >
                      {t(`quota.${key}`)}
                    </ZText>
                    <ZText size="xs" variant="secondary">
                      {quota.isUnlimited
                        ? t('quota.unlimited')
                        : `${quota.current} / ${quota.limit}`}
                    </ZText>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.quotaBarWrap}>
                    <View
                      style={[
                        styles.quotaBarTrack,
                        { backgroundColor: isDark ? Colors.dark.surfaceTertiary : '#f3f4f6' },
                      ]}
                    >
                      <View
                        style={[
                          styles.quotaBarFill,
                          {
                            width: quota.isUnlimited
                              ? '100%'
                              : `${Math.min(100, pct ?? 0)}%`,
                            backgroundColor: barColor,
                            opacity: quota.isUnlimited ? 0.3 : 1,
                          },
                        ]}
                      />
                    </View>
                    {!quota.isUnlimited && quota.isAtLimit && (
                      <ZText
                        size="xs"
                        weight="bold"
                        style={{ color: '#dc2626', marginTop: 2 }}
                      >
                        {t('quota.atLimit')}
                      </ZText>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Features Section ── */}
        <SectionTitle title={t('section.features')} palette={palette} isRTL={isRTL} />

        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
          ]}
        >
          <View style={styles.featuresGrid}>
            {ALL_MODULES.map((mod) => {
              const isEnabled = enabledModules.has(mod);
              const icon = FEATURE_MODULE_ICONS[mod] ?? 'apps-outline';
              return (
                <View
                  key={mod}
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor: isEnabled
                        ? `${SUBS_ACCENT}12`
                        : isDark
                          ? Colors.dark.surfaceTertiary
                          : '#f3f4f6',
                      opacity: isEnabled ? 1 : 0.55,
                    },
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={18}
                    color={isEnabled ? SUBS_ACCENT : palette.textMuted}
                  />
                  <ZText
                    size="xs"
                    weight={isEnabled ? 'medium' : 'regular'}
                    style={{
                      color: isEnabled ? SUBS_ACCENT : palette.textMuted,
                      marginTop: 4,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {t(`feature.${mod}`)}
                  </ZText>
                  {isEnabled && (
                    <View style={styles.featureCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={SUBS_ACCENT}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Upgrade CTA ── */}
        <View
          style={[
            styles.ctaCard,
            { backgroundColor: `${SUBS_ACCENT}10`, borderColor: `${SUBS_ACCENT}30` },
          ]}
        >
          <Ionicons name="rocket-outline" size={32} color={SUBS_ACCENT} />
          <View
            style={[
              styles.ctaText,
              { alignItems: isRTL ? 'flex-end' : 'flex-start' },
            ]}
          >
            <ZText weight="bold" size="base" style={{ color: SUBS_ACCENT }}>
              {t('cta.title')}
            </ZText>
            <ZText
              size="sm"
              variant="secondary"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            >
              {t('cta.desc')}
            </ZText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Section Title ─────────────────────────────────────────────────────────────

function SectionTitle({
  title,
  palette,
  isRTL,
}: {
  title: string;
  palette: ColorPalette;
  isRTL: boolean;
}) {
  return (
    <ZText
      weight="bold"
      size="sm"
      style={[
        styles.sectionTitle,
        { color: palette.textMuted, textAlign: isRTL ? 'right' : 'left' },
      ]}
    >
      {title.toUpperCase()}
    </ZText>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[6],
  },
  retryBtn: {
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
  },

  // Header
  header: {
    backgroundColor: SUBS_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerTitle: {
    color: '#fff',
  },

  scroll: {
    padding: Spacing[4],
    gap: 0,
  },

  // Plan card
  planCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  planTop: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  planIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNameBlock: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  divider: {
    height: 1,
    marginVertical: Spacing[3],
  },
  planBottom: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planMeta: {
    gap: 3,
  },
  daysLeft: {
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    minWidth: 64,
  },

  // Section title
  sectionTitle: {
    marginBottom: Spacing[2],
    marginTop: Spacing[4],
    letterSpacing: 0.5,
    paddingHorizontal: Spacing[1],
  },

  // Generic card
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: Spacing[2],
  },

  // Quota row
  rowDivider: {
    height: 1,
    marginVertical: Spacing[3],
  },
  quotaRow: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  quotaLabel: {
    width: 100,
    gap: 2,
  },
  quotaBarWrap: {
    flex: 1,
  },
  quotaBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  quotaBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Features grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  featureChip: {
    width: '30%',
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderRadius: Radius.lg,
    gap: 2,
    position: 'relative',
  },
  featureCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // CTA
  ctaCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginTop: Spacing[4],
  },
  ctaText: {
    flex: 1,
    gap: Spacing[1],
  },
});
