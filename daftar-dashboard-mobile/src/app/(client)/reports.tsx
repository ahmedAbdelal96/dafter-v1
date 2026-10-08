/**
 * Reports Screen — التقارير
 *
 * Layout:
 *   ┌── Blue Header ───────────────────────────────────────────────┐
 *   │  التقارير                                                    │
 *   │  Date preset chips: This Month | Last 3M | This Year        │
 *   └──────────────────────────────────────────────────────────────┘
 *   Tab bar: Summary | Overdue | Collection Schedule
 *   Tab content (scrollable)
 *
 * Read-only — no mutations, no forms.
 * Each tab is lazy-mounted (conditional render) to avoid firing unused queries.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { SummaryTab } from '@/features/reports/components/SummaryTab';
import { OverdueTab } from '@/features/reports/components/OverdueTab';
import { CollectionTab } from '@/features/reports/components/CollectionTab';
import { AdvancedReportsTab } from '@/features/reports/components/AdvancedReportsTab';
import {
  DATE_PRESETS,
  REPORTS_ACCENT,
  getPresetDates,
  type DatePreset,
} from '@/features/reports/types';

type TabKey = 'summary' | 'overdue' | 'collection' | 'advanced';

const TABS: { key: TabKey; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'summary', icon: 'bar-chart-outline' },
  { key: 'overdue', icon: 'warning-outline' },
  { key: 'collection', icon: 'calendar-outline' },
  { key: 'advanced', icon: 'analytics-outline' },
];

export default function ReportsScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('reports');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [activePreset, setActivePreset] = useState<DatePreset>('THIS_MONTH');

  const dateParams = useMemo(() => getPresetDates(activePreset), [activePreset]);

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        {/* Title */}
        <ZText weight="bold" size="xl" style={styles.headerTitle}>
          {t('title')}
        </ZText>

        {/* Date preset chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.presetScroll,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {DATE_PRESETS.map((preset) => {
            const isActive = activePreset === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.18)',
                    borderColor: isActive
                      ? 'transparent'
                      : 'rgba(255,255,255,0.3)',
                  },
                ]}
                onPress={() => setActivePreset(preset)}
                activeOpacity={0.75}
              >
                <ZText
                  size="xs"
                  weight={isActive ? 'bold' : 'regular'}
                  style={{
                    color: isActive ? REPORTS_ACCENT : 'rgba(255,255,255,0.9)',
                  }}
                >
                  {t(`filter.${
                    preset === 'THIS_MONTH'
                      ? 'thisMonth'
                      : preset === 'LAST_3_MONTHS'
                      ? 'last3Months'
                      : 'thisYear'
                  }`)}
                </ZText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Tab bar ── */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? Colors.dark.surface : '#fff',
            borderBottomColor: palette.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                isActive && {
                  borderBottomWidth: 2,
                  borderBottomColor: REPORTS_ACCENT,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? REPORTS_ACCENT : palette.textMuted}
              />
              <ZText
                size="xs"
                weight={isActive ? 'bold' : 'regular'}
                style={{
                  color: isActive ? REPORTS_ACCENT : palette.textMuted,
                }}
              >
                {t(`tabs.${tab.key}`)}
              </ZText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab content ── */}
      <View style={styles.flex}>
        {activeTab === 'summary' && (
          <SummaryTab />
        )}
        {activeTab === 'overdue' && (
          <OverdueTab />
        )}
        {activeTab === 'collection' && (
          <CollectionTab params={dateParams} />
        )}
        {activeTab === 'advanced' && (
          <AdvancedReportsTab params={dateParams} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: REPORTS_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerTitle: {
    color: '#fff',
  },
  presetScroll: {
    gap: Spacing[2],
  },
  presetChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tabBar: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
