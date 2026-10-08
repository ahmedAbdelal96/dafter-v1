/**
 * ContractDetail — Full-screen slide-up sheet for a single installment contract.
 *
 * Layout:
 *   ┌──────── Hero Header (green) ──────────────────────────┐
 *   │  CNT-2026-0001              [StatusBadge]             │
 *   │  Party Name · Type                                    │
 *   │  Total: 10,000  Paid: 2,000  Remaining: 8,000         │
 *   ├──────── White Card ────────────────────────────────────┤
 *   │  ProgressBar                                          │
 *   │  InfoRows: party, startDate, scheduleType, description│
 *   │  Payment Schedule list (ScheduleRow × N)             │
 *   │  [Cancel Contract] (danger, OWNER only)               │
 *   └───────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
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
import ScheduleRow from './ScheduleRow';
import { RecordInstallmentPaymentForm } from './RecordInstallmentPaymentForm';
import {
  useDetailInstallment,
  useCancelInstallment,
} from '../hooks/useInstallments';
import {
  toFloat,
  INSTALLMENT_ACCENT,
  CONTRACT_STATUS_CONFIG,
  type InstallmentSchedule,
} from '../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractDetailProps {
  visible: boolean;
  contractId: string | null;
  onClose: () => void;
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  iconColor = INSTALLMENT_ACCENT,
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
        <ZText
          size="sm"
          weight="medium"
          style={[{ textAlign: isRTL ? 'right' : 'left' }, valueColor ? { color: valueColor } : {}]}
        >
          {value}
        </ZText>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContractDetail({ visible, contractId, onClose }: ContractDetailProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('installments');
  const { user } = useAuth();
  const palette = isDark ? Colors.dark : Colors.light;

  const [activeSchedule, setActiveSchedule] = useState<InstallmentSchedule | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: contract, isLoading } = useDetailInstallment(contractId);
  const { mutate: cancelContract, isPending: isCancelling } = useCancelInstallment();

  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';
  const canCancel = contract?.status === 'ACTIVE' || contract?.status === 'OVERDUE';

  const statusCfg = contract ? CONTRACT_STATUS_CONFIG[contract.status] : null;
  const statusColor = statusCfg ? (isDark ? statusCfg.darkColor : statusCfg.color) : '#fff';
  const statusBg    = statusCfg ? (isDark ? statusCfg.darkBgColor : statusCfg.bgColor) : 'transparent';

  const total     = contract ? toFloat(contract.totalAmount) : 0;
  const paid      = contract ? toFloat(contract.paidAmount) : 0;
  const remaining = Math.max(0, total - paid);
  const progress  = total > 0 ? Math.min(1, paid / total) : 0;

  const barColor =
    !contract ? INSTALLMENT_ACCENT :
    contract.status === 'COMPLETED' ? '#2563eb' :
    contract.status === 'OVERDUE'   ? '#dc2626' :
    INSTALLMENT_ACCENT;

  function handleCancel() {
    if (!contractId) return;
    cancelContract(contractId, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        onClose();
      },
    });
  }

  return (
    <>
      <ZModal visible={visible} onClose={onClose} animationType="slide">
        {isLoading || !contract ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={INSTALLMENT_ACCENT} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* ── Hero Header ─────────────────────────────────────── */}
            <View style={[styles.hero, { backgroundColor: INSTALLMENT_ACCENT }]}>
              {/* Contract number + status */}
              <View
                style={[styles.heroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <ZText weight="bold" size="lg" style={styles.heroRef}>
                  {contract.contractNumber}
                </ZText>
                <View style={[styles.heroBadge, { backgroundColor: statusBg }]}>
                  <ZText size="xs" style={{ color: statusColor, fontWeight: '600' }}>
                    {t(`contractStatus.${contract.status}`)}
                  </ZText>
                </View>
              </View>

              {/* Party name */}
              {contract.partyName && (
                <ZText style={[styles.heroParty, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {contract.partyName}
                  {' · '}
                  {t(`partyType.${contract.partyType}`)}
                </ZText>
              )}

              {/* KPI row */}
              <View
                style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={styles.kpiItem}>
                  <ZText size="xs" style={styles.kpiLabel}>{t('detail.totalAmount')}</ZText>
                  <ZText weight="bold" style={styles.kpiValue}>{formatMoney(total)}</ZText>
                </View>
                <View style={[styles.kpiDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.kpiItem}>
                  <ZText size="xs" style={styles.kpiLabel}>{t('detail.paidAmount')}</ZText>
                  <ZText weight="bold" style={styles.kpiValue}>{formatMoney(paid)}</ZText>
                </View>
                <View style={[styles.kpiDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.kpiItem}>
                  <ZText size="xs" style={styles.kpiLabel}>{t('detail.remainingAmount')}</ZText>
                  <ZText
                    weight="bold"
                    style={[styles.kpiValue, remaining === 0 && { color: '#86efac' }]}
                  >
                    {formatMoney(remaining)}
                  </ZText>
                </View>
              </View>
            </View>

            {/* ── Content Card (overlaps hero) ──────────────────────── */}
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
                <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(progress * 100)}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
                <ZText size="xs" variant="secondary" style={{ marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                  {`${Math.round(progress * 100)}%`}
                </ZText>
              </View>

              {/* Info rows */}
              <View style={[styles.section, styles.infoBlock]}>
                <InfoRow
                  icon="calendar-outline"
                  label={t('detail.startDate')}
                  value={formatDate(contract.startDate)}
                />
                <InfoRow
                  icon="layers-outline"
                  label={t('detail.scheduleType')}
                  value={t(`scheduleType.${contract.scheduleType}`)}
                />
                <InfoRow
                  icon="people-outline"
                  label={t('detail.party')}
                  value={`${contract.partyName ?? contract.partyId} (${t(`partyType.${contract.partyType}`)})`}
                />
                {contract.description && (
                  <InfoRow
                    icon="document-text-outline"
                    label={t('detail.description')}
                    value={contract.description}
                    isLast
                  />
                )}
              </View>

              {/* Schedule timeline */}
              <View style={styles.section}>
                <ZText weight="bold" size="sm" style={styles.sectionTitle}>
                  {t('detail.schedule')}
                  {contract.schedules.length > 0 && (
                    <ZText variant="secondary" size="sm">
                      {`  (${contract.schedules.length})`}
                    </ZText>
                  )}
                </ZText>

                {contract.schedules.length === 0 ? (
                  <View style={styles.emptyBlock}>
                    <Ionicons name="calendar-outline" size={28} color={palette.textMuted} />
                    <ZText variant="secondary" size="sm">{t('payment.empty')}</ZText>
                  </View>
                ) : (
                  <View style={[styles.infoBlock, { borderWidth: 1, borderColor: palette.border, borderRadius: Radius.lg, overflow: 'hidden' }]}>
                    {contract.schedules.map((sched, idx) => (
                      <ScheduleRow
                        key={sched.id}
                        schedule={sched}
                        onPay={
                          contract.status !== 'CANCELLED' && contract.status !== 'COMPLETED'
                            ? setActiveSchedule
                            : undefined
                        }
                        isLast={idx === contract.schedules.length - 1}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Cancel — OWNER only, only if active/overdue */}
              {isOwner && canCancel && (
                <View style={styles.section}>
                  <ZButton
                    variant="danger"
                    onPress={() => setShowCancelConfirm(true)}
                    loading={isCancelling}
                    fullWidth
                  >
                    {t('detail.cancelContract')}
                  </ZButton>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </ZModal>

      {/* Record payment sheet */}
      {contract && activeSchedule && (
        <RecordInstallmentPaymentForm
          visible={!!activeSchedule}
          onClose={() => setActiveSchedule(null)}
          contract={contract}
          schedule={activeSchedule}
        />
      )}

      {/* Cancel confirm */}
      <ZConfirmDialog
        visible={showCancelConfirm}
        title={t('detail.cancelContract')}
        message={t('detail.cancelConfirm')}
        confirmLabel={t('detail.cancelContract')}
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
  heroBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
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
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: Spacing[6],
    gap: Spacing[2],
  },
});
