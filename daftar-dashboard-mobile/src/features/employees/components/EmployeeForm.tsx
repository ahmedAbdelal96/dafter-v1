/**
 * EmployeeForm — Slide-up modal for creating or editing an employee.
 *
 * Create mode: name, phone, jobTitle, openingBalance
 * Edit mode:   name, phone, jobTitle, isActive toggle
 *              (openingBalance is immutable after creation)
 *              (version is read from employee prop, sent silently)
 *
 * Errors handled:
 *   - 409 Conflict: name already taken → shown under name field
 *   - 409 Conflict (version mismatch): stale data → version conflict error
 *   - 403: quota exceeded
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { EMPLOYEE_ACCENT, type Employee } from '../types';

interface EmployeeFormProps {
  visible: boolean;
  onClose: () => void;
  /** Pass an employee to activate edit mode */
  employee?: Employee | null;
}

interface FormState {
  name: string;
  phone: string;
  jobTitle: string;
  openingBalance: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  openingBalance?: string;
}

export function EmployeeForm({ visible, onClose, employee }: EmployeeFormProps) {
  const isEditMode = !!employee;
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('employees');
  const palette = isDark ? Colors.dark : Colors.light;

  const phoneRef    = useRef<TextInput>(null);
  const jobTitleRef = useRef<TextInput>(null);
  const balanceRef  = useRef<TextInput>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    jobTitle: '',
    openingBalance: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Populate form when editing
  useEffect(() => {
    if (visible) {
      if (employee) {
        setForm({
          name: employee.name,
          phone: employee.phone ?? '',
          jobTitle: employee.jobTitle ?? '',
          openingBalance: '', // immutable — not shown in edit
          isActive: employee.isActive,
        });
      } else {
        setForm({ name: '', phone: '', jobTitle: '', openingBalance: '', isActive: true });
      }
      setErrors({});
    }
  }, [visible, employee]);

  const { mutate: createEmployee, isPending: isCreating } = useCreateEmployee();
  const { mutate: updateEmployee, isPending: isUpdating } = useUpdateEmployee();
  const isPending = isCreating || isUpdating;

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) {
      errs.name = t('validation.nameRequired');
    }
    if (!isEditMode && form.openingBalance && isNaN(parseFloat(form.openingBalance))) {
      errs.openingBalance = t('validation.invalidAmount');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    if (isEditMode && employee) {
      updateEmployee(
        {
          id: employee.id,
          dto: {
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            jobTitle: form.jobTitle.trim() || undefined,
            isActive: form.isActive,
            version: employee.version,
          },
        },
        {
          onSuccess: () => {
            setErrors({});
            onClose();
          },
          onError: (err: unknown) => {
            const status = (err as { response?: { status?: number } })?.response?.status;
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            if (status === 409) {
              if (message?.toLowerCase().includes('version') || message?.toLowerCase().includes('conflict')) {
                setErrors({ name: t('errors.versionConflict') });
              } else {
                setErrors({ name: t('errors.nameTaken') });
              }
            } else {
              setErrors({ name: message ?? t('errors.updateFailed') });
            }
          },
        },
      );
    } else {
      createEmployee(
        {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          openingBalance: form.openingBalance.trim()
            ? parseFloat(form.openingBalance)
            : undefined,
        },
        {
          onSuccess: () => {
            setErrors({});
            onClose();
          },
          onError: (err: unknown) => {
            const status = (err as { response?: { status?: number } })?.response?.status;
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            if (status === 409) {
              setErrors({ name: t('errors.nameTaken') });
            } else if (status === 403) {
              setErrors({ name: t('errors.quotaExceeded') });
            } else {
              setErrors({ name: message ?? t('errors.createFailed') });
            }
          },
        },
      );
    }
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  return (
    <ZModal
      visible={visible}
      onClose={handleClose}
      title={isEditMode ? t('form.edit') : t('form.create')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <ZInput
            label={t('form.name')}
            placeholder={t('form.namePlaceholder')}
            value={form.name}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, name: v }));
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={errors.name}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Phone */}
          <ZInput
            ref={phoneRef}
            label={t('form.phone')}
            placeholder={t('form.phonePlaceholder')}
            value={form.phone}
            onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => jobTitleRef.current?.focus()}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Job Title */}
          <ZInput
            ref={jobTitleRef}
            label={t('form.jobTitle')}
            placeholder={t('form.jobTitlePlaceholder')}
            value={form.jobTitle}
            onChangeText={(v) => setForm((f) => ({ ...f, jobTitle: v }))}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => {
              if (!isEditMode) balanceRef.current?.focus();
            }}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Opening balance — CREATE only */}
          {!isEditMode && (
            <ZInput
              ref={balanceRef}
              label={t('form.openingBalance')}
              placeholder={t('form.openingBalancePlaceholder')}
              value={form.openingBalance}
              onChangeText={(v) => {
                setForm((f) => ({ ...f, openingBalance: v }));
                if (errors.openingBalance) setErrors((e) => ({ ...e, openingBalance: undefined }));
              }}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              error={errors.openingBalance}
              hint={t('form.openingBalanceHint')}
              textAlign={isRTL ? 'right' : 'left'}
            />
          )}

          {/* isActive toggle — EDIT only */}
          {isEditMode && (
            <View
              style={[
                styles.toggleRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc',
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.toggleText}>
                <ZText weight="medium" style={{ color: palette.text }}>
                  {t('form.isActive')}
                </ZText>
                <ZText size="sm" variant="secondary">
                  {form.isActive ? t('form.activeYes') : t('form.activeNo')}
                </ZText>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                trackColor={{ false: palette.border, true: EMPLOYEE_ACCENT }}
                thumbColor={Colors.white}
              />
            </View>
          )}

          {/* Submit */}
          <ZButton
            onPress={handleSubmit}
            loading={isPending}
            fullWidth
            style={styles.submitBtn}
          >
            {t('form.save')}
          </ZButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </ZModal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[6],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  submitBtn: {
    marginTop: Spacing[2],
  },
});
