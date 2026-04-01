/**
 * RecordInstallmentPaymentForm — Slide-up modal to record a payment on one schedule row.
 *
 * Fields:
 *   - amount       (numeric, required, must not exceed schedule remaining)
 *   - paymentDate  (YYYY-MM-DD, required, defaults to today)
 *   - paymentMethod (text, optional)
 *   - notes        (text, optional)
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useRecordInstallmentPayment } from '../hooks/useInstallments';
import {
  toFloat,
  todayIso,
  INSTALLMENT_ACCENT,
  type InstallmentSchedule,
  type InstallmentContract,
} from '../types';

interface RecordInstallmentPaymentFormProps {
  visible: boolean;
  onClose: () => void;
  contract: InstallmentContract;
  schedule: InstallmentSchedule;
}

interface FormState {
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
}

interface FormErrors {
  amount?: string;
  paymentDate?: string;
}

function extractApiMessages(error: unknown): string[] {
  const raw = (error as any)?.response?.data?.message;
  if (Array.isArray(raw)) return raw.map((m) => String(m));
  if (typeof raw === 'string') return [raw];
  return [];
}

export function RecordInstallmentPaymentForm({
  visible,
  onClose,
  contract,
  schedule,
}: RecordInstallmentPaymentFormProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('installments');
  const palette = isDark ? Colors.dark : Colors.light;

  const amountRef  = useRef<TextInput>(null);
  const methodRef  = useRef<TextInput>(null);
  const notesRef   = useRef<TextInput>(null);

  const scheduleRemaining = Math.max(
    0,
    toFloat(schedule.amount) - toFloat(schedule.paidAmount),
  );

  const [form, setForm] = useState<FormState>({
    amount: '',
    paymentDate: todayIso(),
    paymentMethod: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset when schedule changes
  useEffect(() => {
    if (visible) {
      setForm({ amount: '', paymentDate: todayIso(), paymentMethod: '', notes: '' });
      setErrors({});
    }
  }, [visible, schedule.id]);

  const { mutate: recordPayment, isPending } = useRecordInstallmentPayment();

  function validate(): boolean {
    const errs: FormErrors = {};
    const amt = parseFloat(form.amount);

    if (!form.amount || isNaN(amt) || amt <= 0) {
      errs.amount = t('validation.paymentAmountRequired');
    } else if (amt > scheduleRemaining + 0.001) {
      errs.amount = t('validation.paymentExceedsRemaining');
    }

    if (!form.paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.paymentDate)) {
      errs.paymentDate = t('validation.paymentDateRequired');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    recordPayment(
      {
        contractId: contract.id,
        payload: {
          scheduleId: schedule.id,
          amount: parseFloat(form.amount),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setForm({ amount: '', paymentDate: todayIso(), paymentMethod: '', notes: '' });
          setErrors({});
          onClose();
        },
        onError: (err: unknown) => {
          const messages = extractApiMessages(err).map((m) => m.toLowerCase());
          const next: FormErrors = {};
          if (messages.some((m) => m.includes('date') || m.includes('paymentdate') || m.includes('payment date'))) {
            next.paymentDate = t('validation.paymentDateRequired');
          }
          if (messages.some((m) => m.includes('amount') || m.includes('remaining') || m.includes('exceed'))) {
            next.amount = t('validation.paymentAmountRequired');
          }
          if (Object.keys(next).length === 0) {
            next.amount = t('error.paymentFailed');
          }
          setErrors((e) => ({ ...e, ...next }));
        },
      },
    );
  }

  function handleClose() {
    setForm({ amount: '', paymentDate: todayIso(), paymentMethod: '', notes: '' });
    setErrors({});
    onClose();
  }

  return (
    <ZModal visible={visible} onClose={handleClose} title={t('payment.title')}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Remaining balance banner */}
        <View
          style={[
            styles.remainingBanner,
            { backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f0fdf4' },
          ]}
        >
          <Ionicons name="information-circle-outline" size={16} color="#15803d" />
          <ZText size="sm" style={{ color: '#15803d' }}>
            {`${t('detail.remainingAmount')}: `}
            <ZText weight="bold" style={{ color: '#15803d' }}>
              {scheduleRemaining.toLocaleString('ar-SA', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </ZText>
          </ZText>
        </View>

        {/* Amount */}
        <ZInput
          ref={amountRef}
          label={t('payment.amount')}
          placeholder={t('payment.amountPlaceholder')}
          value={form.amount}
          onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
          keyboardType="decimal-pad"
          error={errors.amount}
          returnKeyType="next"
          onSubmitEditing={() => methodRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Payment Date */}
        <ZInput
          label={t('payment.date')}
          placeholder={t('payment.datePlaceholder')}
          value={form.paymentDate}
          onChangeText={(v) => setForm((f) => ({ ...f, paymentDate: v }))}
          error={errors.paymentDate}
          returnKeyType="next"
          onSubmitEditing={() => methodRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Payment Method (optional) */}
        <ZInput
          ref={methodRef}
          label={t('payment.method')}
          placeholder={t('payment.methodPlaceholder')}
          value={form.paymentMethod}
          onChangeText={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
          returnKeyType="next"
          onSubmitEditing={() => notesRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Notes (optional) */}
        <ZInput
          ref={notesRef}
          label={t('payment.notes')}
          placeholder={t('payment.notesPlaceholder')}
          value={form.notes}
          onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
          multiline
          numberOfLines={3}
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
          {t('payment.submit')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[6],
  },
  remainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    marginBottom: Spacing[1],
  },
  submitBtn: {
    marginTop: Spacing[2],
  },
});
