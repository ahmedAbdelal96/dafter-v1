/**
 * UserDetailSheet — slide-up modal showing full user details.
 *
 * Sections:
 *   1. Profile header (avatar, name, email, role, status badge)
 *   2. Permissions toggles (STAFF only; OWNER shows "full access" note)
 *   3. Action buttons: Edit | Enable/Disable
 *
 * All mutations are confirmed: disable uses ZConfirmDialog.
 * OWNER users cannot have permissions modified (backend enforces too).
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZModal } from '@/components/ui/ZModal';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useUpdatePermissions, useDisableUser, useEnableUser, useResetStaffPassword } from '../hooks/useUserMutations';
import {
  USERS_ACCENT,
  PERMISSION_KEYS,
  type User,
  type StaffPermissions,
} from '../types';

interface Props {
  user: User | null;
  visible: boolean;
  onClose: () => void;
  onEditPress: (user: User) => void;
}

export default function UserDetailSheet({ user, visible, onClose, onEditPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('users');
  const palette = isDark ? Colors.dark : Colors.light;

  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const updatePermMutation = useUpdatePermissions(user?.id ?? '');
  const disableMutation = useDisableUser();
  const enableMutation = useEnableUser();
  const resetMutation = useResetStaffPassword();

  // Sync permissions from user data
  useEffect(() => {
    if (user?.permissions?.permissions) {
      setPermissions({ ...user.permissions.permissions });
    } else {
      setPermissions(null);
    }
    setPermError(null);
    setResetSuccess(false);
  }, [user]);

  if (!user) return null;

  const isOwner = user.role === 'OWNER';
  const isActive = user.status === 'ACTIVE';
  const statusColor = isActive ? '#16a34a' : palette.textMuted;
  const statusBg = isActive ? '#f0fdf4' : (isDark ? Colors.dark.surfaceTertiary : '#f3f4f6');

  // ── Permission toggle ──────────────────────────────────────────────────
  function handlePermissionToggle(key: keyof StaffPermissions, val: boolean) {
    if (!permissions || isOwner) return;
    const updated = { ...permissions, [key]: val };
    setPermissions(updated);
    setPermError(null);

    updatePermMutation.mutate(
      { [key]: val },
      {
        onError: (err) => {
          // Revert optimistic toggle on error
          setPermissions(permissions);
          const msg = (err as any)?.response?.data?.message;
          setPermError(msg ?? t('errors.permUpdateFailed'));
        },
      },
    );
  }

  // ── Disable / Enable ───────────────────────────────────────────────────
  function handleDisable() {
    setShowDisableConfirm(false);
    disableMutation.mutate(user!.id, {
      onSuccess: () => onClose(),
      onError: (err) => {
        const msg = (err as any)?.response?.data?.message;
        setPermError(msg ?? t('errors.disableFailed'));
      },
    });
  }

  function handleEnable() {
    enableMutation.mutate(user!.id, {
      onSuccess: () => onClose(),
      onError: (err) => {
        const status = (err as any)?.response?.status;
        const msg = (err as any)?.response?.data?.message;
        if (status === 403) {
          setPermError(t('errors.enableLimitReached'));
        } else {
          setPermError(msg ?? t('errors.enableFailed'));
        }
      },
    });
  }

  // ── Reset Credentials ──────────────────────────────────────────────────
  function handleReset() {
    setShowResetConfirm(false);
    setResetSuccess(false);
    resetMutation.mutate(
      { id: user!.id },
      {
        onSuccess: () => {
          setResetSuccess(true);
        },
        onError: (err) => {
          const msg = (err as any)?.response?.data?.message;
          setPermError(msg ?? t('actions.resetError'));
        },
      },
    );
  }

  const actionsPending =
    updatePermMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending ||
    resetMutation.isPending;

  return (
    <>
      <ZModal
        visible={visible}
        onClose={onClose}
        title={t('detail.title')}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Profile header ── */}
          <View style={[styles.profileCard, { backgroundColor: `${USERS_ACCENT}10` }]}>
            <ZAvatar name={user.fullName} size={56} color={USERS_ACCENT} />
            <View
              style={[
                styles.profileInfo,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}
            >
              <ZText weight="bold" size="base" style={{ color: palette.text }}>
                {user.fullName}
              </ZText>
              <ZText size="xs" variant="secondary" numberOfLines={1}>
                {user.email}
              </ZText>
              {user.phone ? (
                <ZText size="xs" variant="secondary">
                  {user.phone}
                </ZText>
              ) : null}
            </View>
            {/* Status badge */}
            <View
              style={[styles.statusBadge, { backgroundColor: statusBg }]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <ZText size="xs" weight="bold" style={{ color: statusColor }}>
                {t(`status.${user.status}`)}
              </ZText>
            </View>
          </View>

          {/* Role label */}
          <View style={[styles.roleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="shield-outline" size={16} color={USERS_ACCENT} />
            <ZText size="sm" weight="medium" style={{ color: palette.text }}>
              {t(`role.${user.role}`)}
            </ZText>
          </View>

          {/* ── Permissions section ── */}
          <ZText
            weight="semibold"
            size="xs"
            style={[styles.sectionTitle, { color: palette.textMuted }]}
          >
            {t('permissions.title').toUpperCase()}
          </ZText>

          {isOwner ? (
            <View
              style={[
                styles.ownerNote,
                { backgroundColor: `${USERS_ACCENT}10`, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color={USERS_ACCENT} />
              <ZText size="sm" style={{ color: USERS_ACCENT, flex: 1 }}>
                {t('permissions.ownerFullAccess')}
              </ZText>
            </View>
          ) : (
            <View
              style={[
                styles.permCard,
                { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
              ]}
            >
              {PERMISSION_KEYS.map((key, idx) => (
                <View key={key}>
                  {idx > 0 && (
                    <View style={[styles.divider, { backgroundColor: palette.border }]} />
                  )}
                  <View
                    style={[
                      styles.permRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <ZText
                      size="sm"
                      style={{
                        flex: 1,
                        color: palette.text,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t(`permissions.${key}`)}
                    </ZText>
                    {updatePermMutation.isPending ? (
                      <ActivityIndicator size="small" color={USERS_ACCENT} />
                    ) : (
                      <Switch
                        value={permissions?.[key] ?? false}
                        onValueChange={(val) => handlePermissionToggle(key, val)}
                        trackColor={{ false: palette.border, true: `${USERS_ACCENT}60` }}
                        thumbColor={permissions?.[key] ? USERS_ACCENT : palette.textMuted}
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Error message */}
          {permError ? (
            <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
              <ZText size="sm" style={{ color: '#dc2626' }}>{permError}</ZText>
            </View>
          ) : null}

          {/* Reset success */}
          {resetSuccess ? (
            <View style={[styles.errorBanner, { backgroundColor: '#f0fdf4' }]}>
              <ZText size="sm" style={{ color: '#16a34a' }}>{t('actions.resetSuccess')}</ZText>
            </View>
          ) : null}

          {/* Reset credentials button (STAFF only) */}
          {!isOwner && (
            <TouchableOpacity
              style={[
                styles.resetBtn,
                { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
              ]}
              onPress={() => setShowResetConfirm(true)}
              disabled={actionsPending}
            >
              {resetMutation.isPending ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={16} color="#f59e0b" />
                  <ZText size="sm" weight="medium" style={{ color: '#f59e0b' }}>
                    {t('actions.resetCredentials')}
                  </ZText>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Actions footer ── */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: `${USERS_ACCENT}12` }]}
            onPress={() => onEditPress(user)}
            disabled={actionsPending}
          >
            <Ionicons name="pencil-outline" size={17} color={USERS_ACCENT} />
            <ZText size="sm" weight="medium" style={{ color: USERS_ACCENT }}>
              {t('form.edit')}
            </ZText>
          </TouchableOpacity>

          {!isOwner && (
            isActive ? (
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: '#fef2f2', flex: 1 }]}
                onPress={() => setShowDisableConfirm(true)}
                disabled={actionsPending}
              >
                {disableMutation.isPending ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="ban-outline" size={17} color="#dc2626" />
                    <ZText size="sm" weight="medium" style={{ color: '#dc2626' }}>
                      {t('actions.disable')}
                    </ZText>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <ZButton
                title={t('actions.enable')}
                onPress={handleEnable}
                loading={enableMutation.isPending}
                style={{ flex: 1, backgroundColor: '#16a34a' }}
              />
            )
          )}
        </View>
      </ZModal>

      <ZConfirmDialog
        visible={showDisableConfirm}
        title={t('disable.title')}
        message={t('disable.message')}
        confirmText={t('disable.confirm')}
        cancelText={t('disable.cancel')}
        onConfirm={handleDisable}
        onCancel={() => setShowDisableConfirm(false)}
        loading={disableMutation.isPending}
      />

      <ZConfirmDialog
        visible={showResetConfirm}
        title={t('reset.title')}
        message={t('reset.message')}
        confirmText={t('reset.confirm')}
        cancelText={t('reset.cancel')}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        loading={resetMutation.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  profileCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  roleRow: {
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[1],
  },
  sectionTitle: {
    letterSpacing: 0.5,
    marginTop: Spacing[2],
  },
  ownerNote: {
    borderRadius: Radius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
  },
  permCard: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  divider: { height: StyleSheet.hairlineWidth },
  permRow: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  errorBanner: {
    padding: Spacing[3],
    borderRadius: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
  },
});
