/**
 * ProductDetail — slide-up modal showing full product info.
 *
 * Sections:
 *   Hero: icon + name + price + active badge
 *   Info card: SKU, category, unit, description, createdBy, dates
 *   Actions: Edit | Toggle Active | Delete
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZModal } from '@/components/ui/ZModal';
import { ZButton } from '@/components/ui/ZButton';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useProduct } from '../hooks/useProducts';
import { useDeleteProduct, useToggleProductActive } from '../hooks/useProductMutations';
import { PRODUCT_ACCENT, formatPrice } from '../types';

interface Props {
  productId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  color = PRODUCT_ACCENT,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color?: string;
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <ZText size="xs" variant="muted" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {label}
        </ZText>
        <ZText size="sm" weight="medium" style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}>
          {value}
        </ZText>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProductDetail({ productId, onClose, onEdit }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('products');
  const palette = isDark ? Colors.dark : Colors.light;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: product, isLoading } = useProduct(productId);
  const deleteMutation = useDeleteProduct();
  const toggleMutation = useToggleProductActive(productId ?? '');

  const handleDelete = () => {
    if (!productId) return;
    deleteMutation.mutate(productId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
    });
  };

  const handleToggleActive = (value: boolean) => {
    if (!productId) return;
    toggleMutation.mutate(value);
  };

  return (
    <ZModal
      visible={!!productId}
      onClose={onClose}
      title={t('detail.title')}
    >
      {isLoading || !product ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRODUCT_ACCENT} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* ── Hero ── */}
          <View style={[styles.hero, { backgroundColor: `${PRODUCT_ACCENT}12` }]}>
            <View style={[styles.heroIcon, { backgroundColor: `${PRODUCT_ACCENT}20` }]}>
              <Ionicons name="cube" size={28} color={PRODUCT_ACCENT} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 3 }}>
              <ZText weight="bold" size="lg" style={{ color: palette.text }}>
                {product.name}
              </ZText>
              <ZText weight="bold" style={{ color: PRODUCT_ACCENT, fontSize: 18 }}>
                {formatPrice(product.unitPrice)}
                {product.unit ? (
                  <ZText size="sm" variant="muted"> / {product.unit}</ZText>
                ) : null}
              </ZText>
            </View>
            {/* Active toggle */}
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Switch
                value={product.isActive}
                onValueChange={handleToggleActive}
                trackColor={{ false: '#d1d5db', true: `${PRODUCT_ACCENT}80` }}
                thumbColor={product.isActive ? PRODUCT_ACCENT : '#9ca3af'}
                disabled={toggleMutation.isPending}
              />
              <ZText size="xs" variant="muted">
                {product.isActive ? t('filter.active').replace(' فقط', '').replace(' only', '') : t('filter.inactive').replace(' فقط', '').replace(' only', '')}
              </ZText>
            </View>
          </View>

          {/* ── Info card ── */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: isDark ? Colors.dark.surface : '#fff' },
            ]}
          >
            {product.sku && (
              <InfoRow
                icon="barcode-outline"
                label={t('detail.sku')}
                value={product.sku}
              />
            )}
            {product.category && (
              <InfoRow
                icon="folder-outline"
                label={t('detail.category')}
                value={product.category}
              />
            )}
            {product.unit && (
              <InfoRow
                icon="scale-outline"
                label="الوحدة"
                value={product.unit}
                color="#6366f1"
              />
            )}
            {product.description && (
              <InfoRow
                icon="document-text-outline"
                label="الوصف"
                value={product.description}
                color="#64748b"
              />
            )}
            <InfoRow
              icon="person-outline"
              label="أضافه"
              value={product.createdBy?.fullName ?? '—'}
              color="#64748b"
            />
            <InfoRow
              icon="calendar-outline"
              label="تاريخ الإضافة"
              value={new Date(product.createdAt).toLocaleDateString('ar-SA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              color="#64748b"
            />
          </View>

          {/* ── Actions ── */}
          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ZButton
              title={t('form.edit')}
              variant="secondary"
              onPress={() => {
                onClose();
                onEdit(product.id);
              }}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              style={[styles.deleteBtn, { flex: 0.5 }]}
              onPress={() => setShowDeleteConfirm(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <ZConfirmDialog
        visible={showDeleteConfirm}
        title={t('delete.title')}
        message={t('delete.message')}
        confirmText={t('delete.confirm', { defaultValue: 'حذف' })}
        cancelText={t('delete.cancel', { defaultValue: 'إلغاء' })}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleteMutation.isPending}
        destructive
      />
    </ZModal>
  );
}

const styles = StyleSheet.create({
  center: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: Spacing[3],
    paddingBottom: Spacing[4],
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius.xl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: Radius.xl,
    padding: Spacing[3],
    gap: Spacing[1],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  actions: {
    gap: Spacing[2],
    alignItems: 'center',
  },
  deleteBtn: {
    height: 44,
    backgroundColor: '#fee2e2',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
