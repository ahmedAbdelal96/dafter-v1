/**
 * EntryForm — Slide-up modal for creating a new ledger entry.
 *
 * The user enters a POSITIVE amount.
 * The sign is computed automatically based on partyType + entryType.
 *
 * Fields:
 *   - Entry type (chips — filtered by partyType)
 *   - Amount (positive decimal)
 *   - Entry date (ZDateInput, allowPastDates)
 *   - Note (optional)
 *   - Due date (optional)
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
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
import { useCreateEntry } from '../hooks/useLedger';
import {
  ENTRY_TYPES_BY_PARTY,
  ENTRY_TYPE_COLORS,
  ENTRY_TYPE_ICONS,
  computeSignedAmount,
  formatDateForApi,
  type PartyType,
  type LedgerEntryType,
} from '../types';

interface EntryFormProps {
  visible: boolean;
  partyId: string;
  partyType: PartyType;
  partyName: string;
  onClose: () => void;
}

interface FormState {
  entryType: LedgerEntryType | null;
  amount: string;
  entryDate: Date;
  dueDate: Date | null;
  note: string;
}

interface FormErrors {
  entryType?: string;
  amount?: string;
}

export function EntryForm({
  visible,
  partyId,
  partyType,
  partyName,
  onClose,
}: EntryFormProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('ledger');
  const palette = isDark ? Colors.dark : Colors.light;

  const amountRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const availableTypes = ENTRY_TYPES_BY_PARTY[partyType];

  const [form, setForm] = useState<FormState>({
    entryType: availableTypes[0] ?? null,
    amount: '',
    entryDate: new Date(),
    dueDate: null,
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDueDate, setShowDueDate] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (visible) {
      setForm({
        entryType: availableTypes[0] ?? null,
        amount: '',
        entryDate: new Date(),
        dueDate: null,
        note: '',
      });
      setErrors({});
      setShowDueDate(false);
    }
  }, [visible, partyType]);

  const { mutate: createEntry, isPending } = useCreateEntry();

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.entryType) errs.entryType = t('validation.typeRequired');
    if (!form.amount.trim() || isNaN(parseFloat(form.amount))) {
      errs.amount = t('validation.amountRequired');
    } else if (parseFloat(form.amount) <= 0) {
      errs.amount = t('validation.amountPositive');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate() || !form.entryType) return;

    const rawAmount = parseFloat(form.amount);
    const signedAmount = computeSignedAmount(rawAmount, partyType, form.entryType);

    createEntry(
      {
        partyType,
        partyId,
        entryType: form.entryType,
        signedAmount,
        entryDate: formatDateForApi(form.entryDate),
        dueDate: form.dueDate ? formatDateForApi(form.dueDate) : undefined,
        note: form.note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setErrors({});
          onClose();
        },
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setErrors({ amount: message ?? t('errors.createFailed') });
        },
      },
    );
  }

  return (
    <ZModal
      visible={visible}
      onClose={onClose}
      title={t('entry.create')}
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
          {/* Party label */}
          <View
            style={[
              styles.partyBadge,
              {
                backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f1f5f9',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="person-outline" size={14} color={palette.textSecondary} />
            <ZText size="sm" variant="secondary" style={{ flex: 1 }}>
              {partyName}
            </ZText>
          </View>

          {/* Entry type chips */}
          <View style={styles.section}>
            <ZText size="sm" weight="medium" style={{ color: palette.text }}>
              {t('entry.type')}
            </ZText>
            <View
              style={[
                styles.chipRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {availableTypes.map((type) => {
                const isSelected = form.entryType === type;
                const color = ENTRY_TYPE_COLORS[type] ?? '#475569';
                const icon = ENTRY_TYPE_ICONS[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? color : `${color}15`,
                        borderColor: isSelected ? color : 'transparent',
                        borderWidth: 1,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    onPress={() => {
                      setForm((f) => ({ ...f, entryType: type }));
                      if (errors.entryType) setErrors((e) => ({ ...e, entryType: undefined }));
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={13}
                      color={isSelected ? '#fff' : color}
                    />
                    <ZText
                      size="xs"
                      weight={isSelected ? 'bold' : 'regular'}
                      style={{ color: isSelected ? '#fff' : color }}
                    >
                      {t(`entryType.${type}`)}
                    </ZText>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.entryType ? (
              <ZText size="xs" style={{ color: Colors.status.error }}>
                {errors.entryType}
              </ZText>
            ) : null}
          </View>

          {/* Amount */}
          <ZInput
            ref={amountRef}
            label={t('entry.amount')}
            placeholder={t('entry.amountPlaceholder')}
            value={form.amount}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, amount: v }));
              if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
            }}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => noteRef.current?.focus()}
            error={errors.amount}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Entry Date */}
          <ZDateInput
            label={t('entry.date')}
            value={form.entryDate}
            onChange={(date) => setForm((f) => ({ ...f, entryDate: date }))}
            allowPastDates
          />

          {/* Note */}
          <ZInput
            ref={noteRef}
            label={t('entry.description')}
            placeholder={t('entry.descriptionPlaceholder')}
            value={form.note}
            onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            textAlign={isRTL ? 'right' : 'left'}
          />

          {/* Due date toggle */}
          <TouchableOpacity
            style={[
              styles.dueDateToggle,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc',
              },
            ]}
            onPress={() => {
              setShowDueDate((v) => {
                if (v) setForm((f) => ({ ...f, dueDate: null }));
                return !v;
              });
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name={showDueDate ? 'checkbox-outline' : 'square-outline'}
              size={18}
              color={showDueDate ? '#475569' : palette.textMuted}
            />
            <ZText size="sm" style={{ color: palette.textSecondary }}>
              {t('entry.addDueDate')}
            </ZText>
          </TouchableOpacity>

          {showDueDate && (
            <ZDateInput
              label={t('entry.dueDate')}
              value={form.dueDate}
              onChange={(date) => setForm((f) => ({ ...f, dueDate: date }))}
              allowPastDates
            />
          )}

          {/* Submit */}
          <ZButton
            onPress={handleSubmit}
            loading={isPending}
            fullWidth
            style={styles.submitBtn}
          >
            {t('entry.save')}
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
  partyBadge: {
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  section: {
    gap: Spacing[2],
  },
  chipRow: {
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
  dueDateToggle: {
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  submitBtn: {
    marginTop: Spacing[2],
  },
});
