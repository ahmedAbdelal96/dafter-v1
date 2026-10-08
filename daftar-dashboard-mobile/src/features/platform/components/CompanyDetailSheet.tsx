/**
 * CompanyDetailSheet — full company detail + subscription management.
 *
 * Sections:
 *   1. Company header (name, phone, status)
 *   2. Metrics (users/customers/suppliers/employees)
 *   3. Current subscription card (plan, status, dates)
 *   4. Action buttons based on current sub status:
 *      - No sub / Expired  → Activate
 *      - Active / Trial    → Extend | Suspend
 *      - Suspended         → Activate (re-activate)
 *   5. Company enable/disable
 *
 * Sub-modals: ActivateForm | ExtendForm | SuspendForm
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ZModal } from '@/components/ui/ZModal';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { ZInput } from '@/components/ui/ZInput';
import { ZDateInput } from '@/components/ui/ZDateInput';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, type ColorPalette } from '@/constants/theme';
import { PLATFORM_CAPABILITIES_FALLBACK } from '@/lib/api/config';
import { useCompanyMetrics, usePlans, usePlatformCapabilities } from '../hooks/usePlatform';
import {
  useActivateSubscription,
  useArchiveCompany,
  useChangePlan,
  useDeleteCompany,
  useSuspendSubscription,
  useExtendSubscription,
  useDisableCompany,
  useEnableCompany,
  useRestoreCompany,
  useUpdateCompany,
} from '../hooks/usePlatformMutations';
import { getPlatformUserErrorMessage } from '../utils/platform-errors';
import {
  PLATFORM_ACCENT,
  getSubStatusConfig,
  getActiveSubscription,
  type Company,
} from '../types';

type SubAction = 'activate' | 'extend' | 'suspend' | 'changePlan' | 'editCompany' | 'deleteCompany' | null;

interface Props {
  company: Company | null;
  visible: boolean;
  onClose: () => void;
}

export default function CompanyDetailSheet({ company, visible, onClose }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const router = useRouter();
  const palette = isDark ? Colors.dark : Colors.light;

  const [subAction, setSubAction] = useState<SubAction>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: metrics, isLoading: metricsLoading } = useCompanyMetrics(
    visible ? company?.id ?? null : null,
  );
  const { data: plans = [] } = usePlans();
  const { data: capabilities } = usePlatformCapabilities();
  const activePlans = plans.filter((p) => p.isActive);

  // ── Mutations ────────────────────────────────────────────────────────────
  const activateMutation = useActivateSubscription();
  const suspendMutation = useSuspendSubscription();
  const extendMutation = useExtendSubscription();
  const disableMutation = useDisableCompany();
  const enableMutation = useEnableCompany();
  const updateMutation = useUpdateCompany();
  const archiveMutation = useArchiveCompany();
  const restoreMutation = useRestoreCompany();
  const deleteMutation = useDeleteCompany();
  const changePlanMutation = useChangePlan();

  if (!company) return null;

  const currentSub = getActiveSubscription(company);
  const subConfig = currentSub ? getSubStatusConfig(currentSub.status) : null;
  const isCompanyActive = company.isActive;
  const canHardDeleteCompany =
    capabilities?.canHardDeleteCompany ??
    PLATFORM_CAPABILITIES_FALLBACK.canHardDeleteCompany;

  // Which actions are available based on sub status
  // Activate = only when NO subscription exists at all
  // Extend   = any existing subscription (active, trial, expired, suspended)
  const canActivate = !currentSub;
  const canExtend   = !!currentSub;
  const canSuspend  = currentSub?.status === 'ACTIVE' || currentSub?.status === 'TRIAL';

  function handleMutationError(err: unknown, fallbackKey = 'errors.generic') {
    setActionError(getPlatformUserErrorMessage(t, err, fallbackKey));
  }

  function handleDisable() {
    setShowDisableConfirm(false);
    disableMutation.mutate(company!.id, {
      onSuccess: () => onClose(),
      onError: (err) => handleMutationError(err, 'errors.disableFailed'),
    });
  }

  function handleEnable() {
    setShowEnableConfirm(false);
    enableMutation.mutate(company!.id, {
      onSuccess: () => onClose(),
      onError: (err) => handleMutationError(err, 'errors.enableFailed'),
    });
  }

  function handleArchive() {
    setShowArchiveConfirm(false);
    archiveMutation.mutate(
      { id: company!.id, dto: {} },
      {
        onSuccess: () => onClose(),
        onError: (err) => handleMutationError(err, 'errors.archiveFailed'),
      },
    );
  }

  function handleRestore() {
    setShowRestoreConfirm(false);
    restoreMutation.mutate(
      { id: company!.id, dto: {} },
      {
        onSuccess: () => onClose(),
        onError: (err) => handleMutationError(err, 'errors.restoreFailed'),
      },
    );
  }

  return (
    <>
      <ZModal
        visible={visible && subAction === null}
        onClose={onClose}
        title={company.name}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Company header ── */}
          <View
            style={[
              styles.headerCard,
              { backgroundColor: `${PLATFORM_ACCENT}10`, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View style={[styles.companyIcon, { backgroundColor: `${PLATFORM_ACCENT}20` }]}>
              <Ionicons name="business" size={26} color={PLATFORM_ACCENT} />
            </View>
            <View style={[styles.headerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ZText weight="bold" size="base" style={{ color: palette.text }}>
                {company.name}
              </ZText>
              {company.phone ? (
                <ZText size="xs" variant="secondary">{company.phone}</ZText>
              ) : null}
              <ZText size="xs" variant="secondary">
                {t('detail.since', {
                  date: new Date(company.createdAt).toLocaleDateString(
                    isRTL ? 'ar-EG' : 'en-US',
                    { year: 'numeric', month: 'short' },
                  ),
                })}
              </ZText>
            </View>
            {/* Active/Inactive badge */}
            <View
              style={[
                styles.activeBadge,
                {
                  backgroundColor: isCompanyActive ? '#f0fdf4' : '#fef2f2',
                },
              ]}
            >
              <ZText
                size="xs"
                weight="bold"
                style={{ color: isCompanyActive ? '#16a34a' : '#dc2626' }}
              >
                {isCompanyActive ? t('detail.companyActive') : t('detail.companyDisabled')}
              </ZText>
            </View>
          </View>

          {/* ── Metrics ── */}
          <View
            style={[
              styles.metricsGrid,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {metricsLoading ? (
              <ActivityIndicator size="small" color={PLATFORM_ACCENT} style={{ flex: 1 }} />
            ) : (
              [
                { label: t('metrics.users'), value: metrics?.usersCount ?? company._count.users, icon: 'people-outline' },
                { label: t('metrics.customers'), value: metrics?.customersCount ?? 0, icon: 'person-outline' },
                { label: t('metrics.suppliers'), value: metrics?.suppliersCount ?? 0, icon: 'business-outline' },
                { label: t('metrics.employees'), value: metrics?.employeesCount ?? 0, icon: 'id-card-outline' },
              ].map(({ label, value, icon }) => (
                <View
                  key={label}
                  style={[
                    styles.metricItem,
                    { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
                  ]}
                >
                  <Ionicons name={icon as any} size={16} color={PLATFORM_ACCENT} />
                  <ZText weight="bold" size="base" style={{ color: palette.text }}>
                    {value}
                  </ZText>
                  <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
                    {label}
                  </ZText>
                </View>
              ))
            )}
          </View>

          {/* ── Subscription card ── */}
          <SectionTitle title={t('detail.subscription')} palette={palette} isRTL={isRTL} />

          {currentSub ? (
            <View
              style={[
                styles.subCard,
                {
                  backgroundColor: isDark ? Colors.dark.surface : '#fff',
                  borderLeftWidth: 3,
                  [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 3,
                  [isRTL ? 'borderRightColor' : 'borderLeftColor']: subConfig?.color ?? '#e5e7eb',
                },
              ]}
            >
              {/* Status + Plan row */}
              <View style={[styles.subTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.subInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <ZText weight="bold" size="sm" style={{ color: palette.text }}>
                    {currentSub.plan.name}
                  </ZText>
                  <ZText size="xs" variant="secondary">
                    {currentSub.plan.currencyCode} {currentSub.plan.price.toLocaleString()} / {t(`billing.${currentSub.plan.billingCycle}`)}
                  </ZText>
                </View>
                <View style={[styles.subStatusPill, { backgroundColor: subConfig?.bgColor }]}>
                  <Ionicons name={subConfig?.icon as any} size={13} color={subConfig?.color} />
                  <ZText size="xs" weight="bold" style={{ color: subConfig?.color }}>
                    {t(`subStatus.${currentSub.status}`)}
                  </ZText>
                </View>
              </View>
              {/* Dates */}
              <View style={[styles.subDates, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DateItem
                  label={t('detail.startDate')}
                  value={new Date(currentSub.startDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                  palette={palette}
                  isRTL={isRTL}
                />
                <DateItem
                  label={t('detail.endDate')}
                  value={new Date(currentSub.endDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                  palette={palette}
                  isRTL={isRTL}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.noSubCard, { backgroundColor: '#fafafa' }]}>
              <Ionicons name="alert-circle-outline" size={24} color={palette.textMuted} />
              <ZText size="sm" variant="secondary">{t('detail.noActiveSub')}</ZText>
            </View>
          )}

          {/* Error */}
          {actionError ? (
            <View style={styles.errorBanner}>
              <ZText size="sm" style={{ color: '#dc2626' }}>{actionError}</ZText>
            </View>
          ) : null}

          {/* ── Subscription actions ── */}
          <SectionTitle title={t('detail.actions')} palette={palette} isRTL={isRTL} />

          <ActionGroup
            title={t('detail.companyActions')}
            description={t('detail.companyActionsDescription')}
            palette={palette}
            isRTL={isRTL}
          >
            <ActionBtn
              icon="create-outline"
              label={t('actions.editCompany')}
              color="#0f766e"
              onPress={() => { setActionError(null); setSubAction('editCompany'); }}
            />
            <ActionBtn
              icon="people-outline"
              label={t('actions.viewUsers')}
              color="#0891b2"
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/(platform)/company-users',
                  params: { companyId: company!.id, companyName: company!.name },
                } as never);
              }}
            />
            {canActivate && (
              <ActionBtn
                icon="flash-outline"
                label={t('actions.activate')}
                color="#16a34a"
                onPress={() => { setActionError(null); setSubAction('activate'); }}
              />
            )}
            {isCompanyActive ? (
              <ActionBtn
                icon="ban-outline"
                label={t('actions.disableCompany')}
                color="#dc2626"
                onPress={() => setShowDisableConfirm(true)}
                loading={disableMutation.isPending}
              />
            ) : (
              <ActionBtn
                icon="checkmark-circle-outline"
                label={t('actions.enableCompany')}
                color="#16a34a"
                onPress={() => setShowEnableConfirm(true)}
                loading={enableMutation.isPending}
              />
            )}
          </ActionGroup>

          <ActionGroup
            title={t('detail.subscriptionActions')}
            description={t('detail.subscriptionActionsDescription')}
            palette={palette}
            isRTL={isRTL}
          >
            {canExtend && (
              <ActionBtn
                icon="calendar-outline"
                label={t('actions.extend')}
                color={PLATFORM_ACCENT}
                onPress={() => { setActionError(null); setSubAction('extend'); }}
              />
            )}
            {canSuspend && (
              <ActionBtn
                icon="pause-circle-outline"
                label={t('actions.suspend')}
                color="#d97706"
                onPress={() => { setActionError(null); setSubAction('suspend'); }}
              />
            )}
            {!!currentSub && (
              <ActionBtn
                icon="swap-horizontal-outline"
                label={t('actions.changePlan')}
                color="#7c3aed"
                onPress={() => { setActionError(null); setSubAction('changePlan'); }}
              />
            )}
          </ActionGroup>

          <ActionGroup
            title={t('detail.governanceActions')}
            description={t('detail.governanceActionsDescription')}
            palette={palette}
            isRTL={isRTL}
            tone="warning"
          >
            {company.isDeleted ? (
              <ActionBtn
                icon="refresh-outline"
                label={t('actions.restoreCompany')}
                color="#16a34a"
                onPress={() => setShowRestoreConfirm(true)}
                loading={restoreMutation.isPending}
              />
            ) : (
              <ActionBtn
                icon="archive-outline"
                label={t('actions.archiveCompany')}
                color="#475569"
                onPress={() => setShowArchiveConfirm(true)}
                loading={archiveMutation.isPending}
              />
            )}
            {canHardDeleteCompany && company.isDeleted ? (
              <ActionBtn
                icon="trash-outline"
                label={t('actions.deleteCompany')}
                color="#b91c1c"
                onPress={() => { setActionError(null); setSubAction('deleteCompany'); }}
                loading={deleteMutation.isPending}
              />
            ) : null}
          </ActionGroup>
        </ScrollView>
      </ZModal>

      {/* ── Activate Form ── */}
      {subAction === 'activate' && (
        <ActivateForm
          company={company}
          plans={activePlans}
          visible={subAction === 'activate'}
          onClose={() => setSubAction(null)}
          onSuccess={() => { setSubAction(null); }}
          mutation={activateMutation}
          t={t}
          isRTL={isRTL}
          palette={palette}
          isDark={isDark}
        />
      )}

      {/* ── Extend Form ── */}
      {subAction === 'extend' && (
        <ExtendForm
          company={company}
          visible={subAction === 'extend'}
          onClose={() => setSubAction(null)}
          onSuccess={() => setSubAction(null)}
          mutation={extendMutation}
          t={t}
          isRTL={isRTL}
          palette={palette}
        />
      )}

      {/* ── Suspend Form ── */}
      {subAction === 'suspend' && (
        <SuspendForm
          company={company}
          visible={subAction === 'suspend'}
          onClose={() => setSubAction(null)}
          onSuccess={() => setSubAction(null)}
          mutation={suspendMutation}
          t={t}
          isRTL={isRTL}
          palette={palette}
        />
      )}

      {subAction === 'changePlan' && (
        <ChangePlanForm
          company={company}
          plans={activePlans}
          visible={subAction === 'changePlan'}
          onClose={() => setSubAction(null)}
          onSuccess={() => setSubAction(null)}
          mutation={changePlanMutation}
          t={t}
          isRTL={isRTL}
          palette={palette}
        />
      )}

      {subAction === 'editCompany' && (
        <EditCompanyForm
          company={company}
          visible={subAction === 'editCompany'}
          onClose={() => setSubAction(null)}
          onSuccess={() => setSubAction(null)}
          mutation={updateMutation}
          t={t}
          palette={palette}
        />
      )}

      {subAction === 'deleteCompany' && (
        <DeleteCompanyForm
          company={company}
          visible={subAction === 'deleteCompany'}
          onClose={() => setSubAction(null)}
          onSuccess={() => {
            setSubAction(null);
            onClose();
          }}
          mutation={deleteMutation}
          t={t}
          palette={palette}
        />
      )}

      {/* ── Disable confirm ── */}
      <ZConfirmDialog
        visible={showDisableConfirm}
        title={t('disableCompany.title')}
        message={t('disableCompany.message', { name: company.name })}
        confirmText={t('disableCompany.confirm')}
        cancelText={t('disableCompany.cancel')}
        onConfirm={handleDisable}
        onCancel={() => setShowDisableConfirm(false)}
        loading={disableMutation.isPending}
      />

      {/* ── Enable confirm ── */}
      <ZConfirmDialog
        visible={showEnableConfirm}
        title={t('enableCompany.title')}
        message={t('enableCompany.message', { name: company.name })}
        confirmText={t('enableCompany.confirm')}
        cancelText={t('enableCompany.cancel')}
        onConfirm={handleEnable}
        onCancel={() => setShowEnableConfirm(false)}
        loading={enableMutation.isPending}
      />

      <ZConfirmDialog
        visible={showArchiveConfirm}
        title={t('archiveCompany.title')}
        message={t('archiveCompany.message', { name: company.name })}
        confirmText={t('archiveCompany.confirm')}
        cancelText={t('archiveCompany.cancel')}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
        loading={archiveMutation.isPending}
      />

      <ZConfirmDialog
        visible={showRestoreConfirm}
        title={t('restoreCompany.title')}
        message={t('restoreCompany.message', { name: company.name })}
        confirmText={t('restoreCompany.confirm')}
        cancelText={t('restoreCompany.cancel')}
        onConfirm={handleRestore}
        onCancel={() => setShowRestoreConfirm(false)}
        loading={restoreMutation.isPending}
      />
    </>
  );
}

// ─── Sub-forms ─────────────────────────────────────────────────────────────────

function ActivateForm({
  company, plans, visible, onClose, onSuccess, mutation, t, isRTL, palette, isDark,
}: any) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!selectedPlanId) { setError(t('validation.planRequired')); return; }
    if (!endDate) { setError(t('validation.endDateRequired')); return; }
    setError(null);
    mutation.mutate(
      { companyId: company.id, planId: selectedPlanId, endDate: endDate.toISOString(), autoRenew, note: note || undefined },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          setError(getPlatformUserErrorMessage(t, err, 'errors.activateFailed'));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={onClose} title={t('activate.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}

        <ZText weight="semibold" size="sm" style={{ color: palette.textMuted, marginBottom: 4 }}>
          {t('activate.selectPlan')}
        </ZText>

        {plans.map((plan: any) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planOption,
              {
                borderColor: selectedPlanId === plan.id ? PLATFORM_ACCENT : palette.border,
                backgroundColor: selectedPlanId === plan.id ? `${PLATFORM_ACCENT}10` : (isDark ? Colors.dark.surface : '#fff'),
              },
            ]}
            onPress={() => { setSelectedPlanId(plan.id); setError(null); }}
          >
            <View style={[{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ZText weight="semibold" size="sm" style={{ color: palette.text }}>{plan.name}</ZText>
              <ZText size="xs" variant="secondary">
                {plan.currencyCode} {plan.price.toLocaleString()} / {t(`billing.${plan.billingCycle}`)}
              </ZText>
            </View>
            {selectedPlanId === plan.id && (
              <Ionicons name="checkmark-circle" size={20} color={PLATFORM_ACCENT} />
            )}
          </TouchableOpacity>
        ))}

        <ZDateInput
          label={t('activate.endDate')}
          value={endDate}
          onChange={(d) => { setEndDate(d); setError(null); }}
          minDate={new Date()}
        />

        <ZInput
          label={t('activate.note')}
          placeholder={t('activate.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ backgroundColor: '#16a34a', marginTop: Spacing[2] }}
        >
          {t('activate.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

function ExtendForm({ company, visible, onClose, onSuccess, mutation, t, palette }: any) {
  const [newEndDate, setNewEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!newEndDate) { setError(t('validation.endDateRequired')); return; }
    setError(null);
    mutation.mutate(
      { companyId: company.id, newEndDate: newEndDate.toISOString(), reason: reason || undefined },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          setError(getPlatformUserErrorMessage(t, err, 'errors.extendFailed'));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={onClose} title={t('extend.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}
        <ZDateInput
          label={t('extend.newEndDate')}
          value={newEndDate}
          onChange={(d) => { setNewEndDate(d); setError(null); }}
          minDate={new Date()}
        />
        <ZInput
          label={t('extend.reason')}
          placeholder={t('extend.reasonPlaceholder')}
          value={reason}
          onChangeText={setReason}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ backgroundColor: PLATFORM_ACCENT, marginTop: Spacing[2] }}
        >
          {t('extend.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

function SuspendForm({ company, visible, onClose, onSuccess, mutation, t, palette }: any) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    mutation.mutate(
      { companyId: company.id, reason: reason || undefined },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          setError(getPlatformUserErrorMessage(t, err, 'errors.suspendFailed'));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={onClose} title={t('suspend.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.warnBanner, { backgroundColor: '#fffbeb' }]}>
          <Ionicons name="warning-outline" size={18} color="#d97706" />
          <ZText size="sm" style={{ color: '#92400e', flex: 1 }}>
            {t('suspend.warning')}
          </ZText>
        </View>
        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}
        <ZInput
          label={t('suspend.reason')}
          placeholder={t('suspend.reasonPlaceholder')}
          value={reason}
          onChangeText={setReason}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ backgroundColor: '#d97706', marginTop: Spacing[2] }}
        >
          {t('suspend.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function ChangePlanForm({
  company, plans, visible, onClose, onSuccess, mutation, t, isRTL, palette,
}: any) {
  const currentSub = getActiveSubscription(company);
  const [newPlanId, setNewPlanId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const availablePlans = plans.filter((plan: any) => plan.id !== currentSub?.plan.id);

  function handleSubmit() {
    if (!currentSub) {
      setError(t('errors.changePlanFailed'));
      return;
    }
    if (!newPlanId) {
      setError(t('validation.planRequired'));
      return;
    }

    setError(null);
    mutation.mutate(
      {
        companyId: company.id,
        newPlanId,
        mode: 'IMMEDIATE',
        reason: reason || undefined,
      },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          setError(getPlatformUserErrorMessage(t, err, 'errors.changePlanFailed'));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={onClose} title={t('changePlan.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}

        <ZText size="xs" variant="secondary">
          {t('changePlan.currentPlan')}: {currentSub?.plan.name ?? '-'}
        </ZText>

        {availablePlans.map((plan: any) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planOption,
              {
                borderColor: newPlanId === plan.id ? PLATFORM_ACCENT : palette.border,
                backgroundColor: newPlanId === plan.id ? `${PLATFORM_ACCENT}10` : '#fff',
              },
            ]}
            onPress={() => { setNewPlanId(plan.id); setError(null); }}
          >
            <View style={[{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ZText weight="semibold" size="sm" style={{ color: palette.text }}>{plan.name}</ZText>
              <ZText size="xs" variant="secondary">
                {plan.currencyCode} {plan.price.toLocaleString()} / {t(`billing.${plan.billingCycle}`)}
              </ZText>
            </View>
            {newPlanId === plan.id && (
              <Ionicons name="checkmark-circle" size={20} color={PLATFORM_ACCENT} />
            )}
          </TouchableOpacity>
        ))}

        <ZInput
          label={t('changePlan.reason')}
          placeholder={t('changePlan.reasonPlaceholder')}
          value={reason}
          onChangeText={setReason}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ backgroundColor: PLATFORM_ACCENT, marginTop: Spacing[2] }}
        >
          {t('changePlan.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

function EditCompanyForm({
  company, visible, onClose, onSuccess, mutation, t,
}: any) {
  const [name, setName] = useState(company.name ?? '');
  const [phone, setPhone] = useState(company.phone ?? '');
  const [address, setAddress] = useState(company.address ?? '');
  const [currencyCode, setCurrencyCode] = useState(company.currencyCode ?? 'EGP');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) {
      setError(t('validation.required'));
      return;
    }

    setError(null);
    mutation.mutate(
      {
        id: company.id,
        dto: {
          companyName: name.trim(),
          companyPhone: phone.trim() || undefined,
          companyAddress: address.trim() || undefined,
          currencyCode: currencyCode.trim().toUpperCase() || undefined,
        },
      },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          setError(getPlatformUserErrorMessage(t, err, 'errors.updateCompanyFailed'));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={onClose} title={t('editCompany.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}

        <ZInput
          label={t('editCompany.name')}
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <ZInput
          label={t('editCompany.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
        <ZInput
          label={t('editCompany.address')}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <ZInput
          label={t('editCompany.currencyCode')}
          value={currencyCode}
          onChangeText={setCurrencyCode}
          autoCapitalize="characters"
          returnKeyType="done"
        />

        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ backgroundColor: '#0f766e', marginTop: Spacing[2] }}
        >
          {t('editCompany.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

function DeleteCompanyForm({
  company, visible, onClose, onSuccess, mutation, t,
}: any) {
  const [confirmCompanyName, setConfirmCompanyName] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!confirmCompanyName.trim()) {
      setError(t('deleteCompany.nameRequired'));
      return;
    }

    setError(null);
    mutation.mutate(
      {
        id: company.id,
        dto: {
          confirmCompanyName: confirmCompanyName.trim(),
          reason: reason.trim() || undefined,
        },
      },
      {
        onSuccess: () => onSuccess(),
        onError: (err: unknown) => {
          setError(getPlatformUserErrorMessage(t, err, 'errors.deleteFailed'));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={onClose} title={t('deleteCompany.title')}>
      <ScrollView
        style={styles.formScrollView}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.warnBanner, { backgroundColor: '#fef2f2' }]}>
          <Ionicons name="warning-outline" size={18} color="#b91c1c" />
          <ZText size="sm" style={{ color: '#7f1d1d', flex: 1 }}>
            {t('deleteCompany.warning')}
          </ZText>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ZText size="sm" style={{ color: '#dc2626' }}>{error}</ZText>
          </View>
        ) : null}

        <ZInput
          label={t('deleteCompany.confirmNameLabel')}
          placeholder={company.name}
          value={confirmCompanyName}
          onChangeText={setConfirmCompanyName}
          autoCapitalize="none"
          returnKeyType="next"
        />
        <ZInput
          label={t('deleteCompany.reason')}
          placeholder={t('deleteCompany.reasonPlaceholder')}
          value={reason}
          onChangeText={setReason}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ backgroundColor: '#b91c1c', marginTop: Spacing[2] }}
        >
          {t('deleteCompany.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}
function SectionTitle({
  title,
  palette,
  isRTL,
}: {
  title: string;
  palette: ColorPalette;
  isRTL: boolean;
}) {
  return (
    <ZText
      weight="semibold"
      size="xs"
      style={{
        color: palette.textMuted,
        textAlign: isRTL ? 'right' : 'left',
        marginTop: Spacing[3],
        marginBottom: Spacing[2],
        letterSpacing: 0.5,
      }}
    >
      {title.toUpperCase()}
    </ZText>
  );
}

function DateItem({
  label,
  value,
  palette,
  isRTL,
}: {
  label: string;
  value: string;
  palette: ColorPalette;
  isRTL: boolean;
}) {
  return (
    <View style={[{ alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
      <ZText size="xs" variant="secondary">{label}</ZText>
      <ZText size="sm" weight="medium" style={{ color: palette.text }}>{value}</ZText>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onPress,
  loading = false,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: `${color}12`, borderColor: `${color}25` }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon as any} size={20} color={color} />
      )}
      <ZText size="xs" weight="medium" style={{ color, textAlign: 'center' }}>
        {label}
      </ZText>
    </TouchableOpacity>
  );
}

function ActionGroup({
  title,
  description,
  palette,
  isRTL,
  tone = 'neutral',
  children,
}: {
  title: string;
  description: string;
  palette: ColorPalette;
  isRTL: boolean;
  tone?: 'neutral' | 'warning';
  children: React.ReactNode;
}) {
  const borderColor = tone === 'warning' ? '#fcd34d' : `${PLATFORM_ACCENT}18`;
  const backgroundColor = tone === 'warning' ? '#fffaf0' : '#ffffff';

  return (
    <View style={[styles.actionSectionCard, { borderColor, backgroundColor }]}>
      <ZText
        weight="semibold"
        size="sm"
        style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
      >
        {title}
      </ZText>
      <ZText
        size="xs"
        variant="secondary"
        style={{ textAlign: isRTL ? 'right' : 'left' }}
      >
        {description}
      </ZText>
      <View style={styles.actionGrid}>{children}</View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[2],
  },
  headerCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    alignItems: 'center',
  },
  companyIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: 3 },
  activeBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  metricsGrid: {
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.lg,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    elevation: 1,
  },
  subCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  subTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  subInfo: { flex: 1, gap: 2 },
  subStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  subDates: {
    justifyContent: 'space-between',
  },
  noSubCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[2],
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  actionSectionCard: {
    borderRadius: Radius.xl,
    padding: Spacing[3],
    gap: Spacing[2],
    borderWidth: 1,
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing[1],
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: Spacing[3],
    borderRadius: Radius.lg,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
  },
  // Form styles
  formScrollView: {
    flex: 1,
  },
  formScroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
});

