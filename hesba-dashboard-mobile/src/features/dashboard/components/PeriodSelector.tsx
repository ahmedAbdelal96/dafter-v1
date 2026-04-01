/**
 * PeriodSelector — Dashboard Period Chip Strip
 *
 * A horizontal scrollable row of chips (اليوم / الأسبوع / الشهر / العام).
 * Tapping a chip calls onSelect with the new preset, triggering a re-fetch
 * via the queryKey change in useOverview.
 *
 * Design: active chip = brand blue fill + white text.
 *         inactive chip = transparent + border + muted text.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
} from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { PERIOD_OPTIONS } from '../types';
import type { DashboardPeriodPreset } from '../types';

interface PeriodSelectorProps {
  selected: DashboardPeriodPreset;
  onSelect: (preset: DashboardPeriodPreset) => void;
}

const PeriodSelector = memo(function PeriodSelector({
  selected,
  onSelect,
}: PeriodSelectorProps) {
  const { t } = useTranslation('dashboard');
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();

  const fontSemi =
    fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        // Reverse item order for RTL so the natural reading direction is preserved
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {PERIOD_OPTIONS.map((opt) => {
        const isActive = opt.key === selected;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.chip,
              isActive
                ? styles.chipActive
                : {
                    backgroundColor: 'transparent',
                    borderColor: palette.border,
                  },
            ]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                {
                  fontFamily: fontSemi,
                  color: isActive ? Colors.white : palette.textSecondary,
                },
              ]}
            >
              {t(`period.${opt.labelKey}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

export default PeriodSelector;

const styles = StyleSheet.create({
  container: {
    gap: Spacing[2],
    paddingHorizontal: Spacing[1],
    paddingVertical: Spacing[1],
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[1.5],
  },
  chipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
});
