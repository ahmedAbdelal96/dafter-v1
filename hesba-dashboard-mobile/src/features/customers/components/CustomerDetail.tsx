/**
 * CustomerDetail — Slide-up modal for a single customer.
 *
 * Layout:
 *   ┌── Blue Hero ──────────────────────────────────────┐
 *   │  [Avatar]  Name  [Active badge]                   │
 *   │  Current Balance (large)                          │
 *   ├── White Card (overlaps hero) ─────────────────────┤
 *   │  InfoRows: phone, address, openingBalance,        │
 *   │            creditLimit, createdAt                 │
 *   │  KPI row: open invoices | total purchases | overdue│
 *   │  F3.5: Payment behavior badge row                 │
 *   │  [New Invoice]  [Record Payment]  [Statement]     │
 *   │  [Edit]  [Delete]                                 │
 *   │  ── F3.2: Tab bar ───────────────────────────────│
 *   │  [فواتير] [دفعات] [كشف حساب] [آجل]              │
 *   │  <tab content — lazy loaded>                      │
 *   └───────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCustomer, useDeleteCustomer } from '../hooks/useCustomers';
import { CustomerForm } from './CustomerForm';
import { CUSTOMER_ACCENT, toFloat, type Customer } from '../types';
import {
  useCustomerSnapshot,
  useListInvoices,
} from '@/features/invoices/hooks/useInvoices';
import { useStatement } from '@/features/ledger/hooks/useLedger';
import { useListDeferredSales } from '@/features/deferred-sales/hooks/useDeferredSales';
import {
  ENTRY_TYPE_ICONS,
  ENTRY_TYPE_COLORS,
} from '@/features/ledger/types';
import { useCustomerPrices } from '@/features/pricing/usePricing';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'invoices' | 'payments' | 'statement' | 'deferred' | 'pricing';

// ─── Inline status configs (avoids cross-feature imports) ─────────────────────

const INV_STATUS: Record<string, { color: string; bg: string }> = {
  DRAFT:            { color: '#64748b', bg: '#f1f5f9' },
  PENDING_APPROVAL: { color: '#d97706', bg: '#fffbeb' },
  APPROVED:         { color: '#16a34a', bg: '#dcfce7' },
  REJECTED:         { color: '#dc2626', bg: '#fee2e2' },
  CANCELLED:        { color: '#94a3b8', bg: '#f8fafc' },
};

const DEF_STATUS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#d97706', bg: '#fffbeb' },
  PARTIAL: { color: '#2563eb', bg: '#eff6ff' },
  PAID:    { color: '#16a34a', bg: '#dcfce7' },
  OVERDUE: { color: '#dc2626', bg: '#fee2e2' },
};

// F3.5 — payment type display config
const PAYMENT_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  CASH:     { color: '#16a34a', bg: '#dcfce7', icon: 'cash-outline' },
  TRANSFER: { color: '#2563eb', bg: '#eff6ff', icon: 'swap-horizontal-outline' },
  DEFERRED: { color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  CHECK:    { color: '#7c3aed', bg: '#f5f3ff', icon: 'document-text-outline' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value: string | number | null | undefined): string {
  const n = toFloat(value);
  return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric', month: 'short',
    });
  } catch { return iso; }
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon, label, value, iconColor = CUSTOMER_ACCENT, isLast = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  iconColor?: string;
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
        <ZText size="sm" weight="medium" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {value}
        </ZText>
      </View>
    </View>
  );
}

// ─── F3.5: Payment Behavior Row ──────────────────────────────────────────────

function PaymentBehaviorRow({
  defaultPaymentType,
  hasOverdue,
}: {
  defaultPaymentType: string | null;
  hasOverdue: boolean;
}) {
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');

  const ptConfig = defaultPaymentType ? PAYMENT_TYPE_CONFIG[defaultPaymentType] : null;
  const ptLabel = defaultPaymentType
    ? t(`detail.paymentType.${defaultPaymentType}`, { defaultValue: defaultPaymentType })
    : null;

  if (!ptConfig && !hasOverdue) return null;

  return (
    <View
      style={[
        styles.behaviorRow,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {ptConfig && ptLabel && (
        <View
          style={[
            styles.behaviorBadge,
            { backgroundColor: ptConfig.bg, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name={ptConfig.icon as any} size={11} color={ptConfig.color} />
          <ZText size="xs" weight="medium" style={{ color: ptConfig.color }}>
            {ptLabel}
          </ZText>
        </View>
      )}
      {hasOverdue && (
        <View
          style={[
            styles.behaviorBadge,
            { backgroundColor: '#fee2e2', flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name="warning-outline" size={11} color="#dc2626" />
          <ZText size="xs" weight="medium" style={{ color: '#dc2626' }}>
            {t('detail.overdueRisk')}
          </ZText>
        </View>
      )}
    </View>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const { isDark } = useTheme();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'invoices',  label: t('detail.tabs.invoices') },
    { key: 'payments',  label: t('detail.tabs.payments') },
    { key: 'statement', label: t('detail.tabs.statement') },
    { key: 'deferred',  label: t('detail.tabs.deferred') },
    { key: 'pricing',   label: t('detail.tabs.pricing') },
  ];

  return (
    <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.75}
        >
          <ZText
            size="xs"
            weight={active === tab.key ? 'bold' : 'regular'}
            style={{
              color: active === tab.key ? CUSTOMER_ACCENT : palette.textMuted,
              textAlign: 'center',
            }}
          >
            {tab.label}
          </ZText>
          {active === tab.key && (
            <View style={[styles.tabIndicator, { backgroundColor: CUSTOMER_ACCENT }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── EmptyTabContent ──────────────────────────────────────────────────────────

function EmptyTabContent({ label }: { label: string }) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.tabEmpty}>
      <Ionicons name="folder-open-outline" size={28} color={palette.textMuted} />
      <ZText size="sm" variant="secondary" style={{ textAlign: 'center' }}>
        {label}
      </ZText>
    </View>
  );
}

// ─── ViewAllButton ────────────────────────────────────────────────────────────

function ViewAllButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { isRTL } = useLocale();
  return (
    <TouchableOpacity
      style={[styles.viewAllBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <ZText size="xs" weight="medium" style={{ color: CUSTOMER_ACCENT }}>
        {label}
      </ZText>
      <Ionicons
        name={isRTL ? 'arrow-back-outline' : 'arrow-forward-outline'}
        size={12}
        color={CUSTOMER_ACCENT}
      />
    </TouchableOpacity>
  );
}

// ─── InvoicesTab ─────────────────────────────────────────────────────────────

function InvoicesTab({
  customerId,
  onViewAll,
}: {
  customerId: string;
  onViewAll: () => void;
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading } = useListInvoices({ customerId, page: 1, limit: 5 });
  const items = data?.items ?? [];

  if (isLoading) {
    return <ActivityIndicator color={CUSTOMER_ACCENT} style={styles.tabLoader} />;
  }
  if (!items.length) {
    return <EmptyTabContent label={t('detail.tabs.noInvoices')} />;
  }

  return (
    <View>
      {items.map((inv) => {
        const sc = INV_STATUS[inv.status] ?? INV_STATUS.DRAFT;
        return (
          <View
            key={inv.id}
            style={[
              styles.tabRow,
              {
                borderBottomColor: palette.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <ZText
                size="sm"
                weight="medium"
                style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
              >
                {inv.invoiceNumber}
              </ZText>
              <ZText
                size="xs"
                variant="secondary"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {formatShortDate(inv.issueDate)}
              </ZText>
            </View>
            <View
              style={[
                styles.tabRowRight,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                <ZText size="xs" style={{ color: sc.color }}>
                  {t(`invoiceStatus.${inv.status}`, { defaultValue: inv.status })}
                </ZText>
              </View>
              <ZText size="sm" weight="bold" style={{ color: palette.text }}>
                {formatMoney(inv.totalAmount)}
              </ZText>
            </View>
          </View>
        );
      })}
      <ViewAllButton label={t('detail.tabs.viewAll')} onPress={onViewAll} />
    </View>
  );
}

// ─── PaymentsTab ──────────────────────────────────────────────────────────────

function PaymentsTab({ customerId }: { customerId: string }) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading } = useStatement({
    partyId: customerId,
    partyType: 'CUSTOMER',
    page: 1,
    limit: 20,
  });

  const payments = (data?.items ?? []).filter((e) => e.entryType === 'PAYMENT');

  if (isLoading) {
    return <ActivityIndicator color={CUSTOMER_ACCENT} style={styles.tabLoader} />;
  }
  if (!payments.length) {
    return <EmptyTabContent label={t('detail.tabs.noPayments')} />;
  }

  return (
    <View>
      {payments.map((entry) => (
        <View
          key={entry.id}
          style={[
            styles.tabRow,
            {
              borderBottomColor: palette.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.entryIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="cash-outline" size={14} color="#16a34a" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ZText
              size="sm"
              weight="bold"
              style={{ color: '#16a34a', textAlign: isRTL ? 'right' : 'left' }}
            >
              {formatMoney(entry.signedAmount)}
            </ZText>
            {entry.note ? (
              <ZText
                size="xs"
                variant="secondary"
                numberOfLines={1}
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {entry.note}
              </ZText>
            ) : null}
          </View>
          <ZText size="xs" variant="secondary">
            {formatShortDate(entry.entryDate)}
          </ZText>
        </View>
      ))}
    </View>
  );
}

// ─── StatementTab ─────────────────────────────────────────────────────────────

function StatementTab({
  customerId,
  onViewAll,
}: {
  customerId: string;
  onViewAll: () => void;
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading } = useStatement({
    partyId: customerId,
    partyType: 'CUSTOMER',
    page: 1,
    limit: 20,
  });

  const items = data?.items ?? [];

  if (isLoading) {
    return <ActivityIndicator color={CUSTOMER_ACCENT} style={styles.tabLoader} />;
  }
  if (!items.length) {
    return <EmptyTabContent label={t('detail.tabs.noStatement')} />;
  }

  return (
    <View>
      {/* Opening balance row */}
      {data && (
        <View
          style={[
            styles.tabRow,
            styles.openingRow,
            {
              borderBottomColor: palette.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <ZText
            size="xs"
            variant="secondary"
            style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}
          >
            {t('detail.tabs.openingBalance')}
          </ZText>
          <ZText size="xs" weight="bold" style={{ color: palette.text }}>
            {formatMoney(data.openingBalanceForPeriod)}
          </ZText>
        </View>
      )}

      {items.map((entry) => {
        const entryColor = ENTRY_TYPE_COLORS[entry.entryType] ?? '#475569';
        const entryIcon = (ENTRY_TYPE_ICONS[entry.entryType] ?? 'ellipse-outline') as any;
        const amt = toFloat(entry.signedAmount);
        const amtColor = amt >= 0 ? '#16a34a' : '#dc2626';

        return (
          <View
            key={entry.id}
            style={[
              styles.tabRow,
              {
                borderBottomColor: palette.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.entryIcon, { backgroundColor: `${entryColor}18` }]}>
              <Ionicons name={entryIcon} size={13} color={entryColor} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ZText
                size="sm"
                weight="medium"
                style={{ color: amtColor, textAlign: isRTL ? 'right' : 'left' }}
              >
                {amt >= 0 ? '+' : ''}{formatMoney(entry.signedAmount)}
              </ZText>
              {entry.note ? (
                <ZText
                  size="xs"
                  variant="secondary"
                  numberOfLines={1}
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  {entry.note}
                </ZText>
              ) : null}
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 2 }}>
              <ZText size="xs" variant="secondary">
                {formatShortDate(entry.entryDate)}
              </ZText>
              <ZText size="xs" weight="medium" style={{ color: palette.text }}>
                {formatMoney(entry.runningBalance)}
              </ZText>
            </View>
          </View>
        );
      })}
      <ViewAllButton label={t('detail.tabs.viewAll')} onPress={onViewAll} />
    </View>
  );
}

