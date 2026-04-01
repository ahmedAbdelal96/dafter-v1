/**
 * CustomerForm — Slide-up modal for creating or editing a customer.
 *
 * Create mode: name, phone, address, openingBalance, creditLimit
 * Edit mode:   name, phone, address, creditLimit, isActive toggle
 *              (openingBalance is immutable after creation)
 *              (version is read from customer prop, sent silently)
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
import { useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { CUSTOMER_ACCENT, type Customer } from '../types';

interface CustomerFormProps {
  visible: boolean;
  onClose: () => void;
  /** Pass a customer to activate edit mode */
  customer?: Customer | null;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  openingBalance: string;
  creditLimit: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  phone?: string;
  openingBalance?: string;
  creditLimit?: string;
}

export function CustomerForm({ visible, onClose, customer }: CustomerFormProps) {
  const isEditMode = !!customer;
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const phoneRef    = useRef<TextInput>(null);
  const addressRef  = useRef<TextInput>(null);
  const balanceRef  = useRef<TextInput>(null);
  const creditRef   = useRef<TextInput>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    address: '',
    openingBalance: '',
    creditLimit: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Populate form when editing
  useEffect(() => {
    if (visible) {
      if (customer) {
        setForm({
          name: customer.name,
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          openingBalance: '',          // immutable — not shown in edit
          creditLimit: customer.creditLimit ?? '',
          isActive: customer.isActive,
        });
      } else {
        setForm({ name: '', phone: '', address: '', openingBalance: '', creditLimit: '', isActive: true });
      }
      setErrors({});
    }
  }, [visible, customer]);

  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer();
  const isPending = isCreating || isUpdating;

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) {
      errs.name = t('validation.nameRequired');
    }
    if (form.openingBalance && isNaN(parseFloat(form.openingBalance))) {
      errs.openingBalance = t('validation.invalidAmount');
    }
    if (form.creditLimit && isNaN(parseFloat(form.creditLimit))) {
      errs.creditLimit = t('validation.invalidAmount');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    if (isEditMode && customer) {
      updateCustomer(
        {
          id: customer.id,
          dto: {
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            address: form.address.trim() || undefined,
            creditLimit: form.creditLimit.trim()
              ? parseFloat(form.creditLimit)
              : null,
            isActive: form.isActive,
            version: customer.version,
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
              // Could be name conflict or version conflict
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
      createCustomer(
        {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          openingBalance: form.openingBalance.trim()
            ? parseFloat(form.openingBalance)
            : undefined,
          creditLimit: form.creditLimit.trim()
            ? parseFloat(form.creditLimit)
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
            returnKeyType={isEditMode ? 'next' : 'next'}
            onSubmitEditing={() =>
              isEditMode ? creditRef.current?.focus() : balanceRef.current?.focus()
            }
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
              returnKeyType="next"
              onSubmitEditing={() => creditRef.current?.focus()}
              error={errors.openingBalance}
              hint={t('form.openingBalanceHint')}
              textAlign={isRTL ? 'right' : 'left'}
            />
          )}

          {/* Credit limit */}
          <ZInput
            ref={creditRef}
            label={t('form.creditLimit')}
            placeholder={t('form.creditLimitPlaceholder')}
            value={form.creditLimit}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, creditLimit: v }));
              if (errors.creditLimit) setErrors((e) => ({ ...e, creditLimit: undefined }));
            }}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            error={errors.creditLimit}
            textAlign={isRTL ? 'right' : 'left'}
          />

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
                trackColor={{ false: palette.border, true: CUSTOMER_ACCENT }}
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
