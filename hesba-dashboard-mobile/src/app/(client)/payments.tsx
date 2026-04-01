// PaymentCollection Screen — P2-FE-2
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { QUERY_KEYS, API_ENDPOINTS } from '@/lib/api/config';
import { apiClient } from '@/lib/api/client';
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';
import type { InvoiceListItem } from '@/features/invoices/types';
import { toFloat } from '@/features/invoices/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  allocatedAmount: number; 
}

async function fetchOpenInvoices(customerId: string): Promise<InvoiceListItem[]> {
  const res = await apiClient.get<{ data: InvoiceListItem[] }>(API_ENDPOINTS.invoices.list, {
    params: {
      partyId: customerId,
      partyType: 'CUSTOMER',
      status: 'APPROVED',
      limit: 50,
      page: 1,
    },
  });
  return (res.data.data as any[] ?? []).filter(
    (inv: any) => inv.invoicePaymentStatus === 'UNPAID' || inv.invoicePaymentStatus === 'PARTIAL',
  );
}

async function distributePayment(payload: {
  customerId: string;
  amount: number;
  invoiceIds?: string[];
  note?: string;
}) {
  await apiClient.post(API_ENDPOINTS.payments.distribute, payload);
}

export default function PaymentsScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation(['invoices', 'common']);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();

  const palette = isDark ? Colors.dark : Colors.light;

  // State
  const [customer, setCustomer] = useState<SelectedParty | null>(
    params.customerId && params.customerName
      ? { id: params.customerId, name: params.customerName }
      : null,
  );
  const [totalAmount, setTotalAmount] = useState('');
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [note, setNote] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showManualAllocation, setShowManualAllocation] = useState(false);

  // Fetch open invoices for chosen customer
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: [QUERY_KEYS.INVOICES, customer?.id, 'open'],
    queryFn: () => fetchOpenInvoices(customer!.id),
    enabled: !!customer?.id,
  });

  // Build rows when invoices loaded or total amount changes
  useEffect(() => {
    if (!invoices) return;
    const amount = parseFloat(totalAmount) || 0;

    // FIFO distribution
    let remaining = amount;
    const newRows: InvoiceRow[] = invoices.map((inv) => {
      const total = toFloat(inv.totalAmount);
      const paid = toFloat(inv.paidAmount);
      const invRemaining = total - paid;
      const allocated = Math.min(remaining, invRemaining);
      remaining = Math.max(0, remaining - allocated);
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: total,
        paidAmount: paid,
        remaining: invRemaining,
        allocatedAmount: allocated,
      };
    });
    setRows(newRows);
  }, [invoices, totalAmount]);

  useEffect(() => {
    setShowManualAllocation(false);
  }, [customer?.id, totalAmount]);

  const totalAllocated = rows.reduce((s, r) => s + r.allocatedAmount, 0);
  const totalAmountNum = parseFloat(totalAmount) || 0;
  const leftover = totalAmountNum - totalAllocated;

  // Mutation
  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      distributePayment({
        customerId: customer!.id,
        amount: totalAmountNum,
        invoiceIds: rows.filter((r) => r.allocatedAmount > 0).map((r) => r.invoiceId),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVOICES] });
      setTotalAmount('');
      setNote('');
      setRows([]);
      setShowConfirm(false);
    },
  });

  function handleRowAmountChange(idx: number, value: string) {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], allocatedAmount: parseFloat(value) || 0 };
    setRows(newRows);
  }

  const canSubmit =
    !!customer && totalAmountNum > 0 && rows.some((r) => r.allocatedAmount > 0);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Premium Header */}
      <View style={[styles.header, { 
        paddingTop: Math.max(insets.top, Spacing[4]) + Spacing[2],
        backgroundColor: isDark ? Colors.dark.surface : Colors.white,
        borderBottomColor: palette.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
      }]}>
        <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ZText weight="bold" size="2xl" style={{ color: palette.text }}>
            {t('nav.payments', 'المدفوعات')}
          </ZText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Customer picker */}
        <View style={styles.section}>
          <PartyCombobox
            partyType="CUSTOMER"
            value={customer}
            onChange={setCustomer}
            label={t('invoices:form.customer')}
            placeholder={t('invoices:form.customerPlaceholder')}
          />
        </View>

        <View
          style={[
            styles.flowIntroCard,
            {
              backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#eff6ff',
              borderColor: isDark ? '#1d4ed8' : '#bfdbfe',
            },
          ]}
        >
          <ZText weight="bold" size="sm" style={{ color: palette.text }}>
            {t('common:paymentsQuickFlowTitle', { defaultValue: 'Customer collection flow' })}
          </ZText>
          <ZText size="sm" variant="secondary">
            {t('common:paymentsQuickFlowDescription', {
              defaultValue:
                'Choose a customer, enter the amount, and let the app prepare the default invoice distribution for you.',
            })}
          </ZText>
        </View>

        {/* Total amount */}
        <View style={[styles.section, styles.amountRow]}>
          <ZText weight="medium" size="sm" style={{ color: palette.text }}>
            {t('invoices:actions.paymentAmount')}
          </ZText>
          <TextInput
            style={[
              styles.amountInput,
              {
                backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#fff',
                color: palette.text,
                borderColor: palette.border,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            value={totalAmount}
            onChangeText={setTotalAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={palette.textMuted}
          />
        </View>

        {/* Invoice distribution list */}
        {customer && (
          <View style={styles.section}>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc',
                  borderColor: palette.border,
                },
              ]}
            >
              <ZText weight="bold" size="sm" style={{ color: palette.text }}>
                {t('common:distributionSummary', { defaultValue: 'Distribution summary' })}
              </ZText>
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ZText size="xs" variant="secondary">
                  {t('common:applied', { defaultValue: 'Applied' })}
                </ZText>
                <ZText size="xs" weight="bold" style={{ color: palette.text }}>
                  {totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </ZText>
              </View>
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ZText size="xs" variant="secondary">
                  {t('common:remaining', { defaultValue: 'Remaining' })}
                </ZText>
                <ZText size="xs" weight="bold" style={{ color: leftover > 0.005 ? '#d97706' : Colors.brand.primary }}>
                  {leftover.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </ZText>
              </View>
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ZText size="xs" variant="secondary">
                  {t('common:affectedInvoices', { defaultValue: 'Invoices affected' })}
                </ZText>
                <ZText size="xs" weight="bold" style={{ color: palette.text }}>
                  {rows.filter((row) => row.allocatedAmount > 0).length}
                </ZText>
              </View>
              {rows.length > 0 ? (
                <TouchableOpacity
                  style={[styles.secondaryAction, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
                  onPress={() => setShowManualAllocation((current) => !current)}
                >
                  <ZText size="xs" weight="bold" style={{ color: Colors.brand.primary }}>
                    {showManualAllocation
                      ? t('common:hideManualAllocation', { defaultValue: 'Hide manual allocation' })
                      : t('common:adjustAllocation', { defaultValue: 'Adjust allocation manually' })}
                  </ZText>
                </TouchableOpacity>
              ) : null}
            </View>

            <ZText weight="medium" size="sm" style={{ marginBottom: Spacing[3], color: palette.textSecondary }}>
              {t('invoices:form.items')}
            </ZText>

            {loadingInvoices ? (
              <ActivityIndicator color={Colors.brand.primary} style={{ marginVertical: 24 }} />
            ) : rows.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc' }]}>
                <ZText variant="secondary" style={{ textAlign: 'center' }}>
                  {t('invoices:list.empty')}
                </ZText>
              </View>
            ) : showManualAllocation ? (
              rows.map((row, idx) => (
                <View
                  key={row.invoiceId}
                  style={[
                    styles.invoiceRow,
                    {
                      backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
                      borderColor: palette.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={styles.invInfo}>
                    <ZText weight="bold" size="sm" style={{ color: palette.text }}>
                      {row.invoiceNumber}
                    </ZText>
                    <ZText size="xs" variant="secondary">
                      {t('common:remaining')}: {row.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </ZText>
                  </View>
                  <TextInput
                    style={[
                      styles.rowInput,
                      {
                        backgroundColor: isDark ? Colors.dark.background : '#f8fafc',
                        color: row.allocatedAmount > 0 ? Colors.brand.primary : palette.text,
                        borderColor: row.allocatedAmount > 0 ? Colors.brand.primary : palette.border,
                      },
                    ]}
                    value={row.allocatedAmount > 0 ? String(row.allocatedAmount.toFixed(2)) : ''}
                    onChangeText={(v) => handleRowAmountChange(idx, v)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc' }]}>
                <ZText variant="secondary" style={{ textAlign: 'center' }}>
                  {t('common:autoDistributionReady', {
                    defaultValue: 'Automatic distribution is ready. Open manual allocation only if you need to adjust invoice amounts.',
                  })}
                </ZText>
              </View>
            )}
          </View>
        )}

        {/* Leftover */}
        {rows.length > 0 && (
          <View
            style={[
              styles.leftoverRow,
              {
                backgroundColor: leftover > 0.005 ? (isDark ? 'rgba(217, 119, 6, 0.1)' : '#fffbeb') : (isDark ? 'rgba(31, 122, 90, 0.1)' : '#dcfce7'),
                flexDirection: isRTL ? 'row-reverse' : 'row',
                borderColor: leftover > 0.005 ? (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7') : (isDark ? 'rgba(31, 122, 90, 0.2)' : '#bbf7d0'),
                borderWidth: 1,
              },
            ]}
          >
            <ZText size="sm" weight="medium" style={{ color: leftover > 0.005 ? '#d97706' : Colors.brand.primary }}>
              {t('common:remaining')}
            </ZText>
            <ZText size="sm" weight="bold" style={{ color: leftover > 0.005 ? '#d97706' : Colors.brand.primary }}>
              {leftover.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </ZText>
          </View>
        )}

        {/* Note */}
        <View style={styles.section}>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#fff',
                color: palette.text,
                borderColor: palette.border,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            value={note}
            onChangeText={setNote}
            placeholder={t('invoices:form.notesPlaceholder')}
            placeholderTextColor={palette.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit */}
        <View style={[styles.section, { paddingBottom: Spacing[8] }]}>
          <ZButton
            variant="primary"
            style={{ backgroundColor: Colors.brand.primary }}
            disabled={!canSubmit || isPending}
            loading={isPending}
            onPress={() => setShowConfirm(true)}
          >
            {t('invoices:actions.confirmPayment')}
          </ZButton>
        </View>

        <ZConfirmDialog
          visible={showConfirm}
          title={t('invoices:actions.confirmPayment')}
          message={`${t('invoices:actions.paymentAmount')}: ${totalAmountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          confirmLabel={t('invoices:actions.confirmPayment')}
          onConfirm={() => submit()}
          onCancel={() => setShowConfirm(false)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[4],
  },
  headerTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { padding: Spacing[4] },
  section: { marginBottom: Spacing[5] },
  flowIntroCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  amountRow: {
    gap: Spacing[2],
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  summaryRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryAction: {
    paddingTop: Spacing[1],
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    fontSize: 20,
    fontWeight: '700',
  },
  invoiceRow: {
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius.lg,
    marginBottom: Spacing[3],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  invInfo: { flex: 1, gap: 4 },
  rowInput: {
    width: 90,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[2],
    paddingVertical: Platform.OS === 'ios' ? Spacing[2] : 6,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  leftoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    borderRadius: Radius.lg,
    marginBottom: Spacing[4],
  },
  emptyCard: {
    paddingVertical: Spacing[8],
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    minHeight: 100,
  },
});