// ─── DeferredTab ──────────────────────────────────────────────────────────────

function DeferredTab({
  customerId,
  onViewAll,
}: {
  customerId: string;
  onViewAll: () => void;
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading } = useListDeferredSales({
    partyId: customerId,
    partyType: 'CUSTOMER',
    page: 1,
    limit: 5,
  });

  const items = data?.items ?? [];

  if (isLoading) {
    return <ActivityIndicator color={CUSTOMER_ACCENT} style={styles.tabLoader} />;
  }
  if (!items.length) {
    return <EmptyTabContent label={t('detail.tabs.noDeferred')} />;
  }

  return (
    <View>
      {items.map((sale) => {
        const sc = DEF_STATUS[sale.status] ?? DEF_STATUS.PENDING;
        return (
          <View
            key={sale.id}
            style={[
              styles.tabRow,
              {
                borderBottomColor: palette.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <ZText
                size="sm"
                weight="medium"
                style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
              >
                {sale.referenceNumber}
              </ZText>
              <ZText
                size="xs"
                variant="secondary"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('detail.tabs.remaining')}: {formatMoney(sale.remaining)}
              </ZText>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
              <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                <ZText size="xs" style={{ color: sc.color }}>
                  {t(`deferredStatus.${sale.status}`, { defaultValue: sale.status })}
                </ZText>
              </View>
              <ZText size="xs" variant="secondary">
                {formatShortDate(sale.dueDate)}
              </ZText>
            </View>
          </View>
        );
      })}
      <ViewAllButton label={t('detail.tabs.viewAll')} onPress={onViewAll} />
    </View>
  );
}

// ─── PricingTab ───────────────────────────────────────────────────────────────

function PricingTab({ customerId }: { customerId: string }) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data, isLoading } = useCustomerPrices(customerId);
  const items = data ?? [];

  if (isLoading) {
    return <ActivityIndicator color={CUSTOMER_ACCENT} style={styles.tabLoader} />;
  }
  if (!items.length) {
    return <EmptyTabContent label={t('detail.tabs.noPricing')} />;
  }

  return (
    <View>
      {items.map((item) => (
        <View
          key={item.id}
          style={[
            styles.tabRow,
            {
              borderBottomColor: palette.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.entryIcon, { backgroundColor: `${CUSTOMER_ACCENT}18` }]}>
            <Ionicons name="pricetag-outline" size={14} color={CUSTOMER_ACCENT} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ZText
              size="sm"
              weight="medium"
              style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
              numberOfLines={1}
            >
              {item.productName}
            </ZText>
            {item.sku ? (
              <ZText size="xs" variant="secondary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {item.sku}
              </ZText>
            ) : null}
          </View>
          <ZText size="sm" weight="bold" style={{ color: CUSTOMER_ACCENT }}>
            {parseFloat(item.price).toLocaleString('ar-SA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </ZText>
        </View>
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CustomerDetailProps {
  visible: boolean;
  customerId: string | null;
  onClose: () => void;
}

export function CustomerDetail({ visible, customerId, onClose }: CustomerDetailProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('customers');
  const router = useRouter();
  const palette = isDark ? Colors.dark : Colors.light;

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('invoices');

  const { data: customer, isLoading } = useCustomer(customerId);
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();
  const { data: snapshot } = useCustomerSnapshot(customerId);

  const balance = toFloat(customer?.balance);
  const balanceColor =
    balance > 0 ? '#dc2626' :
    balance < 0 ? '#16a34a' :
    'rgba(255,255,255,0.9)';

  function handleDelete() {
    if (!customerId) return;
    deleteCustomer(customerId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setShowDeleteConfirm(false);
        if (status === 409) {
          // Customer has ledger entries — parent screen handles error display
        }
      },
    });
  }

  function handleViewLedger() {
    if (!customer) return;
    onClose();
    router.push({
      pathname: '/(client)/ledger',
      params: { partyId: customer.id, partyType: 'CUSTOMER', partyName: customer.name },
    });
  }

  function handleNewInvoice() {
    if (!customer) return;
    onClose();
    router.push({
      pathname: '/(client)/invoices',
      params: { preselectedCustomerId: customer.id, preselectedCustomerName: customer.name },
    });
  }

  function handleRecordPayment() {
    if (!customer) return;
    onClose();
    router.push({
      pathname: '/(client)/payments',
      params: { customerId: customer.id, customerName: customer.name },
    });
  }

  function handleViewAllInvoices() {
    onClose();
    router.push('/(client)/invoices');
  }

  function handleViewAllDeferred() {
    onClose();
    router.push('/(client)/deferred-sales');
  }

  return (
    <>
      <ZModal visible={visible} onClose={onClose} animationType="slide">
        {isLoading || !customer ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={CUSTOMER_ACCENT} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* ── Hero ──────────────────────────────────────────────── */}
            <View style={[styles.hero, { backgroundColor: CUSTOMER_ACCENT }]}>
              <View
                style={[styles.heroTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <ZAvatar name={customer.name} size="lg" />
                <View style={[styles.heroInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <ZText weight="bold" size="lg" style={styles.heroName}>
                    {customer.name}
                  </ZText>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: customer.isActive
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(0,0,0,0.2)',
                      },
                    ]}
                  >
                    <ZText size="xs" style={{ color: '#fff', fontWeight: '600' }}>
                      {customer.isActive ? t('detail.active') : t('detail.inactive')}
                    </ZText>
                  </View>
                </View>
              </View>

              <View style={styles.balanceBlock}>
                <ZText size="sm" style={styles.balanceLabel}>
                  {t('detail.balance')}
                </ZText>
                <ZText
                  weight="bold"
                  style={[styles.balanceValue, { color: balanceColor }]}
                >
                  {formatMoney(balance)}
                </ZText>
              </View>
            </View>

            {/* ── Content Card (overlaps hero) ───────────────────────── */}
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.dark.surface : Colors.white },
              ]}
            >
              {/* Info rows */}
              <View style={[styles.section, styles.infoBlock]}>
                {customer.phone && (
                  <InfoRow
                    icon="call-outline"
                    label={t('detail.phone')}
                    value={customer.phone}
                  />
                )}
                {customer.address && (
                  <InfoRow
                    icon="location-outline"
                    label={t('detail.address')}
                    value={customer.address}
                  />
                )}
                <InfoRow
                  icon="wallet-outline"
                  label={t('detail.openingBalance')}
                  value={formatMoney(customer.openingBalance)}
                />
                {customer.creditLimit && (
                  <InfoRow
                    icon="shield-checkmark-outline"
                    label={t('detail.creditLimit')}
                    value={formatMoney(customer.creditLimit)}
                  />
                )}
                <InfoRow
                  icon="calendar-outline"
                  label={t('detail.createdAt')}
                  value={formatDate(customer.createdAt)}
                  isLast
                />
              </View>

              {/* ── KPI row (F3.1) ─────────────────────────────────── */}
              {snapshot && (
                <View
                  style={[
                    styles.section,
                    styles.kpiRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.kpiItem}>
                    <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
                      {t('detail.openInvoices')}
                    </ZText>
                    <ZText
                      weight="bold"
                      size="sm"
                      style={{ textAlign: 'center', color: CUSTOMER_ACCENT }}
                    >
                      {snapshot.openInvoicesCount}
                    </ZText>
                  </View>
                  <View style={[styles.kpiDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.kpiItem}>
                    <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
                      {t('detail.totalPurchases')}
                    </ZText>
                    <ZText weight="bold" size="sm" style={{ textAlign: 'center' }}>
                      {formatMoney(snapshot.totalPurchases)}
                    </ZText>
                  </View>
                  <View style={[styles.kpiDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.kpiItem}>
                    <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
                      {t('detail.overdue')}
                    </ZText>
                    <ZText
                      weight="bold"
                      size="sm"
                      style={{
                        textAlign: 'center',
                        color: snapshot.hasOverdue ? '#dc2626' : palette.text,
                      }}
                    >
                      {formatMoney(snapshot.overdueAmount)}
                    </ZText>
                  </View>
                </View>
              )}

              {/* ── F3.5: Payment behavior badges ────────────────────── */}
              {snapshot && (
                <PaymentBehaviorRow
                  defaultPaymentType={snapshot.defaultPaymentType}
                  hasOverdue={snapshot.hasOverdue}
                />
              )}

              {/* ── Action buttons ──────────────────────────────────── */}
              <View style={[styles.section, { gap: Spacing[3] }]}>
                <View
                  style={[
                    styles.actionsRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#d9770612' }]}
                    onPress={handleNewInvoice}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#d97706" />
                    <ZText size="xs" weight="medium" style={{ color: '#d97706' }}>
                      {t('detail.newInvoice')}
                    </ZText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#16a34a12' }]}
                    onPress={handleRecordPayment}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="cash-outline" size={16} color="#16a34a" />
                    <ZText size="xs" weight="medium" style={{ color: '#16a34a' }}>
                      {t('detail.recordPayment')}
                    </ZText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `${CUSTOMER_ACCENT}12` }]}
                    onPress={handleViewLedger}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="book-outline" size={16} color={CUSTOMER_ACCENT} />
                    <ZText size="xs" weight="medium" style={{ color: CUSTOMER_ACCENT }}>
                      {t('detail.viewStatement')}
                    </ZText>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.actionsRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <ZButton
                    variant="secondary"
                    style={styles.halfBtn}
                    onPress={() => setShowEdit(true)}
                  >
                    {t('detail.edit')}
                  </ZButton>
                  <ZButton
                    variant="danger"
                    style={styles.halfBtn}
                    loading={isDeleting}
                    onPress={() => setShowDeleteConfirm(true)}
                  >
                    {t('detail.delete')}
                  </ZButton>
                </View>
              </View>

              {/* ── F3.2: Tab bar + tab content ─────────────────────── */}
              <View>
                <TabBar active={activeTab} onChange={setActiveTab} />

                {activeTab === 'invoices' && (
                  <InvoicesTab
                    customerId={customer.id}
                    onViewAll={handleViewAllInvoices}
                  />
                )}
                {activeTab === 'payments' && (
                  <PaymentsTab customerId={customer.id} />
                )}
                {activeTab === 'statement' && (
                  <StatementTab
                    customerId={customer.id}
                    onViewAll={handleViewLedger}
                  />
                )}
                {activeTab === 'deferred' && (
                  <DeferredTab
                    customerId={customer.id}
                    onViewAll={handleViewAllDeferred}
                  />
                )}
                {activeTab === 'pricing' && (
                  <PricingTab customerId={customer.id} />
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </ZModal>

      {/* Edit form */}
      {customer && (
        <CustomerForm
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          customer={customer}
        />
      )}

      {/* Delete confirm */}
      <ZConfirmDialog
        visible={showDeleteConfirm}
        title={t('delete.title')}
        message={t('delete.message')}
        confirmLabel={t('delete.confirm')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: {
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
    gap: Spacing[4],
  },
  heroTop: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  heroInfo: {
    flex: 1,
    gap: Spacing[2],
  },
  heroName: {
    color: '#fff',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  balanceBlock: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.75)',
  },
  balanceValue: {
    fontSize: 28,
    color: '#fff',
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
  actionsRow: {
    gap: Spacing[3],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
  },
  halfBtn: {
    flex: 1,
  },
  kpiRow: {
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  kpiDivider: {
    width: 1,
    height: 32,
  },
  // ── F3.5 ──────────────────────────────────────────────────────────────────
  behaviorRow: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  behaviorBadge: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing[2],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    gap: 4,
  },
  tabIndicator: {
    height: 2,
    width: '60%',
    borderRadius: 1,
  },
  // ── Tab content ───────────────────────────────────────────────────────────
  tabLoader: {
    marginVertical: Spacing[6],
  },
  tabEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[6],
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  tabRowRight: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  openingRow: {
    backgroundColor: '#f8fafc',
  },
  statusPill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  entryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
});
