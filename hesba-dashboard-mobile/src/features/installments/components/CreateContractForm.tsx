/**
 * CreateContractForm — Full-screen modal to create a new installment contract.
 *
 * Fields:
 *   - partyType   (CUSTOMER | SUPPLIER | EMPLOYEE — tab selector)
 *   - party       (PartyCombobox — live search)
 *   - totalAmount (numeric, required, > 0)
 *   - downPayment (numeric, optional, defaults 0)
 *   - numberOfInstallments (integer, required, ≥ 1)
 *   - scheduleType (FIXED | CUSTOM — tab selector)
 *   - startDate   (YYYY-MM-DD, required for FIXED)
 *   - scheduleItems (CUSTOM only — list of { dueDate, amount })
 *   - description (optional)
 *
 * FIXED: backend auto-generates equal installments starting from startDate (monthly).
 * CUSTOM: user supplies each installment manually.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCreateInstallment } from '../hooks/useInstallments';
import {
  todayIso,
  INSTALLMENT_ACCENT,
  INSTALLMENT_ACCENT_LIGHT,
  type PartyType,
  type ScheduleType,
  type ScheduleItemPayload,
} from '../types';

const PARTY_TYPES: PartyType[]   = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE'];
const SCHEDULE_TYPES: ScheduleType[] = ['FIXED', 'CUSTOM'];

interface FormState {
  partyType: PartyType;
  scheduleType: ScheduleType;
  totalAmount: string;
  downPayment: string;
  numberOfInstallments: string;
  startDate: string;
  description: string;
}

interface FormErrors {
  partyId?: string;
  totalAmount?: string;
  downPayment?: string;
  numberOfInstallments?: string;
  startDate?: string;
  scheduleItems?: string;
}

function extractApiMessages(error: unknown): string[] {
  const raw = (error as any)?.response?.data?.message;
  if (Array.isArray(raw)) return raw.map((m) => String(m));
  if (typeof raw === 'string') return [raw];
  return [];
}

interface ScheduleItem {
  dueDate: string;
  amount: string;
}

interface CreateContractFormProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateContractForm({ visible, onClose }: CreateContractFormProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('installments');
  const palette = isDark ? Colors.dark : Colors.light;

  const amountRef       = useRef<TextInput>(null);
  const downPayRef      = useRef<TextInput>(null);
  const numRef          = useRef<TextInput>(null);
  const startDateRef    = useRef<TextInput>(null);
  const descRef         = useRef<TextInput>(null);

  const [form, setForm] = useState<FormState>({
    partyType: 'CUSTOMER',
    scheduleType: 'FIXED',
    totalAmount: '',
    downPayment: '',
    numberOfInstallments: '',
    startDate: '',
    description: '',
  });
  const [selectedParty, setSelectedParty]     = useState<SelectedParty | null>(null);
  const [scheduleItems, setScheduleItems]      = useState<ScheduleItem[]>([]);
  const [errors, setErrors]                    = useState<FormErrors>({});

  const { mutate: create, isPending } = useCreateInstallment();

  function validate(): boolean {
    const errs: FormErrors = {};

    if (!selectedParty) {
      errs.partyId = t('validation.partyRequired');
    }

    const total = parseFloat(form.totalAmount);
    if (!form.totalAmount || isNaN(total) || total <= 0) {
      errs.totalAmount = t('validation.amountPositive');
    }

    const dp = parseFloat(form.downPayment || '0');
    if (!isNaN(dp) && !isNaN(total) && dp >= total) {
      errs.downPayment = t('validation.downPaymentExceedsTotal');
    }

    const num = parseInt(form.numberOfInstallments, 10);
    if (!form.numberOfInstallments || isNaN(num) || num < 1) {
      errs.numberOfInstallments = t('validation.installmentsMin');
    }

    if (form.scheduleType === 'FIXED') {
      if (!form.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) {
        errs.startDate = t('validation.startDateFormat');
      }
    }

    if (form.scheduleType === 'CUSTOM') {
      if (scheduleItems.length === 0) {
        errs.scheduleItems = t('validation.customScheduleRequired');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const payload = {
      partyType: form.partyType,
      partyId: selectedParty!.id,
      totalAmount: parseFloat(form.totalAmount),
      downPayment: parseFloat(form.downPayment || '0') || 0,
      numberOfInstallments: parseInt(form.numberOfInstallments, 10),
      scheduleType: form.scheduleType,
      startDate: form.startDate || todayIso(),
      description: form.description.trim() || undefined,
      scheduleItems: form.scheduleType === 'CUSTOM'
        ? scheduleItems
            .filter((s) => s.dueDate && s.amount)
            .map<ScheduleItemPayload>((s) => ({
              dueDate: s.dueDate,
              amount: parseFloat(s.amount),
            }))
        : undefined,
    };

    create(payload, {
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
        if (messages.some((m) => m.includes('totalamount') || m.includes('total amount') || m.includes('amount'))) {
          next.totalAmount = t('validation.amountPositive');
        }
        if (messages.some((m) => m.includes('downpayment') || m.includes('down payment'))) {
          next.downPayment = t('validation.downPaymentExceedsTotal');
        }
        if (messages.some((m) => m.includes('numberofinstallments') || m.includes('number of installments'))) {
          next.numberOfInstallments = t('validation.installmentsMin');
        }
        if (messages.some((m) => m.includes('startdate') || m.includes('start date'))) {
          next.startDate = t('validation.startDateFormat');
        }
        if (messages.some((m) => m.includes('scheduleitems') || m.includes('schedule items'))) {
          next.scheduleItems = t('validation.customScheduleRequired');
        }
        if (Object.keys(next).length === 0) {
          next.partyId = t('error.createFailed');
        }
        setErrors((e) => ({ ...e, ...next }));
      },
    });
  }

  function resetForm() {
    setForm({
      partyType: 'CUSTOMER',
      scheduleType: 'FIXED',
      totalAmount: '',
      downPayment: '',
      numberOfInstallments: '',
      startDate: '',
      description: '',
    });
    setSelectedParty(null);
    setScheduleItems([]);
    setErrors({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function addScheduleItem() {
    setScheduleItems((prev) => [...prev, { dueDate: '', amount: '' }]);
  }

  function removeScheduleItem(index: number) {
    setScheduleItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateScheduleItem(index: number, field: 'dueDate' | 'amount', value: string) {
    setScheduleItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  return (
    <ZModal visible={visible} onClose={handleClose} title={t('form.create')} animationType="slide">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Party Type Tabs */}
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
                      backgroundColor: active ? INSTALLMENT_ACCENT : palette.surfaceSecondary,
                      borderColor: active ? INSTALLMENT_ACCENT : palette.border,
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
          onSubmitEditing={() => downPayRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Down Payment */}
        <ZInput
          ref={downPayRef}
          label={t('form.downPayment')}
          placeholder={t('form.downPaymentPlaceholder')}
          value={form.downPayment}
          onChangeText={(v) => setForm((f) => ({ ...f, downPayment: v }))}
          keyboardType="decimal-pad"
          error={errors.downPayment}
          returnKeyType="next"
          onSubmitEditing={() => numRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Number of Installments */}
        <ZInput
          ref={numRef}
          label={t('form.numberOfInstallments')}
          placeholder={t('form.numberOfInstallmentsPlaceholder')}
          value={form.numberOfInstallments}
          onChangeText={(v) => setForm((f) => ({ ...f, numberOfInstallments: v }))}
          keyboardType="numeric"
          error={errors.numberOfInstallments}
          returnKeyType="next"
          onSubmitEditing={() => startDateRef.current?.focus()}
          textAlign={isRTL ? 'right' : 'left'}
        />

        {/* Schedule Type Tabs */}
        <View>
          <ZText size="sm" weight="medium" style={[styles.fieldLabel, { color: palette.text }]}>
            {t('form.scheduleType')}
          </ZText>
          <View style={[styles.typeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {SCHEDULE_TYPES.map((type) => {
              const active = form.scheduleType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setForm((f) => ({ ...f, scheduleType: type }))}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? INSTALLMENT_ACCENT : palette.surfaceSecondary,
                      borderColor: active ? INSTALLMENT_ACCENT : palette.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <ZText
                    size="sm"
                    style={{ color: active ? '#fff' : palette.textSecondary, fontWeight: active ? '600' : '400' }}
                  >
                    {t(`scheduleType.${type}`)}
                  </ZText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FIXED: Start Date */}
        {form.scheduleType === 'FIXED' && (
          <ZInput
            ref={startDateRef}
            label={t('form.startDate')}
            placeholder={t('form.startDatePlaceholder')}
            value={form.startDate}
            onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
            error={errors.startDate}
            returnKeyType="next"
            onSubmitEditing={() => descRef.current?.focus()}
            textAlign={isRTL ? 'right' : 'left'}
          />
        )}

        {/* CUSTOM: Schedule Items */}
        {form.scheduleType === 'CUSTOM' && (
          <View>
            <ZText size="sm" weight="medium" style={[styles.fieldLabel, { color: palette.text }]}>
              {t('form.customSchedule')}
            </ZText>
            {errors.scheduleItems && (
              <ZText size="xs" style={{ color: '#dc2626', marginBottom: Spacing[2] }}>
                {errors.scheduleItems}
              </ZText>
            )}
            {scheduleItems.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.scheduleItemRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: palette.surfaceSecondary, borderColor: palette.border },
                ]}
              >
                <View style={styles.scheduleItemFields}>
                  <ZInput
                    label={`${t('form.scheduleItemAmount')} ${idx + 1}`}
                    placeholder="0.00"
                    value={item.amount}
                    onChangeText={(v) => updateScheduleItem(idx, 'amount', v)}
                    keyboardType="decimal-pad"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <ZInput
                    label={t('form.scheduleItemDueDate')}
                    placeholder="YYYY-MM-DD"
                    value={item.dueDate}
                    onChangeText={(v) => updateScheduleItem(idx, 'dueDate', v)}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => removeScheduleItem(idx)}
                  style={styles.removeBtn}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addItemBtn, { borderColor: INSTALLMENT_ACCENT }]}
              onPress={addScheduleItem}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={18} color={INSTALLMENT_ACCENT} />
              <ZText size="sm" style={{ color: INSTALLMENT_ACCENT }}>
                {t('form.addScheduleItem')}
              </ZText>
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <ZInput
          ref={descRef}
          label={t('form.description')}
          placeholder={t('form.descriptionPlaceholder')}
          value={form.description}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
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
  scheduleItemRow: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  scheduleItemFields: {
    flex: 1,
    gap: Spacing[2],
  },
  removeBtn: {
    padding: Spacing[2],
    marginTop: Spacing[6],
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginTop: Spacing[1],
  },
  submitBtn: {
    marginTop: Spacing[2],
  },
});
