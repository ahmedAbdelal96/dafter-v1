/**
 * ExpenseForm — Slide-up modal for creating or editing an expense.
 *
 * Create mode: all required fields blank
 * Edit mode:   pre-filled from `initialData`
 *
 * Fields:
 *   Required: category (chips), amount, date
 *   Optional: description, referenceNumber, paymentMethod, notes, supplier
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZDateInput } from '@/components/ui/ZDateInput';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';
import { useCreateExpense, useUpdateExpense } from '../hooks/useExpenses';
import {
  ALL_CATEGORIES,
  CATEGORY_CONFIG,
  formatDateForApi,
  type Expense,
  type ExpenseCategory,
  type CreateExpenseDto,
  type UpdateExpenseDto,
} from '../types';

interface ExpenseFormProps {
  visible: boolean;
  onClose: () => void;
  /** When provided, the form operates in edit mode */
  initialData?: Expense;
}

interface FormState {
  category: ExpenseCategory | null;
  amount: string;
  expenseDate: Date;
  description: string;
  referenceNumber: string;
  paymentMethod: string;
  notes: string;
}

interface FormErrors {
  category?: string;
  amount?: string;
  expenseDate?: string;
}

export function ExpenseForm({ visible, onClose, initialData }: ExpenseFormProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('expenses');
  const palette = isDark ? Colors.dark : Colors.light;

  const isEdit = !!initialData;

  // Refs for focus chain
  const amountRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);
  const refNumRef = useRef<TextInput>(null);
  const paymentRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(initialData),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initialData?.referenceNumber || initialData?.paymentMethod || initialData?.notes),
  );
  const [selectedSupplier, setSelectedSupplier] = useState<SelectedParty | null>(
    initialData?.supplier
      ? { id: initialData.supplier.id, name: initialData.supplier.name }
      : null,
  );

  // Re-populate when modal reopens with new initialData
  useEffect(() => {
    if (visible) {
      setForm(buildInitialState(initialData));
      setErrors({});
      setShowAdvanced(!!(initialData?.referenceNumber || initialData?.paymentMethod || initialData?.notes));
      setSelectedSupplier(
        initialData?.supplier
          ? { id: initialData.supplier.id, name: initialData.supplier.name }
          : null,
      );
    }
  }, [visible, initialData]);

  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const isPending = isCreating || isUpdating;

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.category) errs.category = t('validation.categoryRequired');
    if (!form.amount.trim() || isNaN(parseFloat(form.amount))) {
      errs.amount = t('validation.amountRequired');
    } else if (parseFloat(form.amount) <= 0) {
      errs.amount = t('validation.amountPositive');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload(): CreateExpenseDto {
    return {
      category: form.category!,
      amount: parseFloat(form.amount),
      expenseDate: formatDateForApi(form.expenseDate),
      description: form.description.trim() || undefined,
      supplierId: selectedSupplier?.id,
      referenceNumber: form.referenceNumber.trim() || undefined,
      paymentMethod: form.paymentMethod.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
  }

  function handleSubmit() {
    if (!validate()) return;

    if (isEdit && initialData) {
      const full = buildPayload();
      // Send only changed fields
      const patch: UpdateExpenseDto = {};
      if (full.category !== initialData.category) patch.category = full.category;
      if (full.amount !== parseFloat(String(initialData.amount))) patch.amount = full.amount;
      if (full.expenseDate !== formatDateForApi(new Date(initialData.expenseDate)))
        patch.expenseDate = full.expenseDate;
      if ((full.description ?? null) !== initialData.description) patch.description = full.description;
      if ((full.supplierId ?? null) !== initialData.supplierId) patch.supplierId = full.supplierId;
      if ((full.referenceNumber ?? null) !== initialData.referenceNumber) patch.referenceNumber = full.referenceNumber;
      if ((full.paymentMethod ?? null) !== initialData.paymentMethod) patch.paymentMethod = full.paymentMethod;
      if ((full.notes ?? null) !== initialData.notes) patch.notes = full.notes;

      updateExpense(
        { id: initialData.id, dto: patch },
        { onSuccess: () => { setErrors({}); onClose(); } },
      );
    } else {
      createExpense(buildPayload(), {
        onSuccess: () => { setErrors({}); onClose(); },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message;
          setErrors({ amount: msg ?? t('errors.createFailed') });
        },
      });
    }
  }

  return (
    <ZModal
      visible={visible}
      onClose={onClose}
      title={isEdit ? t('form.edit') : t('form.create')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Category chips ── */}
          <View style={styles.section}>
            <ZText size="sm" weight="medium" style={{ color: palette.text }}>
              {t('form.category')}
            </ZText>
            <View style={styles.chipGrid}>
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = form.category === cat;
                const cfg = CATEGORY_CONFIG[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? cfg.color : `${cfg.color}15`,
                        borderColor: isSelected ? cfg.color : 'transparent',
                        borderWidth: 1,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    onPress={() => {
                      setForm((f) => ({ ...f, category: cat }));
                      if (errors.category) setErrors((e) => ({ ...e, category: undefined }));
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={13}
                      color={isSelected ? '#fff' : cfg.color}
                    />
                    <ZText
                      size="xs"
                      weight={isSelected ? 'bold' : 'regular'}
                      style={{ color: isSelected ? '#fff' : cfg.color }}
                    >
                      {t(`category.${cat}`)}
                    </ZText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.category ? (
              <ZText size="xs" style={{ color: Colors.status.error }}>
                {errors.category}
              </ZText>
            ) : null}
          </View>

          {/* ── Amount ── */}
          <ZInput
            ref={amountRef}
            label={t('form.amount')}
            placeholder={t('form.amountPlaceholder')}
            value={form.amount}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, amount: v }));
              if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
            }}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => descRef.current?.focus()}
            error={errors.amount}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* ── Date ── */}
          <ZDateInput
            label={t('form.date')}
            value={form.expenseDate}
            onChange={(date) => setForm((f) => ({ ...f, expenseDate: date }))}
            allowPastDates
          />

          {/* ── Description ── */}
          <ZInput
            ref={descRef}
            label={t('form.description')}
            placeholder={t('form.descriptionPlaceholder')}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            autoCapitalize="sentences"
            returnKeyType="next"
            onSubmitEditing={() => (showAdvanced ? refNumRef.current?.focus() : handleSubmit())}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* ── Supplier (optional) ── */}
          <PartyCombobox
            partyType="SUPPLIER"
            value={selectedSupplier}
            onChange={setSelectedSupplier}
            label={t('form.supplier')}
            placeholder={t('form.supplierPlaceholder')}
          />

          {/* ── Advanced fields toggle ── */}
          <TouchableOpacity
            style={[
              styles.advancedToggle,
              {
                backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={() => setShowAdvanced((v) => !v)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={showAdvanced ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={15}
              color={palette.textMuted}
            />
            <ZText size="sm" style={{ color: palette.textSecondary }}>
              {t('form.advancedFields')}
            </ZText>
          </TouchableOpacity>

          {showAdvanced && (
            <>
              <ZInput
                ref={refNumRef}
                label={t('form.referenceNumber')}
                placeholder={t('form.referenceNumberPlaceholder')}
                value={form.referenceNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, referenceNumber: v }))}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => paymentRef.current?.focus()}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <ZInput
                ref={paymentRef}
                label={t('form.paymentMethod')}
                placeholder={t('form.paymentMethodPlaceholder')}
                value={form.paymentMethod}
                onChangeText={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
                autoCapitalize="sentences"
                returnKeyType="next"
                onSubmitEditing={() => notesRef.current?.focus()}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <ZInput
                ref={notesRef}
                label={t('form.notes')}
                placeholder={t('form.notesPlaceholder')}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </>
          )}

          {/* ── Submit ── */}
          <ZButton
            onPress={handleSubmit}
            loading={isPending}
            fullWidth
            style={styles.submitBtn}
          >
            {isEdit ? t('form.save') : t('form.create')}
          </ZButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </ZModal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialState(expense?: Expense): FormState {
  if (!expense) {
    return {
      category: null,
      amount: '',
      expenseDate: new Date(),
      description: '',
      referenceNumber: '',
      paymentMethod: '',
      notes: '',
    };
  }
  return {
    category: expense.category,
    amount: String(parseFloat(String(expense.amount))),
    expenseDate: new Date(expense.expenseDate),
    description: expense.description ?? '',
    referenceNumber: expense.referenceNumber ?? '',
    paymentMethod: expense.paymentMethod ?? '',
    notes: expense.notes ?? '',
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[6],
  },
  section: {
    gap: Spacing[2],
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    gap: Spacing[1],
  },
  advancedToggle: {
    alignItems: 'center',
    gap: Spacing[2],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  submitBtn: {
    marginTop: Spacing[2],
  },
});
