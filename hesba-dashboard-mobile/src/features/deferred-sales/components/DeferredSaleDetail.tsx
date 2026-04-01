/**
 * DeferredSaleDetail — Full-screen slide-up sheet for a single deferred sale.
 *
 * Layout:
 *   ┌──────── Hero Header (violet) ────────────┐
 *   │  [Back]  DEF-2024-001    [StatusBadge]   │
 *   │  Party Name                              │
 *   │  Total: 5,000   Paid: 3,000   Due date   │
 *   ├──────── White ScrollView card ───────────┤
 *   │  ProgressBar                             │
 *   │  InfoRows: party, description, method    │
 *   │  [Record Payment btn] [Invoice btn]      │
 *   │  Payment History list                    │
 *   │  [Cancel Sale] (danger, owner only)      │
 *   └──────────────────────────────────────────┘
 *
 * Uses ZModal with animationType="slide" (full-screen).
 * Fetches detail lazily when `saleId` is set (enabled flag).
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { useAuth } from '@/stores/auth-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { PaymentRow } from './PaymentRow';
import { RecordPaymentForm } from './RecordPaymentForm';
import { useDetailDeferredSale, useCancelDeferredSale } from '../hooks/useDeferredSales';
import {
  toFloat,
  DEFERRED_ACCENT,
  DEFERRED_ACCENT_DARK,
  type DeferredSale,
} from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeferredSaleDetailProps {
  visible: boolean;
  saleId: string | null;
  onClose: () => void;
  /** Called after successful invoice creation navigation */
  onCreateInvoice?: (saleId: string) => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatMoney(value: string | number): string {
  const n = toFloat(value);
  return n.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── InfoRow sub-component ────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  iconColor = DEFERRED_ACCENT,
  valueColor,
  isLast = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  iconColor?: string;
  valueColor?: string;
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
      <View style={[styles.infoIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.infoText}>
        <ZText size="xs" variant="secondary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {label}
        </ZText>
        <ZText size="sm" weight="medium" style={[{ textAlign: isRTL ? 'right' : 'left' }, valueColor ? { color: valueColor } : {}]}>
          {value}
        </ZText>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeferredSaleDetail({
  visible,
  saleId,
  onClose,
  onCreateInvoice,
}: DeferredSaleDetailProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('deferredSales');
  const { user } = useAuth();
  const palette = isDark ? Colors.dark : Colors.light;

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: sale, isLoading } = useDetailDeferredSale(saleId);
  const { mutate: cancelSale, isPending: isCancelling } = useCancelDeferredSale();

  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';
  const canPay = sale?.status !== 'PAID' && sale?.status !== 'OVERDUE';
  // OVERDUE can still receive payments (just marked as late)
  const canReceivePayment = sale?.status !== 'PAID';

  function handleCancel() {
    if (!saleId) return;
    cancelSale(saleId, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        onClose();
      },
    });
  }

  return (
    <>
      <ZModal
        visible={visible}
        onClose={onClose}
        animationType="slide"
      >
        {isLoading || !sale ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={DEFERRED_ACCENT} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* ── Hero Header ──────────────────────────────────────── */}
            <View style={[styles.hero, { backgroundColor: DEFERRED_ACCENT }]}>
              {/* Reference + Badge */}
              <View
                style={[
                  styles.heroTopRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <ZText
                  weight="bold"
                  size="lg"
                  style={styles.heroRef}
                >
                  {sale.referenceNumber}
                </ZText>
                <StatusBadge status={sale.status} />
              </View>

              {/* Party name */}
              {sale.partyName && (
                <ZText style={[styles.heroParty, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {sale.partyName}
                  {' · '}
                  {t(`partyType.${sale.partyType}`)}
                </ZText>
              )}

              {/* KPI row */}
              <View
                style={[
                  styles.kpiRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={styles.kpiItem}>
                  <ZText size="xs" style={styles.kpiLabel}>{t('detail.totalAmount')}</ZText>
                  <ZText weight="bold" style={styles.kpiValue}>
                    {formatMoney(sale.totalAmount)}
                  </ZText>
                </View>
                <View style={[styles.kpiDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.kpiItem}>
                  <ZText size="xs" style={styles.kpiLabel}>{t('detail.paidAmount')}</ZText>
                  <ZText weight="bold" style={styles.kpiValue}>
                    {formatMoney(sale.paidAmount)}
                  </ZText>
                </View>
                <View style={[styles.kpiDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.kpiItem}>
                  <ZText size="xs" style={styles.kpiLabel}>{t('detail.remainingAmount')}</ZText>
                  <ZText
                    weight="bold"
                    style={[
                      styles.kpiValue,
                      toFloat(sale.remaining) === 0 && { color: '#86efac' },
                    ]}
                  >
                    {formatMoney(sale.remaining)}
                  </ZText>
                </View>
              </View>
            </View>

            {/* ── Content Card (overlaps hero) ─────────────────────── */}
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.dark.surface : Colors.white },
              ]}
            >
              {/* Progress */}
              <View style={styles.section}>
                <ZText size="xs" variant="secondary" style={{ marginBottom: Spacing[2] }}>
                  {t('detail.progress')}
                </ZText>
                <ProgressBar
                  totalAmount={sale.totalAmount}
                  paidAmount={sale.paidAmount}
                  status={sale.status}
                />
              </View>

              {/* Info rows */}
              <View style={[styles.section, styles.infoBlock]}>
                <InfoRow
                  icon="calendar-outline"
                  label={t('detail.dueDate')}
                  value={formatDate(sale.dueDate)}
                  iconColor={sale.status === 'OVERDUE' ? '#dc2626' : DEFERRED_ACCENT}
                  valueColor={sale.status === 'OVERDUE' ? '#dc2626' : undefined}
                />
                {sale.description && (
                  <InfoRow
                    icon="document-text-outline"
                    label={t('detail.description')}
                    value={sale.description}
                  />
                )}
                <InfoRow
                  icon="people-outline"
                  label={t('detail.party')}
                  value={`${sale.partyName ?? sale.partyId} (${t(`partyType.${sale.partyType}`)})`}
                  isLast
                />
              </View>

              {/* Actions */}
              <View style={[styles.section, styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {canReceivePayment && (
                  <ZButton
                    onPress={() => setShowPaymentForm(true)}
                    style={styles.actionBtn}
                  >
                    {t('payment.title')}
                  </ZButton>
                )}
                {onCreateInvoice && sale.status !== 'PAID' && (
                  <ZButton
                    variant="outline"
                    onPress={() => onCreateInvoice(sale.id)}
                    style={styles.actionBtn}
                  >
                    {t('detail.createInvoice')}
                  </ZButton>
                )}
              </View>

              {/* Payment History */}
              <View style={styles.section}>
                <ZText weight="bold" size="sm" style={styles.sectionTitle}>
                  {t('detail.payments')}
                  {sale.payments.length > 0 && (
                    <ZText variant="secondary" size="sm">{`  (${sale.payments.length})`}</ZText>
                  )}
                </ZText>

                {sale.payments.length === 0 ? (
                  <View style={styles.emptyPayments}>
                    <Ionicons name="receipt-outline" size={28} color={palette.textMuted} />
                    <ZText variant="secondary" size="sm">{t('payment.empty')}</ZText>
                  </View>
                ) : (
                  [...sale.payments]
                    .sort(
                      (a, b) =>
                        new Date(a.paymentDate).getTime() -
                        new Date(b.paymentDate).getTime(),
                    )
                    .map((payment, index) => (
                      <PaymentRow key={payment.id} payment={payment} index={index} />
                    ))
                )}
              </View>

              {/* Cancel Sale — OWNER only, not if already paid */}
              {isOwner && sale.status !== 'PAID' && (
                <View style={styles.section}>
                  <ZButton
                    variant="danger"
                    onPress={() => setShowCancelConfirm(true)}
                    loading={isCancelling}
                    fullWidth
                  >
                    {t('detail.cancelSale')}
                  </ZButton>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </ZModal>

      {/* Record Payment sheet */}
      {sale && (
        <RecordPaymentForm
          visible={showPaymentForm}
          onClose={() => setShowPaymentForm(false)}
          sale={sale}
        />
      )}

      {/* Cancel confirm dialog */}
      <ZConfirmDialog
        visible={showCancelConfirm}
        title={t('detail.cancelSale')}
        message={t('detail.cancelConfirm')}
        confirmLabel={t('detail.cancelSale')}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  scroll: {
    paddingBottom: Spacing[8],
  },
  hero: {
    paddingTop: Spacing[5],
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
  },
  heroTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRef: {
    color: '#fff',
    flex: 1,
  },
  heroParty: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  kpiRow: {
    marginTop: Spacing[2],
    gap: 0,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  kpiLabel: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  kpiValue: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 36,
    alignSelf: 'center',
  },
  card: {
    marginHorizontal: Spacing[4],
    marginTop: -Spacing[8],
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  section: {
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  infoBlock: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  sectionTitle: {
    marginBottom: Spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  actionRow: {
    gap: Spacing[3],
  },
  actionBtn: {
    flex: 1,
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: Spacing[6],
    gap: Spacing[2],
  },
});
