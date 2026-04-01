/**
 * SupplierDetail — Slide-up modal for a single supplier.
 *
 * Layout:
 *   ┌── Violet Hero ─────────────────────────────────────┐
 *   │  [Avatar]  Name  [Active badge]                    │
 *   │  Current Balance (large)                           │
 *   ├── White Card (overlaps hero) ─────────────────────┤
 *   │  InfoRows: phone, address, openingBalance,         │
 *   │            createdAt                               │
 *   │  [View Ledger]                                     │
 *   │  [Edit]  [Delete]                                  │
 *   └────────────────────────────────────────────────────┘
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
import { useSupplier, useDeleteSupplier } from '../hooks/useSuppliers';
import { SupplierForm } from './SupplierForm';
import { SUPPLIER_ACCENT, toFloat, type Supplier } from '../types';

interface SupplierDetailProps {
  visible: boolean;
  supplierId: string | null;
  onClose: () => void;
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  iconColor = SUPPLIER_ACCENT,
  isLast = false,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value: string | number | null | undefined): string {
  const n = toFloat(value);
  return n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SupplierDetail({ visible, supplierId, onClose }: SupplierDetailProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('suppliers');
  const router = useRouter();
  const palette = isDark ? Colors.dark : Colors.light;

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: supplier, isLoading } = useSupplier(supplierId);
  const { mutate: deleteSupplier, isPending: isDeleting } = useDeleteSupplier();

  const balance = toFloat(supplier?.balance);
  const balanceColor =
    balance > 0 ? '#16a34a' :
    balance < 0 ? '#dc2626' :
    'rgba(255,255,255,0.9)';

  function handleDelete() {
    if (!supplierId) return;
    deleteSupplier(supplierId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setShowDeleteConfirm(false);
        if (status === 409) {
          // Supplier has ledger entries — cannot delete
        }
      },
    });
  }

  function handleViewLedger() {
    if (!supplier) return;
    onClose();
    router.push({
      pathname: '/(client)/ledger',
      params: {
        partyId: supplier.id,
        partyType: 'SUPPLIER',
        partyName: supplier.name,
      },
    });
  }

  return (
    <>
      <ZModal visible={visible} onClose={onClose} animationType="slide">
        {isLoading || !supplier ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={SUPPLIER_ACCENT} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* ── Hero ──────────────────────────────────────────────── */}
            <View style={[styles.hero, { backgroundColor: SUPPLIER_ACCENT }]}>
              {/* Avatar + name row */}
              <View
                style={[
                  styles.heroTop,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <ZAvatar name={supplier.name} size="lg" />
                <View style={[styles.heroInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <ZText weight="bold" size="lg" style={styles.heroName}>
                    {supplier.name}
                  </ZText>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: supplier.isActive
                          ? 'rgba(255,255,255,0.25)'
                          : 'rgba(0,0,0,0.2)',
                      },
                    ]}
                  >
                    <ZText size="xs" style={{ color: '#fff', fontWeight: '600' }}>
                      {supplier.isActive ? t('detail.active') : t('detail.inactive')}
                    </ZText>
                  </View>
                </View>
              </View>

              {/* Balance KPI */}
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
                {supplier.phone && (
                  <InfoRow
                    icon="call-outline"
                    label={t('detail.phone')}
                    value={supplier.phone}
                  />
                )}
                {supplier.address && (
                  <InfoRow
                    icon="location-outline"
                    label={t('detail.address')}
                    value={supplier.address}
                  />
                )}
                <InfoRow
                  icon="wallet-outline"
                  label={t('detail.openingBalance')}
                  value={formatMoney(supplier.openingBalance)}
                />
                <InfoRow
                  icon="calendar-outline"
                  label={t('detail.createdAt')}
                  value={formatDate(supplier.createdAt)}
                  isLast
                />
              </View>

              {/* Action buttons */}
              <View style={[styles.section, { gap: Spacing[3] }]}>
                {/* View Ledger */}
                <View
                  style={[
                    styles.actionsRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `${SUPPLIER_ACCENT}12` }]}
                    onPress={handleViewLedger}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="book-outline" size={18} color={SUPPLIER_ACCENT} />
                    <ZText size="sm" weight="medium" style={{ color: SUPPLIER_ACCENT }}>
                      {t('detail.viewStatement')}
                    </ZText>
                  </TouchableOpacity>
                </View>

                {/* Edit + Delete */}
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
            </View>
          </ScrollView>
        )}
      </ZModal>

      {/* Edit form */}
      {supplier && (
        <SupplierForm
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          supplier={supplier}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
  },
  halfBtn: {
    flex: 1,
  },
});
