/**
 * UserForm — slide-up modal for Create (staff) and Edit (fullName/phone).
 *
 * Create mode: fullName, email, password, phone, initial permissions
 * Edit mode: fullName, phone only (email/password immutable)
 *
 * Password rules: min 8 chars, must include uppercase letter + digit.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZModal } from '@/components/ui/ZModal';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing } from '@/constants/theme';
import { useCreateStaff, useUpdateUser } from '../hooks/useUserMutations';
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_KEYS,
  USERS_ACCENT,
  type User,
  type StaffPermissions,
} from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When provided → edit mode; otherwise → create mode */
  user?: User;
}

interface FormState {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

type FormErrors = Partial<Record<keyof FormState | 'general', string>>;

export default function UserForm({ visible, onClose, user }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('users');
  const palette = isDark ? Colors.dark : Colors.light;
  const isEditMode = !!user;

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [permissions, setPermissions] = useState<StaffPermissions>({ ...DEFAULT_PERMISSIONS });
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Refs for focus chain ─────────────────────────────────────────────────
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateUser(user?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Populate form when editing
  useEffect(() => {
    if (visible && user) {
      setForm({
        fullName: user.fullName,
        email: user.email,
        password: '',
        phone: user.phone ?? '',
      });
      setErrors({});
    } else if (visible && !user) {
      setForm({ fullName: '', email: '', password: '', phone: '' });
      setPermissions({ ...DEFAULT_PERMISSIONS });
      setErrors({});
    }
  }, [visible, user]);

  // ── Validation ───────────────────────────────────────────────────────────
  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = t('validation.nameRequired');
    if (!isEditMode) {
      if (!form.email.trim()) errs.email = t('validation.emailRequired');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = t('validation.emailInvalid');
      if (!form.password) errs.password = t('validation.passwordRequired');
      else if (form.password.length < 8) errs.password = t('validation.passwordShort');
      else if (!/(?=.*[A-Z])(?=.*\d)/.test(form.password))
        errs.password = t('validation.passwordWeak');
    }
    return errs;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (isEditMode) {
      updateMutation.mutate(
        {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
        },
        {
          onSuccess: () => onClose(),
          onError: (err) => {
            const msg = (err as any)?.response?.data?.message;
            setErrors({ general: msg ?? t('errors.updateFailed') });
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          permissions,
        },
        {
          onSuccess: () => onClose(),
          onError: (err) => {
            const status = (err as any)?.response?.status;
            const msg = (err as any)?.response?.data?.message;
            if (status === 400 && msg?.includes('email')) {
              setErrors({ email: t('errors.emailExists') });
            } else if (status === 403) {
              setErrors({ general: t('errors.quotaExceeded') });
            } else {
              setErrors({ general: msg ?? t('errors.createFailed') });
            }
          },
        },
      );
    }
  }

  const set = (key: keyof FormState) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <ZModal
      visible={visible}
      onClose={onClose}
      title={isEditMode ? t('form.edit') : t('form.create')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* General error */}
          {errors.general ? (
            <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
              <ZText size="sm" style={{ color: '#dc2626' }}>{errors.general}</ZText>
            </View>
          ) : null}

          {/* Full Name */}
          <ZInput
            label={t('form.fullName')}
            placeholder={t('form.namePlaceholder')}
            value={form.fullName}
            onChangeText={set('fullName')}
            error={errors.fullName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() =>
              isEditMode ? phoneRef.current?.focus() : emailRef.current?.focus()
            }
          />

          {/* Email — create only */}
          {!isEditMode && (
            <ZInput
              ref={emailRef}
              label={t('form.email')}
              placeholder={t('form.emailPlaceholder')}
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          )}

          {/* Password — create only */}
          {!isEditMode && (
            <ZInput
              ref={passwordRef}
              label={t('form.password')}
              placeholder={t('form.passwordPlaceholder')}
              value={form.password}
              onChangeText={set('password')}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
          )}

          {/* Phone */}
          <ZInput
            ref={phoneRef}
            label={t('form.phone')}
            placeholder={t('form.phonePlaceholder')}
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={isEditMode ? 'done' : 'next'}
            onSubmitEditing={isEditMode ? handleSubmit : undefined}
          />

          {/* Permissions — create mode only */}
          {!isEditMode && (
            <>
              <ZText
                weight="semibold"
                size="sm"
                style={[styles.permLabel, { color: palette.textMuted }]}
              >
                {t('permissions.title').toUpperCase()}
              </ZText>
              {PERMISSION_KEYS.map((key) => (
                <View
                  key={key}
                  style={[
                    styles.permRow,
                    {
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      borderBottomColor: palette.border,
                    },
                  ]}
                >
                  <ZText
                    size="sm"
                    style={{ flex: 1, color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t(`permissions.${key}`)}
                  </ZText>
                  <Switch
                    value={permissions[key]}
                    onValueChange={(val) =>
                      setPermissions((p) => ({ ...p, [key]: val }))
                    }
                    trackColor={{ false: palette.border, true: `${USERS_ACCENT}60` }}
                    thumbColor={permissions[key] ? USERS_ACCENT : palette.textMuted}
                  />
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <ZButton
          title={t('form.save')}
          onPress={handleSubmit}
          loading={isPending}
          style={{ backgroundColor: USERS_ACCENT }}
        />
      </View>
    </ZModal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  errorBanner: {
    padding: Spacing[3],
    borderRadius: 10,
  },
  permLabel: {
    marginTop: Spacing[2],
    letterSpacing: 0.5,
  },
  permRow: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing[2],
  },
  footer: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    paddingTop: Spacing[2],
  },
});
