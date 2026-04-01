/**
 * EntryDetail — Slide-up modal showing full entry details + delete action.
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useDeleteEntry } from '../hooks/useLedger';
import {
  toFloat,
  ENTRY_TYPE_ICONS,
  ENTRY_TYPE_COLORS,
  LEDGER_ACCENT,
  type LedgerEntry,
  type PartyType,
} from '../types';

interface EntryDetailProps {
  visible: boolean;
  entry: LedgerEntry | null;
  partyId: string;
  partyType: PartyType;
  onClose: () => void;
}

function formatMoney(value: string | number): string {
  const n = toFloat(value);
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${abs.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
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

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  isLast = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
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
      <View style={[styles.infoIcon, { backgroundColor: `${LEDGER_ACCENT}18` }]}>
        <Ionicons name={icon} size={15} color={LEDGER_ACCENT} />
      </View>
      <View style={styles.infoText}>
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

export function EntryDetail({
  visible,
  entry,
  partyId,
  partyType,
  onClose,
}: EntryDetailProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('ledger');
  const palette = isDark ? Colors.dark : Colors.light;

  const [showConfirm, setShowConfirm] = useState(false);

  const { mutate: deleteEntry, isPending: isDeleting } = useDeleteEntry();

  if (!entry) return null;

  const amount = toFloat(entry.signedAmount);
  const amountColor = amount >= 0 ? '#16a34a' : '#dc2626';
  const typeColor = ENTRY_TYPE_COLORS[entry.entryType] ?? LEDGER_ACCENT;
  const iconName = ENTRY_TYPE_ICONS[entry.entryType] ?? 'document-outline';

  function handleDelete() {
    deleteEntry(
      { entryId: entry!.id, partyId },
      {
        onSuccess: () => {
          setShowConfirm(false);
          onClose();
        },
        onError: () => {
          setShowConfirm(false);
        },
      },
    );
  }

  return (
    <>
      <ZModal
        visible={visible}
        onClose={onClose}
        title={t(`entryType.${entry.entryType}`)}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Type badge */}
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: `${typeColor}15`,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.typeIconCircle, { backgroundColor: `${typeColor}25` }]}>
              <Ionicons
                name={iconName as React.ComponentProps<typeof Ionicons>['name']}
                size={20}
                color={typeColor}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ZText weight="bold" size="lg" style={{ color: amountColor }}>
                {formatMoney(entry.signedAmount)}
              </ZText>
              <ZText size="xs" variant="secondary">
                {t('entry.runningBalance')}: {toFloat(entry.runningBalance).toLocaleString('ar-SA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </ZText>
            </View>
          </View>

          {/* Info rows */}
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? Colors.dark.surface : palette.surfaceSecondary },
            ]}
          >
            <InfoRow
              icon="calendar-outline"
              label={t('entry.date')}
              value={formatDate(entry.entryDate)}
            />
            {entry.dueDate && (
              <InfoRow
                icon="alarm-outline"
                label={t('entry.dueDate')}
                value={formatDate(entry.dueDate)}
                valueColor="#d97706"
              />
            )}
            {entry.note && (
              <InfoRow
                icon="chatbox-ellipses-outline"
                label={t('entry.description')}
                value={entry.note}
              />
            )}
            <InfoRow
              icon="time-outline"
              label={t('entry.createdAt')}
              value={formatDate(entry.createdAt)}
              isLast
            />
          </View>

          {/* Delete */}
          <ZButton
            variant="danger"
            fullWidth
            loading={isDeleting}
            onPress={() => setShowConfirm(true)}
            style={styles.deleteBtn}
          >
            {t('delete.confirm')}
          </ZButton>
        </ScrollView>
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
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[6],
  },
  typeBadge: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
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
  infoText: {
    flex: 1,
    gap: 2,
  },
  deleteBtn: {
    marginTop: Spacing[2],
  },
});
