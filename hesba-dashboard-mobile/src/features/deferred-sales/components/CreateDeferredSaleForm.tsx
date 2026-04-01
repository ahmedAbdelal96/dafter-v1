/**
 * CreateDeferredSaleForm — Full-screen modal to create a new deferred sale.
 *
 * Fields:
 *   - partyType  (CUSTOMER | SUPPLIER | EMPLOYEE — tab selector)
 *   - party      (PartyCombobox — live search picker)
 *   - totalAmount (numeric, required, > 0)
 *   - dueDate    (YYYY-MM-DD, required)
 *   - description (optional)
 *   - expectedPaymentMethod (optional)
 *
 * On success: invalidates DEFERRED_SALES list and closes.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCreateDeferredSale } from '../hooks/useDeferredSales';
import {
  todayIso,
  DEFERRED_ACCENT,
  DEFERRED_ACCENT_LIGHT,
  type PartyType,
} from '../types';

const PARTY_TYPES: PartyType[] = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE'];

interface FormState {
  partyType: PartyType;
  totalAmount: string;
  dueDate: string;
  description: string;
  expectedPaymentMethod: string;
}

interface FormErrors {
  partyId?: string;
  totalAmount?: string;
  dueDate?: string;
}

function extractApiMessages(error: unknown): string[] {
  const raw = (error as any)?.response?.data?.message;
  if (Array.isArray(raw)) return raw.map((m) => String(m));
  if (typeof raw === 'string') return [raw];
  return [];
}

interface CreateDeferredSaleFormProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateDeferredSaleForm({ visible, onClose }: CreateDeferredSaleFormProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('deferredSales');
  const palette = isDark ? Colors.dark : Colors.light;

  const amountRef = useRef<TextInput>(null);
  const dueDateRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);
  const methodRef = useRef<TextInput>(null);

  const [form, setForm] = useState<FormState>({
    partyType: 'CUSTOMER',
    totalAmount: '',
    dueDate: '',
    description: '',
    expectedPaymentMethod: '',
  });
  const [selectedParty, setSelectedParty] = useState<SelectedParty | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const { mutate: create, isPending } = useCreateDeferredSale();

  function validate(): boolean {
    const errs: FormErrors = {};

    if (!selectedParty) {
      errs.partyId = t('validation.partyRequired');
    }

    const amt = parseFloat(form.totalAmount);
    if (!form.totalAmount || isNaN(amt) || amt <= 0) {
      errs.totalAmount = t('validation.amountPositive');
    }

    if (!form.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)) {
      errs.dueDate = t('validation.dueDateFormat');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    create(
      {
        partyType: form.partyType,
        partyId: selectedParty!.id,
        totalAmount: parseFloat(form.totalAmount),
        dueDate: form.dueDate,
        description: form.description.trim() || undefined,
        expectedPaymentMethod: form.expectedPaymentMethod.trim() || undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
        onError: (err: unknown) => {
          const messages = extractApiMessages(err).map((m) => m.toLowerCase());
          const next: FormErrors = {};
          if (messages.some((m) => m.includes('party') || m.includes('customer') || m.includes('supplier') || m.includes('employee'))) {
            next.partyId = t('validation.partyRequired');
          }
          if (messages.some((m) => m.includes('amount') || m.includes('totalamount') || m.includes('total amount'))) {
            next.totalAmount = t('validation.amountPositive');
          }
          if (messages.some((m) => m.includes('duedate') || m.includes('due date'))) {
            next.dueDate = t('validation.dueDateFormat');
          }
          if (Object.keys(next).length === 0) {
            next.partyId = t('error.createFailed');
          }
          setErrors((e) => ({ ...e, ...next }));
        },
      },
    );
  }

  function resetForm() {
    setForm({
      partyType: 'CUSTOMER',
      totalAmount: '',
      dueDate: '',
      description: '',
      expectedPaymentMethod: '',
    });
    setSelectedParty(null);
    setErrors({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <ZModal visible={visible} onClose={handleClose} title={t('form.create')} animationType="slide">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Party Type Selector */}
        <View>
          <ZText size="sm" weight="medium" style={[styles.fieldLabel, { color: palette.text }]}>
            {t('form.partyType')}
          </ZText>
          <View style={[styles.typeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {PARTY_TYPES.map((type) => {
              const active = form.partyType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setForm((f) => ({ ...f, partyType: type }));
                    setSelectedParty(null);
                  }}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? DEFERRED_ACCENT : palette.surfaceSecondary,
                      borderColor: active ? DEFERRED_ACCENT : palette.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <ZText
                    size="sm"
                    style={{ color: active ? '#fff' : palette.textSecondary, fontWeight: active ? '600' : '400' }}
                  >
                    {t(`partyType.${type}`)}
                  </ZText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Party Picker */}
        <PartyCombobox
          partyType={form.partyType}
          value={selectedParty}
          onChange={(party) => {
            setSelectedParty(party);
            if (errors.partyId) setErrors((e) => ({ ...e, partyId: undefined }));
          }}
          label={t('form.party')}
          placeholder={t('form.partyPlaceholder')}
          error={errors.partyId}
        />

        {/* Total Amount */}
        <ZInput
          ref={amountRef}
          label={t('form.totalAmount')}
          placeholder={t('form.amountPlaceholder')}
          value={form.totalAmount}
          onChangeText={(v) => setForm((f) => ({ ...f, totalAmount: v }))}
          keyboardType="decimal-pad"
          error={errors.totalAmount}
          returnKeyType="next"
          onSubmitEditing={() => dueDateRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Due Date */}
        <ZInput
          ref={dueDateRef}
          label={t('form.dueDate')}
          placeholder={t('form.dueDatePlaceholder')}
          value={form.dueDate}
          onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
          error={errors.dueDate}
          returnKeyType="next"
          onSubmitEditing={() => descRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Description (optional) */}
        <ZInput
          ref={descRef}
          label={t('form.description')}
          placeholder={t('form.descriptionPlaceholder')}
          value={form.description}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
          multiline
          numberOfLines={3}
          returnKeyType="next"
          onSubmitEditing={() => methodRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Expected Payment Method (optional) */}
        <ZInput
          ref={methodRef}
          label={t('form.expectedPaymentMethod')}
          placeholder={t('form.paymentMethodPlaceholder')}
          value={form.expectedPaymentMethod}
          onChangeText={(v) => setForm((f) => ({ ...f, expectedPaymentMethod: v }))}
          returnKeyType="done"
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Submit */}
        <ZButton
          onPress={handleSubmit}
          loading={isPending}
          fullWidth
          style={styles.submitBtn}
        >
          {t('form.submit')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[8],
  },
  fieldLabel: {
    marginBottom: Spacing[2],
  },
  typeRow: {
    gap: Spacing[2],
  },
  typeChip: {
    flex: 1,
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  submitBtn: {
    marginTop: Spacing[2],
  },
});
