import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { usePlatformFeatureFlags, usePlatformSettings } from '@/features/platform/hooks/usePlatform';
import { PLATFORM_ACCENT } from '@/features/platform/types';

export default function PlatformSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('platform');
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const settingsQuery = usePlatformSettings(true);
  const featureFlagsQuery = usePlatformFeatureFlags(true);

  const settings = settingsQuery.data;
  const featureFlags = featureFlagsQuery.data ?? [];
  const isLoading = settingsQuery.isLoading || featureFlagsQuery.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <ZText size="xl" weight="bold" style={styles.headerTitle}>
          {t('platformSettings.title')}
        </ZText>
        <ZText size="xs" style={styles.headerSubtitle}>
          {t('platformSettings.subtitle')}
        </ZText>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={PLATFORM_ACCENT} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.readOnlyNote, { backgroundColor: `${PLATFORM_ACCENT}12` }]}>
            <Ionicons name="information-circle-outline" size={18} color={PLATFORM_ACCENT} />
            <ZText size="sm" style={{ color: PLATFORM_ACCENT, flex: 1 }}>
              {t('platformSettings.readOnlyNote')}
            </ZText>
          </View>

          <SectionCard title={t('platformSettings.sections.trialDefaults')} palette={palette}>
            <InfoRow
              label={t('platformSettings.fields.durationDays')}
              value={String(settings?.trialDefaults.durationDays ?? '-')}
            />
            <InfoRow
              label={t('platformSettings.fields.autoActivateOnSignup')}
              value={toToggleLabel(settings?.trialDefaults.autoActivateOnSignup)}
            />
            <InfoRow
              label={t('platformSettings.fields.requireCompanyPhone')}
              value={toToggleLabel(settings?.trialDefaults.requireCompanyPhone)}
            />
          </SectionCard>

          <SectionCard title={t('platformSettings.sections.subscriptionPolicies')} palette={palette}>
            <InfoRow
              label={t('platformSettings.fields.gracePeriodDays')}
              value={String(settings?.subscriptionPolicies.gracePeriodDays ?? '-')}
            />
            <InfoRow
              label={t('platformSettings.fields.allowPlanDowngrade')}
              value={toToggleLabel(settings?.subscriptionPolicies.allowPlanDowngrade)}
            />
            <InfoRow
              label={t('platformSettings.fields.allowPlanUpgrade')}
              value={toToggleLabel(settings?.subscriptionPolicies.allowPlanUpgrade)}
            />
            <InfoRow
              label={t('platformSettings.fields.enforceSingleActiveSubscription')}
              value={toToggleLabel(settings?.subscriptionPolicies.enforceSingleActiveSubscription)}
            />
            <InfoRow
              label={t('platformSettings.fields.prorationMode')}
              value={String(settings?.subscriptionPolicies.prorationMode ?? '-')}
            />
          </SectionCard>

          <SectionCard title={t('platformSettings.sections.governanceGuardrails')} palette={palette}>
            <InfoRow
              label={t('platformSettings.fields.strictQuotaEnforcement')}
              value={toToggleLabel(settings?.governanceGuardrails.strictQuotaEnforcement)}
            />
            <InfoRow
              label={t('platformSettings.fields.blockOnExpiredSubscription')}
              value={toToggleLabel(settings?.governanceGuardrails.blockOnExpiredSubscription)}
            />
            <InfoRow
              label={t('platformSettings.fields.allowReadOnlyDuringGracePeriod')}
              value={toToggleLabel(settings?.governanceGuardrails.allowReadOnlyDuringGracePeriod)}
            />
          </SectionCard>

          <SectionCard
            title={t('platformSettings.sections.featureFlags')}
            palette={palette}
          >
            {featureFlags.length === 0 ? (
              <ZText size="sm" style={{ color: palette.textMuted }}>
                {t('platformSettings.noFlags')}
              </ZText>
            ) : (
              featureFlags.map((flag) => (
                <View key={flag.name} style={[styles.flagRow, { borderColor: palette.border }]}>
                  <View style={{ flex: 1 }}>
                    <ZText size="sm" weight="bold" style={{ color: palette.text }}>
                      {flag.name}
                    </ZText>
                    <ZText size="xs" style={{ color: palette.textMuted }}>
                      {flag.description || '-'}
                    </ZText>
                  </View>
                  <View
                    style={[
                      styles.flagBadge,
                      {
                        backgroundColor: flag.enabled ? '#dcfce7' : '#fee2e2',
                      },
                    ]}
                  >
                    <ZText
                      size="xs"
                      weight="bold"
                      style={{ color: flag.enabled ? '#15803d' : '#b91c1c' }}
                    >
                      {flag.enabled ? t('platformSettings.enabled') : t('platformSettings.disabled')}
                    </ZText>
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </ScrollView>
      )}
    </View>
  );
}

function SectionCard({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surfaceSecondary }]}>
      <ZText size="sm" weight="bold" style={{ color: palette.text, marginBottom: Spacing[2] }}>
        {title}
      </ZText>
      <View style={{ gap: Spacing[1.5] }}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ZText size="xs" style={{ color: '#64748b', flex: 1 }}>
        {label}
      </ZText>
      <ZText size="xs" weight="medium" style={{ color: '#0f172a' }}>
        {value}
      </ZText>
    </View>
  );
}

function toToggleLabel(value: boolean | undefined): string {
  if (value === true) return 'ON';
  if (value === false) return 'OFF';
  return '-';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: PLATFORM_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerTitle: { color: '#fff' },
  headerSubtitle: { color: '#e9d5ff', marginTop: 2 },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  readOnlyNote: {
    borderRadius: Radius.lg,
    padding: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  flagRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  flagBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
  },
});
