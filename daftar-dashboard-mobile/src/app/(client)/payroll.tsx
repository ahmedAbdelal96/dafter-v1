/**
 * Payroll Screen — الرواتب والسلف
 *
 * Shows salary payments, advances and deductions for a selected employee.
 * Reuses ledger infrastructure — filters to EMPLOYEE payroll entry types.
 *
 * Layout:
 *   ┌── Indigo Header ────────────────────────────────────────────────────────┐
 *   │  الرواتب                                                               │
 *   └────────────────────────────────────────────────────────────────────────┘
 *   PartyCombobox → select employee
 *   SummaryCards  → salaries | advances | deductions | net
 *   FlatList      → payroll entries (SALARY_PAYMENT / ADVANCE / DEDUCTION)
 *   FAB / Add button → slide-up form
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';
import { ZText } from '@/components/ui/ZText';
import {
  Colors,
  Fonts,
  FontSize,
  Spacing,
  Radius,
  Shadows,
  Layout,
} from '@/constants/theme';
import { useStatement, useCreateEntry, useDeleteEntry } from '@/features/ledger/hooks/useLedger';
import {
  computeSignedAmount,
  toFloat,
  formatDateForApi,
  ENTRY_TYPE_COLORS,
  ENTRY_TYPE_ICONS,
  type LedgerEntry,
  type LedgerEntryType,
} from '@/features/ledger/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYROLL_ACCENT = '#4f46e5'; // Indigo — same as employees
const PAYROLL_TYPES: LedgerEntryType[] = ['SALARY_PAYMENT', 'ADVANCE', 'DEDUCTION'];

// ─── Entry Row ────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: LedgerEntry;
  typeLabel: string;
  palette: typeof Colors.light;
  fontReg: string;
  fontSemi: string;
  isRTL: boolean;
  onDelete: (id: string) => void;
}

function EntryRow({ entry, typeLabel, palette, fontReg, fontSemi, isRTL, onDelete }: EntryRowProps) {
  const amount = toFloat(entry.signedAmount);
  const amountColor = amount >= 0 ? '#16a34a' : '#dc2626';
  const iconName = ENTRY_TYPE_ICONS[entry.entryType] as React.ComponentProps<typeof Ionicons>['name'];
  const iconColor = ENTRY_TYPE_COLORS[entry.entryType];
  const dateStr = entry.entryDate.split('T')[0];

  return (
    <View style={[styles.entryRow, { borderBottomColor: palette.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.entryIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={[styles.entryMeta, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.entryType, { color: palette.text, fontFamily: fontSemi }]} numberOfLines={1}>
          {typeLabel}
        </Text>
        {entry.note ? (
          <Text style={[styles.entryNote, { color: palette.textSecondary, fontFamily: fontReg }]} numberOfLines={1}>
            {entry.note}
          </Text>
        ) : null}
        <Text style={[styles.entryDate, { color: palette.textMuted, fontFamily: fontReg }]}>
          {dateStr}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: Spacing[1] }}>
        <Text style={[styles.entryAmount, { color: amountColor, fontFamily: fontSemi }]}>
          {amount >= 0 ? '+' : ''}{amount.toFixed(2)}
        </Text>
        <TouchableOpacity onPress={() => onDelete(entry.id)} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={palette.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
  palette,
  fontReg,
  fontBold,
}: {
  label: string;
  value: number;
  color: string;
  palette: typeof Colors.light;
  fontReg: string;
  fontBold: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.summaryLabel, { color: palette.textMuted, fontFamily: fontReg }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color, fontFamily: fontBold }]} numberOfLines={1}>
        {value.toFixed(2)}
      </Text>
    </View>
  );
}

// ─── Add Entry Form ────────────────────────────────────────────────────────────

const TYPE_OPTIONS: LedgerEntryType[] = ['SALARY_PAYMENT', 'ADVANCE', 'DEDUCTION'];

interface AddEntryFormProps {
  visible: boolean;
  saving: boolean;
  palette: typeof Colors.light;
  fontReg: string;
  fontSemi: string;
  isRTL: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onSubmit: (type: LedgerEntryType, amount: number, date: string, note: string) => void;
}

function AddEntryForm({ visible, saving, palette, fontReg, fontSemi, isRTL, t, onClose, onSubmit }: AddEntryFormProps) {
  const [type, setType] = useState<LedgerEntryType>('SALARY_PAYMENT');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatDateForApi(new Date()));
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onSubmit(type, amt, date, note);
    setAmount('');
    setNote('');
    setType('SALARY_PAYMENT');
    setDate(formatDateForApi(new Date()));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.formSheet, { backgroundColor: palette.background }]}>
        <View style={[styles.formHeader, { borderBottomColor: palette.border }]}>
          <Text style={[styles.formTitle, { color: palette.text, fontFamily: fontSemi }]}>
            {t('payroll.form.title')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={palette.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          {/* Type tabs */}
          <Text style={[styles.fieldLabel, { color: palette.textSecondary, fontFamily: fontSemi }]}>
            {t('payroll.form.type')}
          </Text>
          <View style={[styles.typeTabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {TYPE_OPTIONS.map((opt) => {
              const active = opt === type;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.typeTab,
                    {
                      backgroundColor: active ? PAYROLL_ACCENT : palette.surface,
                      borderColor: active ? PAYROLL_ACCENT : palette.border,
                    },
                  ]}
                  onPress={() => setType(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeTabText, { color: active ? Colors.white : palette.text, fontFamily: fontSemi }]}>
                    {t(`payroll.entryTypes.${opt}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount */}
          <Text style={[styles.fieldLabel, { color: palette.textSecondary, fontFamily: fontSemi }]}>
            {t('payroll.form.amount')}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text, fontFamily: fontReg, textAlign: isRTL ? 'right' : 'left' }]}
            value={amount}
            onChangeText={setAmount}
            placeholder={t('payroll.form.amountPlaceholder')}
            placeholderTextColor={palette.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Date */}
          <Text style={[styles.fieldLabel, { color: palette.textSecondary, fontFamily: fontSemi }]}>
            {t('payroll.form.date')}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text, fontFamily: fontReg, textAlign: isRTL ? 'right' : 'left' }]}
            value={date}
            onChangeText={setDate}
            placeholder={t('payroll.form.datePlaceholder')}
            placeholderTextColor={palette.textMuted}
          />

          {/* Note */}
          <Text style={[styles.fieldLabel, { color: palette.textSecondary, fontFamily: fontSemi }]}>
            {t('payroll.form.note')}
          </Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text, fontFamily: fontReg, textAlign: isRTL ? 'right' : 'left' }]}
            value={note}
            onChangeText={setNote}
            placeholder={t('payroll.form.notePlaceholder')}
            placeholderTextColor={palette.textMuted}
            multiline
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: saving ? `${PAYROLL_ACCENT}88` : PAYROLL_ACCENT }]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={[styles.submitBtnText, { fontFamily: fontSemi }]}>
                {t('payroll.form.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PayrollScreen() {
  const { t } = useTranslation('employees');
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const insets = useSafeAreaInsets();

  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;
  const fontSemi = fontLocale === 'arabic' ? Fonts.arabic.semibold : Fonts.latin.semibold;
  const fontBold = fontLocale === 'arabic' ? Fonts.arabic.bold : Fonts.latin.bold;

  const [selectedEmployee, setSelectedEmployee] = useState<SelectedParty | null>(null);
  const [showForm, setShowForm] = useState(false);

  const statementParams = selectedEmployee
    ? { partyType: 'EMPLOYEE' as const, partyId: selectedEmployee.id, limit: 100 }
    : null;

  const { data: statement, isLoading } = useStatement(statementParams);
  const createEntry = useCreateEntry();
  const deleteEntry = useDeleteEntry();

  const payrollEntries = useMemo(
    () => (statement?.items ?? []).filter((e) => PAYROLL_TYPES.includes(e.entryType)),
    [statement],
  );

  const summary = useMemo(() => {
    const abs = (e: LedgerEntry) => Math.abs(toFloat(e.signedAmount));
    const salaries = payrollEntries
      .filter((e) => e.entryType === 'SALARY_PAYMENT')
      .reduce((s, e) => s + abs(e), 0);
    const advances = payrollEntries
      .filter((e) => e.entryType === 'ADVANCE')
      .reduce((s, e) => s + abs(e), 0);
    const deductions = payrollEntries
      .filter((e) => e.entryType === 'DEDUCTION')
      .reduce((s, e) => s + abs(e), 0);
    return { salaries, advances, deductions, net: salaries - advances - deductions };
  }, [payrollEntries]);

  const handleAdd = useCallback(
    async (type: LedgerEntryType, amount: number, date: string, note: string) => {
      if (!selectedEmployee) return;
      const signedAmount = computeSignedAmount(amount, 'EMPLOYEE', type);
      try {
        await createEntry.mutateAsync({
          partyType: 'EMPLOYEE',
          partyId: selectedEmployee.id,
          entryType: type,
          signedAmount,
          entryDate: date,
          note: note || undefined,
        });
        setShowForm(false);
        Alert.alert('', t('payroll.messages.createSuccess'));
      } catch {
        Alert.alert('', t('payroll.messages.createError'));
      }
    },
    [selectedEmployee, createEntry, t],
  );

  const handleDelete = useCallback(
    (entryId: string) => {
      Alert.alert('', t('payroll.messages.deleteConfirm'), [
        { text: t('delete.cancel'), style: 'cancel' },
        {
          text: t('delete.confirm'),
          style: 'destructive',
          onPress: () =>
            deleteEntry
              .mutateAsync({ entryId, partyId: selectedEmployee?.id ?? '' })
              .catch(() => Alert.alert('', t('payroll.messages.deleteError'))),
        },
      ]);
    },
    [deleteEntry, selectedEmployee, t],
  );

  const renderEntry = useCallback(
    ({ item }: { item: LedgerEntry }) => (
      <EntryRow
        entry={item}
        typeLabel={t(`payroll.entryTypes.${item.entryType}`)}
        palette={palette}
        fontReg={fontReg}
        fontSemi={fontSemi}
        isRTL={isRTL}
        onDelete={handleDelete}
      />
    ),
    [palette, fontReg, fontSemi, isRTL, handleDelete, t],
  );

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Spacing[4]) + Spacing[2],
            backgroundColor: PAYROLL_ACCENT,
          },
        ]}
      >
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="2xl" style={{ color: Colors.white }}>
            {t('payroll.title')}
          </ZText>
          {selectedEmployee && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Employee Combobox */}
        <View style={styles.comboboxWrap}>
          <PartyCombobox
            partyType="EMPLOYEE"
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            placeholder={t('payroll.selectHint')}
          />
        </View>
      </View>

      {/* Content */}
      {!selectedEmployee ? (
        <View style={styles.emptyHint}>
          <Ionicons name="person-circle-outline" size={48} color={palette.textMuted} />
          <Text style={[styles.emptyHintText, { color: palette.textMuted, fontFamily: fontReg }]}>
            {t('payroll.selectHint')}
          </Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: Spacing[8] }} color={PAYROLL_ACCENT} />
      ) : (
        <FlatList
          data={payrollEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.summaryRow}>
              <SummaryCard
                label={t('payroll.summary.salaryPayments')}
                value={summary.salaries}
                color="#16a34a"
                palette={palette}
                fontReg={fontReg}
                fontBold={fontBold}
              />
              <SummaryCard
                label={t('payroll.summary.advances')}
                value={summary.advances}
                color="#dc2626"
                palette={palette}
                fontReg={fontReg}
                fontBold={fontBold}
              />
              <SummaryCard
                label={t('payroll.summary.deductions')}
                value={summary.deductions}
                color="#d97706"
                palette={palette}
                fontReg={fontReg}
                fontBold={fontBold}
              />
              <SummaryCard
                label={t('payroll.summary.net')}
                value={summary.net}
                color={summary.net >= 0 ? '#16a34a' : '#dc2626'}
                palette={palette}
                fontReg={fontReg}
                fontBold={fontBold}
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <Ionicons name="document-outline" size={40} color={palette.textMuted} />
              <Text style={[styles.listEmptyText, { color: palette.textMuted, fontFamily: fontReg }]}>
                {t('payroll.empty.title')}
              </Text>
              <Text style={[styles.listEmptyDesc, { color: palette.textMuted, fontFamily: fontReg }]}>
                {t('payroll.empty.desc')}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Entry Form */}
      <AddEntryForm
        visible={showForm}
        saving={createEntry.isPending}
        palette={palette}
        fontReg={fontReg}
        fontSemi={fontSemi}
        isRTL={isRTL}
        t={t}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[1],
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboboxWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },

  // Empty hint
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPadding,
    gap: Spacing[3],
  },
  emptyHintText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    paddingBottom: Spacing[3],
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    gap: Spacing[1],
    ...Shadows.xs,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: FontSize.lg,
  },

  // List
  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[4],
    paddingBottom: Spacing[10],
  },
  listEmpty: {
    alignItems: 'center',
    paddingTop: Spacing[8],
    gap: Spacing[2],
  },
  listEmptyText: {
    fontSize: FontSize.base,
  },
  listEmptyDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },

  // Entry row
  entryRow: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing[3],
  },
  entryIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMeta: {
    flex: 1,
    gap: Spacing[0.5],
  },
  entryType: { fontSize: FontSize.sm },
  entryNote: { fontSize: FontSize.xs },
  entryDate: { fontSize: FontSize.xs },
  entryAmount: { fontSize: FontSize.sm },

  // Form sheet
  formSheet: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Platform.OS === 'ios' ? Spacing[5] : Spacing[5],
  },
  formTitle: { fontSize: FontSize.lg },
  formBody: {
    flex: 1,
    padding: Spacing[5],
    gap: Spacing[3],
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: -Spacing[1],
  },
  input: {
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.base,
  },
  noteInput: {
    height: 80,
    paddingTop: Spacing[3],
    textAlignVertical: 'top',
  },
  typeTabs: {
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  typeTab: {
    flex: 1,
    minWidth: '28%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing[2],
    alignItems: 'center',
  },
  typeTabText: { fontSize: FontSize.sm },
  submitBtn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[2],
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSize.base,
  },
});
