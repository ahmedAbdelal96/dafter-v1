/**
 * Company Settings Screen — Dafter Mobile Dashboard
 *
 * Allows the company OWNER to update:
 *   - Company name
 *   - Phone number
 *   - Address
 *   - Currency code (EGP / USD / EUR / SAR / AED)
 *
 * Data: GET/PATCH /companies/me
 * On success: updates the tenant in the auth store so all screens
 *             reflect the new company name immediately.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/stores/auth-store';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import {
  Colors,
  Spacing,
  Radius,
  FontSize,
  type ColorPalette,
} from '@/constants/theme';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS, QUERY_KEYS } from '@/lib/api/config';

// ─── Accent ───────────────────────────────────────────────────────────────────

const ACCENT = Colors.brand.primary;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyProfile {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currencyCode: string;
  version: number;
}

interface UpdatePayload {
  name?: string;
  phone?: string;
  address?: string;
  currencyCode?: string;
}

// ─── Currency options ─────────────────────────────────────────────────────────

const CURRENCIES = ['EGP', 'USD', 'EUR', 'SAR', 'AED'] as const;

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchMyCompany(): Promise<CompanyProfile> {
  const res = await apiClient.get<{ data: CompanyProfile }>(
    API_ENDPOINTS.companies.me,
  );
  return res.data.data;
}

async function patchMyCompany(payload: UpdatePayload): Promise<CompanyProfile> {
  const res = await apiClient.patch<{ data: CompanyProfile }>(
    API_ENDPOINTS.companies.updateMe,
    payload,
  );
  return res.data.data;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompanySettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation('companySettings');
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { updateTenant } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const palette = isDark ? Colors.dark : Colors.light;

  // ── Remote data ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.MY_COMPANY,
    queryFn: fetchMyCompany,
    staleTime: 2 * 60 * 1000,
  });

  // ── Local form state ───────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currencyCode, setCurrencyCode] = useState('EGP');

  // Sync form when data loads
  useEffect(() => {
    if (data) {
      setName(data.name ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setCurrencyCode(data.currencyCode ?? 'EGP');
    }
  }, [data]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: patchMyCompany,
    onSuccess: (updated) => {
      // Update cache
      queryClient.setQueryData(QUERY_KEYS.MY_COMPANY, updated);
      // Update auth store so company name is reflected everywhere
      updateTenant({ name: updated.name, phone: updated.phone ?? undefined, address: updated.address ?? undefined });
      Alert.alert(
        t('success.title'),
        `${t('success.message')} ${updated.name} • ${updated.currencyCode}`,
      );
      router.back();
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 409) {
        // Version conflict — refetch then let user retry
        void refetch();
        Alert.alert(t('error.conflictTitle'), t('error.conflictMessage'));
      } else {
        const msg = err?.response?.data?.message ?? t('error.generic');
        Alert.alert(t('error.title'), msg);
      }
    },
  });

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('validation.nameRequired'));
      return;
    }

    const payload: UpdatePayload = {};
    if (trimmedName !== (data?.name ?? '')) payload.name = trimmedName;
    if (phone.trim() !== (data?.phone ?? '')) payload.phone = phone.trim();
    if (address.trim() !== (data?.address ?? '')) payload.address = address.trim();
    if (currencyCode !== (data?.currencyCode ?? 'EGP')) payload.currencyCode = currencyCode;

    if (Object.keys(payload).length === 0) {
      router.back();
      return;
    }

    mutate(payload);
  }, [name, phone, address, currencyCode, data, mutate, router, t]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <ScreenHeader
          title={t('title')}
          palette={palette}
          insetTop={insets.top}
          onBack={() => router.back()}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <ScreenHeader
          title={t('title')}
          palette={palette}
          insetTop={insets.top}
          onBack={() => router.back()}
        />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={52} color={palette.textMuted} />
          <ZText weight="bold" style={{ color: palette.text, marginTop: Spacing[3] }}>
            {t('error.loadFailed')}
          </ZText>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: ACCENT }]}
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

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <ScreenHeader
          title={t('title')}
          palette={palette}
          insetTop={insets.top}
          onBack={() => router.back()}
          rightAction={
            <TouchableOpacity
              onPress={handleSave}
              disabled={isPending}
              style={styles.saveBtn}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ZText size="sm" weight="bold" style={{ color: '#fff' }}>
                  {t('save')}
                </ZText>
              )}
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + Spacing[8] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Company identity card ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
            ]}
          >
            <SectionLabel label={t('section.identity')} palette={palette} isRTL={isRTL} />

            <ZInput
              label={t('fields.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('placeholders.name')}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <View style={{ marginTop: Spacing[3] }}>
              <ZInput
                label={t('fields.phone')}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('placeholders.phone')}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            <View style={{ marginTop: Spacing[3] }}>
              <ZInput
                label={t('fields.address')}
                value={address}
                onChangeText={setAddress}
                placeholder={t('placeholders.address')}
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* ── Currency picker ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
            ]}
          >
            <SectionLabel label={t('section.currency')} palette={palette} isRTL={isRTL} />

            <View
              style={[
                styles.currencyGrid,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {CURRENCIES.map((c) => {
                const selected = currencyCode === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.currencyChip,
                      {
                        backgroundColor: selected
                          ? ACCENT
                          : isDark
                          ? Colors.dark.surfaceTertiary
                          : '#f3f4f6',
                        borderColor: selected ? ACCENT : 'transparent',
                      },
                    ]}
                    onPress={() => setCurrencyCode(c)}
                    activeOpacity={0.75}
                  >
                    <ZText
                      size="sm"
                      weight={selected ? 'bold' : 'regular'}
                      style={{ color: selected ? '#fff' : palette.textSecondary }}
                    >
                      {c}
                    </ZText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ZText size="xs" style={{ color: palette.textMuted, marginTop: Spacing[2] }}>
              {t('fields.currencyHint')}
            </ZText>
          </View>

          {/* ── Meta info (read-only) ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
            ]}
          >
            <SectionLabel label={t('section.info')} palette={palette} isRTL={isRTL} />

            <InfoRow
              label={t('fields.companyId')}
              value={`...${data.id.slice(-8)}`}
              palette={palette}
              isRTL={isRTL}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScreenHeader({
  title,
  palette,
  insetTop,
  onBack,
  rightAction,
}: {
  title: string;
  palette: ColorPalette;
  insetTop: number;
  onBack: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insetTop + Spacing[2],
          backgroundColor: ACCENT,
        },
      ]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      <ZText weight="bold" size="lg" style={styles.headerTitle}>
        {title}
      </ZText>
      <View style={styles.headerRight}>{rightAction}</View>
    </View>
  );
}

function SectionLabel({
  label,
  palette,
  isRTL,
}: {
  label: string;
  palette: ColorPalette;
  isRTL: boolean;
}) {
  return (
    <ZText
      weight="semibold"
      size="sm"
      style={[
        styles.sectionLabel,
        { color: palette.textMuted, textAlign: isRTL ? 'right' : 'left' },
      ]}
    >
      {label.toUpperCase()}
    </ZText>
  );
}

function InfoRow({
  label,
  value,
  palette,
  isRTL,
}: {
  label: string;
  value: string;
  palette: ColorPalette;
  isRTL: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      <ZText size="sm" style={{ color: palette.textSecondary }}>
        {label}
      </ZText>
      <ZText size="sm" weight="medium" style={{ color: palette.text }}>
        {value}
      </ZText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  backBtn: {
    padding: Spacing[1],
  },
  headerTitle: {
    color: '#fff',
    flex: 1,
  },
  headerRight: {
    minWidth: 64,
    alignItems: 'flex-end',
  },

  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.md,
    minWidth: 56,
    alignItems: 'center',
  },

  // Scroll
  scroll: {
    padding: Spacing[4],
    gap: 0,
  },

  // Card
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  sectionLabel: {
    letterSpacing: 0.5,
    marginBottom: Spacing[3],
  },

  // Currency grid
  currencyGrid: {
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  currencyChip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: 'center',
  },

  // Info row
  infoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
});
