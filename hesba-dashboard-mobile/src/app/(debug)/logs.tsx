/**
 * Log Viewer Screen — Zayna Mobile Dashboard
 *
 * Developer tool for viewing, sharing, and managing app log files.
 * Navigate to this screen with: router.push('/(debug)/logs')
 *
 * Features:
 * - Date tabs (today / yesterday / older)
 * - Color-coded log lines by level (ERROR=red, WARN=orange, NAV=blue, API=green)
 * - Share log file via any installed app (email, WhatsApp, Drive, etc.)
 * - Delete individual log files
 * - Auto-scroll to bottom (newest entries last)
 * - Line count badge per file
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { logger } from '@/lib/logger';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

// ─── Log line colors by level ─────────────────────────────────────────────────

function getLineColor(line: string): string {
  if (line.includes('[ERROR]')) return Colors.status.error;
  if (line.includes('[WARN ]')) return Colors.status.warning;
  if (line.includes('[NAV  ]')) return Colors.status.info;
  if (line.includes('[API  ]')) return Colors.status.success;
  if (line.includes('[DEBUG]')) return Colors.light.textMuted;
  return 'inherit'; // INFO — default text color
}

function getLineBg(line: string, isDark: boolean): string | undefined {
  if (line.includes('[ERROR]')) return isDark ? 'rgba(240,68,56,0.08)' : 'rgba(240,68,56,0.04)';
  if (line.includes('[WARN ]')) return isDark ? 'rgba(247,144,9,0.08)'  : 'rgba(247,144,9,0.04)';
  return undefined;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LogsScreen() {
  const router              = useRouter();
  const insets              = useSafeAreaInsets();
  const { isDark }          = useTheme();
  const { fontLocale }      = useLocale();

  const palette    = isDark ? Colors.dark : Colors.light;
  const fontReg    = fontLocale === 'arabic' ? Fonts.arabic.regular  : Fonts.latin.regular;
  const fontMed    = fontLocale === 'arabic' ? Fonts.arabic.medium   : Fonts.latin.medium;
  const fontSemi   = fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const fontBold   = fontLocale === 'arabic' ? Fonts.arabic.bold     : Fonts.latin.bold;
  const fontMono   = 'Inter_400Regular'; // Fixed-width for log readability

  const [dates,       setDates]       = useState<string[]>([]);
  const [activeDate,  setActiveDate]  = useState<string>('');
  const [content,     setContent]     = useState<string[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const flatListRef                   = useRef<FlatList>(null);

  // ── Load available dates ─────────────────────────────────────────────────
  const loadDates = useCallback(async () => {
    const available = await logger.listDates();
    setDates(available);
    if (available.length > 0 && !activeDate) {
      setActiveDate(available[0]); // Default to most recent
    }
  }, [activeDate]);

  // ── Load content for selected date ──────────────────────────────────────
  const loadContent = useCallback(async (date: string) => {
    setIsLoading(true);
    const text = await logger.readDate(date);
    // Split into lines, filter empties
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    setContent(lines);
    setIsLoading(false);

    // Scroll to bottom after load
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  useEffect(() => { void loadDates(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeDate) void loadContent(activeDate); }, [activeDate, loadContent]);

  // ── Share log file ───────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const filePath = logger.getFilePath(activeDate);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        Alert.alert('لا يوجد ملف', 'ملف السجل غير موجود لهذا التاريخ');
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: `سجل ${activeDate}`,
          UTI: 'public.plain-text',
        });
      } else {
        // Fallback to React Native Share API (text content)
        await Share.share({ message: content.join('\n'), title: `سجل ${activeDate}` });
      }
    } catch {
      Alert.alert('خطأ', 'فشل مشاركة الملف');
    }
  }, [activeDate, content]);

  // ── Delete log file ──────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'حذف السجل',
      `هل تريد حذف سجل ${activeDate}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await logger.deleteDate(activeDate);
            await loadDates();
            setContent([]);
          },
        },
      ],
    );
  }, [activeDate, loadDates]);

  // ── Render a single log line ─────────────────────────────────────────────
  const renderLine = useCallback(({ item }: { item: string }) => {
    const color  = getLineColor(item);
    const bg     = getLineBg(item, isDark);

    // Split line into timestamp prefix and message body
    // Format: [HH:MM:SS] [LEVEL] [Tag] Message
    const timeMatch = item.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
    const time      = timeMatch?.[1] ?? '';
    const rest      = time ? item.slice(time.length + 2).trim() : item;

    return (
      <View style={[styles.logLine, bg ? { backgroundColor: bg } : undefined]}>
        {time ? (
          <Text style={[styles.logTime, { color: palette.textMuted, fontFamily: fontMono }]}>
            {time}
          </Text>
        ) : null}
        <Text
          style={[styles.logText, { color: color === 'inherit' ? palette.text : color, fontFamily: fontMono }]}
          selectable
        >
          {rest}
        </Text>
      </View>
    );
  }, [isDark, palette, fontMono]);

  // ── Format date label ────────────────────────────────────────────────────
  function formatDateLabel(date: string): string {
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (date === today)     return 'اليوم';
    if (date === yesterday) return 'أمس';
    return date.slice(5); // MM-DD
  }

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border, paddingTop: insets.top + Spacing[3] }]}>
        <TouchableOpacity
          onPress={() => { void Haptics.selectionAsync(); router.back(); }}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.text, fontFamily: fontSemi }]}>
            سجلات التطبيق
          </Text>
          {content.length > 0 ? (
            <Text style={[styles.headerSub, { color: palette.textMuted, fontFamily: fontReg }]}>
              {content.length} سطر
            </Text>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={Colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date selector tabs ──────────────────────────────────────────────── */}
      {dates.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateTabs}
          style={[styles.dateTabsWrap, { borderBottomColor: palette.border }]}
        >
          {dates.map((date) => {
            const isActive = date === activeDate;
            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dateTab,
                  {
                    backgroundColor: isActive ? Colors.brand.primary : palette.surface,
                    borderColor: isActive ? Colors.brand.primary : palette.border,
                  },
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setActiveDate(date);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateTabText, { color: isActive ? Colors.white : palette.text, fontFamily: isActive ? fontMed : fontReg }]}>
                  {formatDateLabel(date)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* ── Log content ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textMuted, fontFamily: fontReg }]}>
            جاري التحميل...
          </Text>
        </View>
      ) : content.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={palette.textMuted} />
          <Text style={[styles.emptyText, { color: palette.textMuted, fontFamily: fontMed }]}>
            {dates.length === 0 ? 'لا توجد سجلات بعد' : 'الملف فارغ'}
          </Text>
          <Text style={[styles.emptyHint, { color: palette.textMuted, fontFamily: fontReg }]}>
            ستظهر السجلات عند استخدام التطبيق
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={content}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderLine}
          contentContainerStyle={[styles.logList, { paddingBottom: insets.bottom + Spacing[6] }]}
          showsVerticalScrollIndicator
          // Maintain scroll position at bottom when new lines arrive
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          initialNumToRender={50}
          maxToRenderPerBatch={80}
          windowSize={5}
          ItemSeparatorComponent={() => (
            <View style={[styles.lineSeparator, { backgroundColor: palette.border }]} />
          )}
        />
      )}

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <View style={[styles.legend, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
        {[
          { label: 'خطأ',    color: Colors.status.error   },
          { label: 'تحذير',  color: Colors.status.warning },
          { label: 'تنقل',   color: Colors.status.info    },
          { label: 'API',    color: Colors.status.success  },
          { label: 'معلومة', color: palette.text           },
        ].map(({ label, color }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendLabel, { color: palette.textMuted, fontFamily: fontReg }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: Spacing[1] },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.base },
  headerSub: { fontSize: FontSize.xs, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing[2] },
  iconBtn: { padding: Spacing[1] },

  // Date tabs
  dateTabsWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 48,
  },
  dateTabs: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  dateTab: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  dateTabText: { fontSize: FontSize.sm },

  // Log list
  logList: {
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[2],
  },
  logLine: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingVertical: 3,
    paddingHorizontal: Spacing[2],
    borderRadius: 4,
  },
  logTime: {
    fontSize: 11,
    opacity: 0.6,
    flexShrink: 0,
    marginTop: 1,
  },
  logText: {
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },
  lineSeparator: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[8],
  },
  emptyText: { fontSize: FontSize.base, textAlign: 'center' },
  emptyHint: { fontSize: FontSize.sm, textAlign: 'center' },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10 },
});
