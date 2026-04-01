/**
 * Company Users Screen — Super Admin view of a specific company's users.
 *
 * Opened via: CompanyDetailSheet → "View Users" → router.push with companyId + companyName
 *
 * Layout:
 *   Header (violet) — back button + company name + user count
 *   Stats strip     — Total | Active | Disabled
 *   Search bar      — by name or email
 *   FlatList        — PlatformUserRow (name + email + role + status)
 *   FAB             — add new staff user
 *   CreateStaffModal — inline form (fullName, email, password, phone)
 *   Action sheet    — disable / enable on row tap
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZInput } from '@/components/ui/ZInput';
import { ZModal } from '@/components/ui/ZModal';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, type ColorPalette } from '@/constants/theme';
import { usePlatformUsers, usePlatformUserStats } from '@/features/platform/hooks/usePlatform';
import {
  useCreatePlatformStaff,
  useDisablePlatformUser,
  useEnablePlatformUser,
} from '@/features/platform/hooks/usePlatformMutations';
import { PlatformUserRow } from '@/features/platform/components/PlatformUserRow';
import { PLATFORM_ACCENT, type PlatformUser } from '@/features/platform/types';

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
      <ZText size="lg" weight="bold" style={{ color: '#fff' }}>{value}</ZText>
      <ZText size="xs" style={{ color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>
        {label}
      </ZText>
    </View>
  );
}

// ─── Create Staff Form ────────────────────────────────────────────────────────

interface CreateStaffFormProps {
  companyId: string;
  visible: boolean;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>['t'];
  palette: ColorPalette;
}

function CreateStaffModal({ companyId, visible, onClose, t, palette }: CreateStaffFormProps) {
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [phone, setPhone]         = useState('');
  const [error, setError]         = useState<string | null>(null);
  const mutation = useCreatePlatformStaff();

  function reset() {
    setFullName(''); setEmail(''); setPassword(''); setPhone(''); setError(null);
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit() {
    if (!fullName.trim()) { setError(t('createStaff.validation.nameRequired')); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('createStaff.validation.emailInvalid')); return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError(t('createStaff.validation.passwordWeak')); return;
    }
    setError(null);
    mutation.mutate(
      { companyId, fullName: fullName.trim(), email: email.trim().toLowerCase(), password, phone: phone.trim() || undefined },
      {
        onSuccess: () => { reset(); onClose(); },
        onError: (e: unknown) => {
          const msg = (e as any)?.response?.data?.message;
          setError(Array.isArray(msg) ? msg[0] : (msg ?? t('createStaff.failed')));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={handleClose} title={t('createStaff.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}
        <ZInput
          label={t('createStaff.fullName')}
          placeholder="Ahmed Khalil"
          value={fullName}
          onChangeText={(v) => { setFullName(v); setError(null); }}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <ZInput
          label={t('createStaff.email')}
          placeholder="staff@company.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
        <ZInput
          label={t('createStaff.password')}
          placeholder="Min 8, A-Z, 0-9"
          value={password}
          onChangeText={(v) => { setPassword(v); setError(null); }}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="next"
        />
        <ZInput
          label={t('createStaff.phone')}
          placeholder="+966501234567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          returnKeyType="done"
        />

        {/* Submit button inside ScrollView — avoids clipping by ZModal's non-flex content View */}
        <ZButton onPress={handleSubmit} loading={mutation.isPending} fullWidth style={{ marginTop: Spacing[3] }}>
          {t('createStaff.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompanyUsersScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = isDark ? Colors.dark : Colors.light;

  const { companyId, companyName } = useLocalSearchParams<{
    companyId: string;
    companyName: string;
  }>();

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchText, setSearchText]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                     = useState(1);
  const [allUsers, setAllUsers]             = useState<PlatformUser[]>([]);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [selectedUser, setSelectedUser]     = useState<PlatformUser | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showEnableConfirm, setShowEnableConfirm]   = useState(false);

  // ── Debounce search ────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
      setAllUsers([]);
    }, 300);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, refetch } = usePlatformUsers({
    companyId: companyId ?? '',
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  });
  const { data: stats } = usePlatformUserStats(companyId ?? null);
  const total = data?.meta?.total ?? 0;

  useEffect(() => {
    if (data?.data) {
      setAllUsers((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
    }
  }, [data, page]);

  useEffect(() => {
    setPage(1); setAllUsers([]);
  }, [debouncedSearch]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const disableMutation = useDisablePlatformUser();
  const enableMutation  = useEnablePlatformUser();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRowPress = useCallback((user: PlatformUser) => {
    setSelectedUser(user);
    if (user.isActive) setShowDisableConfirm(true);
    else               setShowEnableConfirm(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (allUsers.length < total && !isFetching) setPage((p) => p + 1);
  }, [allUsers.length, total, isFetching]);

  const handleRefresh = useCallback(() => {
    setPage(1); setAllUsers([]); refetch();
  }, [refetch]);

  const handleDisable = useCallback(() => {
    if (!selectedUser) return;
    setShowDisableConfirm(false);
    disableMutation.mutate({ id: selectedUser.id, companyId: companyId ?? '' });
    setSelectedUser(null);
  }, [selectedUser, companyId, disableMutation]);

  const handleEnable = useCallback(() => {
    if (!selectedUser) return;
    setShowEnableConfirm(false);
    enableMutation.mutate({ id: selectedUser.id, companyId: companyId ?? '' });
    setSelectedUser(null);
  }, [selectedUser, companyId, enableMutation]);

  const renderItem = useCallback(
    ({ item }: { item: PlatformUser }) => (
      <PlatformUserRow user={item} onPress={handleRowPress} />
    ),
    [handleRowPress],
  );

  return (
    <>
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
            <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ZText weight="bold" size="base" style={styles.headerTitle} numberOfLines={1}>
                {companyName ?? t('users.title')}
              </ZText>
              <ZText size="xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {t('users.title')}
              </ZText>
            </View>
            {total > 0 && (
              <View style={styles.countBadge}>
                <ZText size="xs" weight="bold" style={{ color: '#fff' }}>{total}</ZText>
              </View>
            )}
          </View>

          {/* Stats strip */}
          <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <StatChip label={t('users.statsTotal')}   value={stats?.total   ?? 0} color="#fff" />
            <StatChip label={t('users.statsActive')}  value={stats?.active  ?? 0} color="#fff" />
            <StatChip label={t('users.statsDisabled')} value={stats?.disabled ?? 0} color="#fff" />
          </View>
        </View>

        {/* ── Search ── */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: isDark ? Colors.dark.surface : '#fff', borderBottomColor: palette.border },
          ]}
        >
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f3f4f6',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="search-outline" size={16} color={palette.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: palette.text, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('users.searchPlaceholder')}
              placeholderTextColor={palette.textMuted}
              value={searchText}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={16} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── List ── */}
        <FlatList
          data={allUsers}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            allUsers.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor={PLATFORM_ACCENT}
              colors={[PLATFORM_ACCENT]}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={56} color={palette.textMuted} />
                <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                  {t('users.empty')}
                </ZText>
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={{ padding: Spacing[4], alignItems: 'center' }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={PLATFORM_ACCENT} />
              </View>
            ) : null
          }
        />

        {/* ── FAB — add staff ── */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + Spacing[6] }]}
          onPress={() => setShowCreateStaff(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Create Staff Modal ── */}
      <CreateStaffModal
        companyId={companyId ?? ''}
        visible={showCreateStaff}
        onClose={() => setShowCreateStaff(false)}
        t={t}
        palette={palette}
      />

      {/* ── Disable confirm ── */}
      <ZConfirmDialog
        visible={showDisableConfirm}
        variant="danger"
        title={t('users.disableConfirmTitle')}
        message={t('users.disableConfirmMsg')}
        confirmLabel={t('users.disableConfirmTitle')}
        cancelLabel={t('filter.all') /* reuse generic "cancel" */}
        loading={disableMutation.isPending}
        onConfirm={handleDisable}
        onCancel={() => { setShowDisableConfirm(false); setSelectedUser(null); }}
      />

      {/* ── Enable confirm ── */}
      <ZConfirmDialog
        visible={showEnableConfirm}
        title={t('users.enableConfirmTitle')}
        message={t('users.enableConfirmMsg')}
        confirmLabel={t('users.enableConfirmTitle')}
        cancelLabel={t('filter.all') /* reuse generic "cancel" */}
        loading={enableMutation.isPending}
        onConfirm={handleEnable}
        onCancel={() => { setShowEnableConfirm(false); setSelectedUser(null); }}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    backgroundColor: PLATFORM_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerRow: { alignItems: 'center', gap: Spacing[3] },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    minWidth: 24,
    alignItems: 'center',
  },

  statsRow: { gap: Spacing[2] },
  statChip: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
    gap: 2,
  },

  searchWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
  },
  searchBox: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignItems: 'center',
    gap: Spacing[2],
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  list: { paddingTop: Spacing[3], paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },

  fab: {
    position: 'absolute',
    right: Spacing[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PLATFORM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PLATFORM_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Form styles (CreateStaffModal)
  formScrollView: {
    flex: 1,
  },
  formScroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[2],
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: Spacing[3],
    borderRadius: Radius.lg,
  },
});
