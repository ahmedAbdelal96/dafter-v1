/**
 * Plans Screen — view all subscription plans.
 * Read-only on mobile — plan creation/editing done via web admin.
 */
import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { usePlans } from '@/features/platform/hooks/usePlatform';
import { PLATFORM_ACCENT, type Plan } from '@/features/platform/types';

export default function PlansScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  const [showInactive, setShowInactive] = useState(false);
  const { data: plans = [], isLoading, refetch, isFetching } = usePlans(showInactive);

  const renderPlan = ({ item }: { item: Plan }) => {
    let featureKeys: string[] = [];
    try {
      featureKeys = JSON.parse(item.features) as string[];
    } catch {
      featureKeys = [];
    }

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? Colors.dark.surface : '#fff',
            borderLeftWidth: 4,
            borderLeftColor: item.isActive ? PLATFORM_ACCENT : palette.border,
            opacity: item.isActive ? 1 : 0.6,
          },
        ]}
      >
        {/* Top row */}
        <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <ZText weight="bold" size="base" style={{ color: palette.text }}>
              {item.name}
            </ZText>
            <ZText size="sm" style={{ color: PLATFORM_ACCENT }}>
              {item.currencyCode} {item.price.toLocaleString()}
              <ZText size="xs" variant="secondary">
                {' '}/ {t(`billing.${item.billingCycle}`)}
              </ZText>
            </ZText>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: item.isActive ? '#f0fdf4' : '#f3f4f6',
              },
            ]}
          >
            <ZText
              size="xs"
              weight="bold"
              style={{ color: item.isActive ? '#16a34a' : palette.textMuted }}
            >
              {item.isActive ? t('plans.active') : t('plans.inactive')}
            </ZText>
          </View>
        </View>

        {/* Limits */}
        <View style={[styles.limits, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {[
            { label: t('plans.maxUsers'), value: item.maxUsers },
            { label: t('plans.maxCustomers'), value: item.maxCustomers },
            { label: t('plans.maxEmployees'), value: item.maxEmployees },
          ].map(({ label, value }) => (
            <View key={label} style={styles.limitItem}>
              <ZText size="xs" variant="secondary">{label}</ZText>
              <ZText size="sm" weight="semibold" style={{ color: palette.text }}>
                {value === null ? '∞' : value}
              </ZText>
            </View>
          ))}
        </View>

        {/* Feature count */}
        {featureKeys.length > 0 && (
          <View style={[styles.featRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="checkmark-circle-outline" size={14} color={PLATFORM_ACCENT} />
            <ZText size="xs" style={{ color: PLATFORM_ACCENT }}>
              {t('plans.featuresCount', { count: featureKeys.length })}
            </ZText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {t('plans.title')}
          </ZText>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setShowInactive((v) => !v)}
          >
            <Ionicons
              name={showInactive ? 'eye-outline' : 'eye-off-outline'}
              size={16}
              color="rgba(255,255,255,0.8)"
            />
            <ZText size="xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {showInactive ? t('plans.hideInactive') : t('plans.showInactive')}
            </ZText>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing[4], gap: Spacing[3] }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.card, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
              <Skeleton width="50%" height={16} borderRadius={8} />
              <Skeleton width="35%" height={13} borderRadius={6} style={{ marginTop: 6 }} />
              <Skeleton width="80%" height={11} borderRadius={5} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlan}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={PLATFORM_ACCENT}
              colors={[PLATFORM_ACCENT]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={52} color={palette.textMuted} />
              <ZText variant="secondary" style={{ textAlign: 'center' }}>
                {t('plans.empty')}
              </ZText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: PLATFORM_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff' },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing[2],
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  list: { padding: Spacing[4], paddingBottom: Spacing[10], gap: Spacing[3] },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { alignItems: 'center', gap: Spacing[2] },
  statusPill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  limits: {
    gap: Spacing[3],
  },
  limitItem: { alignItems: 'center', flex: 1 },
  featRow: { alignItems: 'center', gap: 4 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[10],
    gap: Spacing[3],
  },
});
