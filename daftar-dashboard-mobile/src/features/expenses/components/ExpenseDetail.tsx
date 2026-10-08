/**
 * ExpenseDetail — Slide-up modal with full expense details.
 *
 * Shows all fields, provides Edit (opens form) + Delete (confirm dialog).
 * Fetches single expense lazily when opened — avoids stale list data.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useExpense, useDeleteExpense } from '../hooks/useExpenses';
import { ExpenseForm } from './ExpenseForm';
import {
  toFloat,
  formatDate,
  CATEGORY_CONFIG,
  EXPENSE_ACCENT,
  type Expense,
} from '../types';

interface ExpenseDetailProps {
  visible: boolean;
  expenseId: string | null;
  onClose: () => void;
}

function InfoRow({
  icon,
  label,
  value,
  isLast,
  valueColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  isLast?: boolean;
  valueColor?: string;
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
      <View style={[styles.infoIcon, { backgroundColor: `${EXPENSE_ACCENT}18` }]}>
        <Ionicons name={icon} size={15} color={EXPENSE_ACCENT} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ZText size="xs" variant="secondary" style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {label}
        </ZText>
        <ZText
          size="sm"
          weight="medium"
          style={{ textAlign: isRTL ? 'right' : 'left', color: valueColor }}
        >
          {value}
        </ZText>
      </View>
    </View>
  );
}

export function ExpenseDetail({ visible, expenseId, onClose }: ExpenseDetailProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation('expenses');
  const palette = isDark ? Colors.dark : Colors.light;

  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: expense, isLoading } = useExpense(expenseId);
  const { mutate: deleteExpense, isPending: isDeleting } = useDeleteExpense();

  function handleDelete() {
    if (!expenseId) return;
    deleteExpense(expenseId, {
      onSuccess: () => {
        setShowConfirm(false);
        onClose();
      },
      onError: () => setShowConfirm(false),
    });
  }

  if (!visible) return null;

  const cfg = expense ? CATEGORY_CONFIG[expense.category] : null;
  const amount = expense ? toFloat(expense.amount) : 0;

  return (
    <>
      <ZModal visible={visible} onClose={onClose} title={t('detail.title')}>
        {isLoading || !expense ? (
          <View style={styles.loadingContent}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <Skeleton width={32} height={32} borderRadius={10} />
                <View style={{ flex: 1, gap: Spacing[2] }}>
                  <Skeleton width={80} height={11} borderRadius={5} />
                  <Skeleton width={130} height={14} borderRadius={6} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Amount hero */}
            <View
              style={[
                styles.amountHero,
                { backgroundColor: `${cfg!.color}12` },
              ]}
            >
              <View
                style={[styles.heroIcon, { backgroundColor: `${cfg!.color}25` }]}
              >
                <Ionicons
                  name={cfg!.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={24}
                  color={cfg!.color}
                />
              </View>
              <View style={{ gap: 3 }}>
                <ZText weight="bold" style={{ fontSize: 28, color: EXPENSE_ACCENT }}>
                  {amount.toLocaleString('ar-SA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </ZText>
                <ZText size="xs" style={{ color: cfg!.color }}>
                  {t(`category.${expense.category}`)}
                </ZText>
              </View>
            </View>

            {/* Details */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? Colors.dark.surface : palette.surfaceSecondary },
              ]}
            >
              <InfoRow
                icon="calendar-outline"
                label={t('form.date')}
                value={formatDate(expense.expenseDate)}
              />
              {expense.description && (
                <InfoRow
                  icon="chatbox-ellipses-outline"
                  label={t('form.description')}
                  value={expense.description}
                />
              )}
              {expense.supplier && (
                <InfoRow
                  icon="business-outline"
                  label={t('form.supplier')}
                  value={expense.supplier.name}
                />
              )}
              {expense.referenceNumber && (
                <InfoRow
                  icon="barcode-outline"
                  label={t('form.referenceNumber')}
                  value={expense.referenceNumber}
                />
              )}
              {expense.paymentMethod && (
                <InfoRow
                  icon="card-outline"
                  label={t('form.paymentMethod')}
                  value={expense.paymentMethod}
                />
              )}
              {expense.notes && (
                <InfoRow
                  icon="document-text-outline"
                  label={t('form.notes')}
                  value={expense.notes}
                />
              )}
              <InfoRow
                icon="time-outline"
                label={t('detail.createdAt')}
                value={formatDate(expense.createdAt)}
                isLast
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <ZButton
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setShowEdit(true)}
              >
                {t('form.edit')}
              </ZButton>
              <ZButton
                variant="danger"
                style={{ flex: 1 }}
                loading={isDeleting}
                onPress={() => setShowConfirm(true)}
              >
                {t('delete.confirm')}
              </ZButton>
            </View>
          </ScrollView>
        )}
      </ZModal>

      <ZConfirmDialog
        visible={showConfirm}
        title={t('delete.title')}
        message={t('delete.message')}
        confirmLabel={t('delete.confirm')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Edit form — reuse ExpenseForm in edit mode */}
      {expense && (
        <ExpenseForm
          visible={showEdit}
          onClose={() => {
            setShowEdit(false);
            onClose(); // close detail too after editing
          }}
          initialData={expense}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContent: {
    padding: Spacing[4],
    gap: Spacing[4],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[6],
  },
  amountHero: {
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
  infoCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
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
  actions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
});
