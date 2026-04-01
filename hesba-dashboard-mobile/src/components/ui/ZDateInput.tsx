import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from './BottomSheet';
import { Colors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';

interface ZDateInputProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  allowPastDates?: boolean;
  label?: string;
  placeholder?: string;
}

const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];
const AR_DAYS = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

function monthGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunkWeeks(cells: (Date | null)[]): (Date | null)[][] {
  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function ZDateInput({
  value,
  onChange,
  minDate,
  allowPastDates = false,
  label = 'التاريخ',
  placeholder = 'اختر التاريخ',
}: ZDateInputProps) {
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState<Date>(startOfDay(value ?? new Date()));
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();

  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontMed = fontLocale === 'arabic' ? Fonts.arabic.medium : Fonts.latin.medium;
  const minDay = useMemo(() => {
    if (allowPastDates) return new Date(1970, 0, 1);
    return startOfDay(minDate ?? new Date());
  }, [allowPastDates, minDate]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);
  const cells = useMemo(() => monthGrid(monthCursor), [monthCursor]);
  const weeks = useMemo(() => chunkWeeks(cells), [cells]);

  const canGoPrev = useMemo(() => {
    const prevMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
    const prevMonthLastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    return prevMonthLastDay >= minDay;
  }, [monthCursor, minDay]);

  const displayValue = value
    ? `${value.getDate()} ${AR_MONTHS[value.getMonth()]} ${value.getFullYear()}`
    : placeholder;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.textSecondary, fontFamily: fontMed }]}>
        {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.input,
          {
            backgroundColor: palette.surfaceSecondary,
            borderColor: Colors.brand.primary,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => {
          setMonthCursor(startOfDay(value ?? new Date()));
          setOpen(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.brand.primary} />
        <Text
          style={[
            styles.value,
            { color: value ? palette.text : palette.textMuted, fontFamily: value ? fontMed : fontReg },
          ]}
        >
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
      </TouchableOpacity>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="اختيار التاريخ"
        maxHeightFraction={0.85}
      >
        <View style={[styles.quickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.quickChip, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}
            onPress={() => {
              onChange(today);
              setOpen(false);
            }}
          >
            <Text style={[styles.quickText, { color: palette.text, fontFamily: fontReg }]}>اليوم</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickChip, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}
            onPress={() => {
              onChange(tomorrow);
              setOpen(false);
            }}
          >
            <Text style={[styles.quickText, { color: palette.text, fontFamily: fontReg }]}>بكرة</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.monthNav, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.navBtn, { opacity: canGoPrev ? 1 : 0.35 }]}
            disabled={!canGoPrev}
            onPress={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={18}
              color={palette.textSecondary}
            />
          </TouchableOpacity>

          <Text style={[styles.monthLabel, { color: palette.text, fontFamily: fontMed }]}>
            {AR_MONTHS[monthCursor.getMonth()]} {monthCursor.getFullYear()}
          </Text>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
          >
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={palette.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeader}>
          {AR_DAYS.map((day) => (
            <Text key={day} style={[styles.weekDay, { color: palette.textMuted, fontFamily: fontReg }]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((cell, cellIndex) => {
                if (!cell) {
                  return <View key={`empty-${weekIndex}-${cellIndex}`} style={styles.dayCell} />;
                }

                const disabled = cell < minDay;
                const selected = value ? sameDay(cell, value) : false;
                const isToday = sameDay(cell, today);

                return (
                  <View key={dateKey(cell)} style={styles.dayCell}>
                    <TouchableOpacity
                      style={[
                        styles.dayButton,
                        {
                          backgroundColor: selected ? Colors.brand.primary : palette.surfaceSecondary,
                          borderColor: selected
                            ? Colors.brand.primary
                            : isToday
                            ? Colors.brand.primary
                            : palette.border,
                          opacity: disabled ? 0.35 : 1,
                        },
                      ]}
                      disabled={disabled}
                      onPress={() => {
                        onChange(cell);
                        setOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: selected ? Colors.white : palette.text,
                            fontFamily: selected ? fontMed : fontReg,
                          },
                        ]}
                      >
                        {cell.getDate()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing[1.5] },
  label: { fontSize: FontSize.sm },
  input: {
    alignItems: 'center',
    gap: Spacing[3],
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    minHeight: 50,
  },
  value: { flex: 1, fontSize: FontSize.base },
  quickRow: {
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  quickText: { fontSize: FontSize.sm },
  monthNav: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  navBtn: { padding: Spacing[1] },
  monthLabel: { fontSize: FontSize.base },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing[1],
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  weekDay: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: FontSize.xs,
  },
  grid: {
    width: '100%',
    paddingBottom: Spacing[2],
  },
  dayCell: {
    width: '14.2857%',
    padding: Spacing[0.5],
  },
  dayButton: {
    width: '100%',
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: FontSize.sm },
});
