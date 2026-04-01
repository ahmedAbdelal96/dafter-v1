/**
 * InvoiceDetail — Slide-up modal with full invoice details + workflow actions.
 *
 * P1-FE-2 Features:
 *   F2.1  Status badge with colours (DRAFT=grey, PENDING=amber, APPROVED=green,
 *          REJECTED=red, CANCELLED=muted)
 *   F2.2  Quick action buttons by status:
 *          DRAFT      → [اعتماد مباشر] [رفع للاعتماد] [حذف]
 *          PENDING    → [موافقة] [رفض]
 *          APPROVED   → [تسجيل دفعة] [إلغاء]
 *   F2.3  Permission-aware (currently all shown; hook in permissionsGuard if needed)
 *   F2.4  Confirm dialog before Approve / Reject / Cancel
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { ZInput } from '@/components/ui/ZInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  useInvoice,
  useDeleteInvoice,
  useSubmitInvoice,
  useApproveInvoice,
  useRejectInvoice,
  useCancelInvoice,
  useRecordInvoicePayment,
} from '../hooks/useInvoices';
import {
  toFloat,
  formatDate,
  INVOICE_ACCENT,
  STATUS_CONFIG,
} from '../types';

// ─── Confirm action types ─────────────────────────────────────────────────────

type ConfirmAction = 'submit' | 'approve' | 'reject' | 'cancel' | 'delete' | null;

function extractFirstApiMessage(error: unknown): string | null {
  const raw = (error as any)?.response?.data?.message;
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]);
  if (typeof raw === 'string') return raw;
  return null;
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.infoRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: palette.border },
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      <View
        style={[styles.infoIcon, { backgroundColor: `${INVOICE_ACCENT}18` }]}
      >
        <Ionicons name={icon} size={15} color={INVOICE_ACCENT} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ZText
          size="xs"
          variant="secondary"
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {label}
        </ZText>
        <ZText
          size="sm"
          weight="medium"
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {value}
        </ZText>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface InvoiceDetailProps {
  visible: boolean;
  invoiceId: string | null;
  onClose: () => void;
}

export function InvoiceDetail({
  visible,
  invoiceId,
  onClose,
}: InvoiceDetailProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const palette = isDark ? Colors.dark : Colors.light;

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const { data: invoice, isLoading } = useInvoice(invoiceId);

  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();
  const { mutate: submitInvoice, isPending: isSubmitting } = useSubmitInvoice();
  const { mutate: approveInvoice, isPending: isApproving } = useApproveInvoice();
  const { mutate: rejectInvoice, isPending: isRejecting } = useRejectInvoice();
  const { mutate: cancelInvoice, isPending: isCancelling } = useCancelInvoice();
  const { mutate: recordPayment, isPending: isRecording } = useRecordInvoicePayment();

  const isBusy =
    isDeleting || isSubmitting || isApproving || isRejecting || isCancelling || isRecording;

  if (!visible) return null;

  const statusCfg = invoice
    ? (STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.DRAFT)
    : null;
  const total = toFloat(invoice?.totalAmount);
  const paid = toFloat(invoice?.paidAmount);
  const remaining = total - paid;

  // ── Confirm dialog message ───────────────────────────────────────────────

  function confirmTitle(): string {
    switch (confirmAction) {
      case 'submit':  return t('actions.submitTitle');
      case 'approve': return t('actions.approveTitle');
      case 'reject':  return t('actions.rejectTitle');
      case 'cancel':  return t('actions.cancelTitle');
      case 'delete':  return t('delete.title');
      default:        return '';
    }
  }

  function confirmMessage(): string {
    switch (confirmAction) {
      case 'submit':  return t('actions.submitMessage');
      case 'approve': return t('actions.approveMessage');
      case 'reject':  return t('actions.rejectMessage');
      case 'cancel':  return t('actions.cancelMessage');
      case 'delete':  return t('delete.message');
      default:        return '';
    }
  }

  function handleConfirm() {
    if (!invoiceId) return;
    const cb = { onSuccess: () => { setConfirmAction(null); onClose(); }, onError: () => setConfirmAction(null) };
    switch (confirmAction) {
      case 'submit':  return submitInvoice(invoiceId, cb);
      case 'approve': return approveInvoice(invoiceId, cb);
      case 'reject':  return rejectInvoice(invoiceId, cb);
      case 'cancel':  return cancelInvoice(invoiceId, cb);
      case 'delete':
        return deleteInvoice(invoiceId, {
          onSuccess: () => { setConfirmAction(null); onClose(); },
          onError: () => setConfirmAction(null),
        });
    }
  }

  function handleRecordPayment() {
    const amount = toFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError(t('actions.paymentAmountRequired'));
      return;
    }
    if (amount > remaining + 0.001) {
      setPaymentError(t('actions.paymentExceedsRemaining'));
      return;
    }
    recordPayment(
      { id: invoiceId!, dto: { amount } },
      {
        onSuccess: () => {
          setShowPaymentInput(false);
          setPaymentAmount('');
          setPaymentError('');
        },
        onError: (error) =>
          setPaymentError(extractFirstApiMessage(error) || t('actions.paymentFailed')),
      },
    );
  }

  return (
    <>
      <ZModal visible={visible} onClose={onClose} title={t('detail.title')}>
        {isLoading || !invoice ? (
          <View style={styles.loadingContent}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <Skeleton width={32} height={32} borderRadius={10} />
                <View style={{ flex: 1, gap: Spacing[1] }}>
                  <Skeleton width={80} height={11} borderRadius={5} />
                  <Skeleton width={140} height={14} borderRadius={6} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero ── */}
            <View
              style={[styles.hero, { backgroundColor: `${INVOICE_ACCENT}10` }]}
            >
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: `${INVOICE_ACCENT}20` },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={26}
                  color={INVOICE_ACCENT}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <ZText
                  weight="bold"
                  style={{ fontSize: 22, color: INVOICE_ACCENT }}
                >
                  {total.toLocaleString('ar-SA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </ZText>
                <View
                  style={[
                    styles.heroMeta,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <ZText
                    size="sm"
                    weight="medium"
                    style={{ color: palette.textSecondary }}
                  >
                    {invoice.invoiceNumber}
                  </ZText>
                  {/* F2.1 — status badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusCfg!.bg },
                    ]}
                  >
                    <ZText size="xs" style={{ color: statusCfg!.color }}>
                      {t(`status.${invoice.status}`)}
                    </ZText>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Info card ── */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark
                    ? Colors.dark.surface
                    : palette.surfaceSecondary,
                },
              ]}
            >
              <InfoRow
                icon="person-outline"
                label={t('detail.customer')}
                value={invoice.customer?.name ?? '—'}
              />
              <InfoRow
                icon="calendar-outline"
                label={t('detail.issuedAt')}
                value={formatDate(invoice.issueDate)}
              />
              {invoice.dueDate && (
                <InfoRow
                  icon="time-outline"
                  label={t('detail.dueDate')}
                  value={formatDate(invoice.dueDate)}
                />
              )}
              {paid > 0 && (
                <InfoRow
                  icon="cash-outline"
                  label={t('detail.paid')}
                  value={`${paid.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} / ${total.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}`}
                />
              )}
              {invoice.notes && (
                <InfoRow
                  icon="document-text-outline"
                  label={t('detail.notes')}
                  value={invoice.notes}
                  isLast
                />
              )}
            </View>

            {/* ── Items section ── */}
            <ZText
              weight="medium"
              size="sm"
              style={{ color: palette.textSecondary }}
            >
              {t('detail.items')} ({invoice.items.length})
            </ZText>

            <View
              style={[
                styles.itemsCard,
                {
                  backgroundColor: isDark
                    ? Colors.dark.surface
                    : palette.surfaceSecondary,
                },
              ]}
            >
              {invoice.items.map((item, idx) => {
                const qty = toFloat(item.quantity);
                const price = toFloat(item.unitPrice);
                const lineTotal = toFloat(item.totalPrice);
                const isLast = idx === invoice.items.length - 1;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      !isLast && {
                        borderBottomWidth: 1,
                        borderBottomColor: palette.border,
                      },
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <ZText
                        size="sm"
                        weight="medium"
                        style={{
                          color: palette.text,
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {item.description}
                      </ZText>
                      <ZText
                        size="xs"
                        variant="secondary"
                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                      >
                        {qty.toLocaleString('ar-SA')} ×{' '}
                        {price.toLocaleString('ar-SA', {
                          minimumFractionDigits: 2,
                        })}
                      </ZText>
                    </View>
                    <ZText
                      size="sm"
                      weight="bold"
                      style={{ color: INVOICE_ACCENT }}
                    >
                      {lineTotal.toLocaleString('ar-SA', {
                        minimumFractionDigits: 2,
                      })}
                    </ZText>
                  </View>
                );
              })}

              <View
                style={[
                  styles.totalRow,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    borderTopColor: palette.border,
                  },
                ]}
              >
                <ZText weight="bold" style={{ color: palette.text }}>
                  {t('form.total')}
                </ZText>
                <ZText
                  weight="bold"
                  style={{ color: INVOICE_ACCENT, fontSize: 16 }}
                >
                  {total.toLocaleString('ar-SA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </ZText>
              </View>
            </View>

            {/* ── F2.2: Workflow action buttons ── */}
            <WorkflowActions
              status={invoice.status}
              isRTL={isRTL}
              isBusy={isBusy}
              showPaymentInput={showPaymentInput}
              paymentAmount={paymentAmount}
              paymentError={paymentError}
              onSetPaymentAmount={(v) => {
                setPaymentAmount(v);
                if (paymentError) setPaymentError('');
              }}
              onSubmit={() => setConfirmAction('submit')}
              onApprove={() => setConfirmAction('approve')}
              onReject={() => setConfirmAction('reject')}
              onCancel={() => setConfirmAction('cancel')}
              onDelete={() => setConfirmAction('delete')}
              onShowPayment={() => setShowPaymentInput(true)}
              onRecordPayment={handleRecordPayment}
              isRecording={isRecording}
              t={t}
            />
          </ScrollView>
        )}
      </ZModal>

      {/* F2.4 — Confirm dialog */}
      <ZConfirmDialog
        visible={!!confirmAction}
        title={confirmTitle()}
        message={confirmMessage()}
        confirmLabel={confirmTitle()}
        variant={confirmAction === 'delete' || confirmAction === 'reject' || confirmAction === 'cancel' ? 'danger' : 'primary'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={isBusy}
      />
    </>
  );
}

// ─── WorkflowActions sub-component ───────────────────────────────────────────

interface WorkflowActionsProps {
  status: string;
  isRTL: boolean;
  isBusy: boolean;
  showPaymentInput: boolean;
  paymentAmount: string;
  paymentError: string;
  onSetPaymentAmount: (v: string) => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onShowPayment: () => void;
  onRecordPayment: () => void;
  isRecording: boolean;
  t: (k: string) => string;
}

function WorkflowActions({
  status,
  isRTL,
  isBusy,
  showPaymentInput,
  paymentAmount,
  paymentError,
  onSetPaymentAmount,
  onSubmit,
  onApprove,
  onReject,
  onCancel,
  onDelete,
  onShowPayment,
  onRecordPayment,
  isRecording,
  t,
}: WorkflowActionsProps) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  if (status === 'DRAFT') {
    return (
      <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ZButton onPress={onSubmit} disabled={isBusy} style={{ flex: 1 }}>
          {t('actions.submit')}
        </ZButton>
        <ZButton
          variant="outline"
          onPress={onApprove}
          disabled={isBusy}
          style={{ flex: 1 }}
        >
          {t('actions.approveDirect')}
        </ZButton>
        <ZButton
          variant="danger"
          onPress={onDelete}
          disabled={isBusy}
        >
          {t('delete.title')}
        </ZButton>
      </View>
    );
  }

  if (status === 'PENDING_APPROVAL') {
    return (
      <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <ZButton onPress={onApprove} disabled={isBusy} style={{ flex: 1 }}>
          {t('actions.approve')}
        </ZButton>
        <ZButton
          variant="danger"
          onPress={onReject}
          disabled={isBusy}
          style={{ flex: 1 }}
        >
          {t('actions.reject')}
        </ZButton>
      </View>
    );
  }

  if (status === 'APPROVED') {
    return (
      <View style={styles.actionsCol}>
        {/* Record payment inline input */}
        {showPaymentInput ? (
          <View style={styles.paymentRow}>
            <ZInput
              label={t('actions.paymentAmount')}
              placeholder="0.00"
              value={paymentAmount}
              onChangeText={onSetPaymentAmount}
              keyboardType="decimal-pad"
              textAlign={isRTL ? 'right' : 'left'}
              error={paymentError}
            />
            <ZButton
              onPress={onRecordPayment}
              loading={isRecording}
              disabled={isBusy}
              fullWidth
            >
              {t('actions.confirmPayment')}
            </ZButton>
          </View>
        ) : (
          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ZButton onPress={onShowPayment} disabled={isBusy} style={{ flex: 1 }}>
              {t('actions.recordPayment')}
            </ZButton>
            <ZButton
              variant="danger"
              onPress={onCancel}
              disabled={isBusy}
              style={{ flex: 1 }}
            >
              {t('actions.cancel')}
            </ZButton>
          </View>
        )}
      </View>
    );
  }

  // REJECTED or CANCELLED — no actions except information
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContent: { padding: Spacing[4], gap: Spacing[4] },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  content: { padding: Spacing[4], gap: Spacing[3], paddingBottom: Spacing[6] },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    borderRadius: Radius.xl,
    padding: Spacing[4],
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: { alignItems: 'center', gap: Spacing[2] },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  infoCard: { borderRadius: Radius.xl, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsCard: { borderRadius: Radius.xl, overflow: 'hidden' },
  itemRow: {
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  totalRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderTopWidth: 1,
  },
  actions: {
    gap: Spacing[2],
    alignItems: 'center',
  },
  actionsCol: {
    gap: Spacing[2],
  },
  paymentRow: {
    gap: Spacing[2],
  },
});
