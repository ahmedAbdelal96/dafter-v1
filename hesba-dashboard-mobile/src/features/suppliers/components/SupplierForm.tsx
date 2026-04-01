/**
 * SupplierForm — Slide-up modal for creating or editing a supplier.
 *
 * Create mode: name, phone, address, openingBalance
 * Edit mode:   name, phone, address, isActive toggle
 *              (openingBalance is immutable after creation)
 *              (version is read from supplier prop, sent silently)
 *
 * Errors handled:
 *   - 409 Conflict: name already taken → shown under name field
 *   - 409 Conflict (version mismatch): stale data → version conflict toast
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
import { useCreateSupplier, useUpdateSupplier } from '../hooks/useSuppliers';
import { SUPPLIER_ACCENT, type Supplier } from '../types';

interface SupplierFormProps {
  visible: boolean;
  onClose: () => void;
  /** Pass a supplier to activate edit mode */
  supplier?: Supplier | null;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  openingBalance: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  phone?: string;
  openingBalance?: string;
}

export function SupplierForm({ visible, onClose, supplier }: SupplierFormProps) {
  const isEditMode = !!supplier;
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('suppliers');
  const palette = isDark ? Colors.dark : Colors.light;

  const phoneRef   = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const balanceRef = useRef<TextInput>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    address: '',
    openingBalance: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Populate form when editing
  useEffect(() => {
    if (visible) {
      if (supplier) {
        setForm({
          name: supplier.name,
          phone: supplier.phone ?? '',
          address: supplier.address ?? '',
          openingBalance: '', // immutable — not shown in edit
          isActive: supplier.isActive,
        });
      } else {
        setForm({ name: '', phone: '', address: '', openingBalance: '', isActive: true });
      }
      setErrors({});
    }
  }, [visible, supplier]);

  const { mutate: createSupplier, isPending: isCreating } = useCreateSupplier();
  const { mutate: updateSupplier, isPending: isUpdating } = useUpdateSupplier();
  const isPending = isCreating || isUpdating;

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) {
      errs.name = t('validation.nameRequired');
    }
    if (form.openingBalance && isNaN(parseFloat(form.openingBalance))) {
      errs.openingBalance = t('validation.invalidAmount');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    if (isEditMode && supplier) {
      updateSupplier(
        {
          id: supplier.id,
          dto: {
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            address: form.address.trim() || undefined,
            isActive: form.isActive,
            version: supplier.version,
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
      createSupplier(
        {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
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
            onSubmitEditing={() => addressRef.current?.focus()}
            error={errors.phone}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Address */}
          <ZInput
            ref={addressRef}
            label={t('form.address')}
            placeholder={t('form.addressPlaceholder')}
            value={form.address}
            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
            autoCapitalize="sentences"
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
                trackColor={{ false: palette.border, true: SUPPLIER_ACCENT }}
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
