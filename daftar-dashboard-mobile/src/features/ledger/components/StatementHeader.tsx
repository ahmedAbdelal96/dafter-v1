/**
 * StatementHeader — Hero header for the statement screen.
 *
 * Layout:
 *   ┌── Slate Hero ─────────────────────────────────────────────┐
 *   │  [← back]  Party Name  [+ add entry]                     │
 *   │  Current Balance (large, color-coded)                     │
 *   └────────────────────────────────────────────────────────────┘
 *   ┌── KPI Strip (overlaps hero) ──────────────────────────────┐
 *   │  رصيد أول المدة | عدد القيود | رصيد آخر المدة            │
 *   └────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { LEDGER_ACCENT, toFloat } from '../types';
import type { StatementResult, PartyType } from '../types';

interface StatementHeaderProps {
  partyName: string;
  partyType: PartyType;
  statement: StatementResult | undefined;
  insetTop: number;
  onAddEntry: () => void;
}

function formatMoney(value: string | number | null | undefined): string {
  const n = toFloat(value);
  return n.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PARTY_TYPE_ICONS: Record<PartyType, React.ComponentProps<typeof Ionicons>['name']> = {
  CUSTOMER: 'person-outline',
  SUPPLIER: 'business-outline',
  EMPLOYEE: 'id-card-outline',
};

export function StatementHeader({
  partyName,
  partyType,
  statement,
  insetTop,
  onAddEntry,
}: StatementHeaderProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('ledger');
  const router = useRouter();

  const currentBalance = toFloat(statement?.currentBalance);
  const balanceColor =
    currentBalance > 0 ? '#86efac' :
    currentBalance < 0 ? '#fca5a5' :
    'rgba(255,255,255,0.9)';

  const opening = toFloat(statement?.openingBalanceForPeriod);
  const closing = toFloat(statement?.closingBalanceForPeriod);
  const totalEntries = statement?.total ?? 0;

  return (
    <View>
      {/* ── Slate Hero ── */}
      <View
        style={[
          styles.hero,
          { paddingTop: insetTop + Spacing[3] },
          { backgroundColor: LEDGER_ACCENT },
        ]}
      >
        {/* Top row: back + title + add */}
        <View
          style={[
            styles.topRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

          <View
            style={[
              styles.titleBlock,
              { alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name={PARTY_TYPE_ICONS[partyType]}
              size={16}
              color="rgba(255,255,255,0.75)"
            />
            <ZText
              weight="bold"
              size="lg"
              style={styles.partyName}
              numberOfLines={1}
            >
              {partyName}
            </ZText>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={onAddEntry}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Balance */}
        <View style={styles.balanceBlock}>
          <ZText size="sm" style={styles.balanceLabel}>
            {t('statement.currentBalance')}
          </ZText>
          <ZText
            weight="bold"
            style={[styles.balanceValue, { color: balanceColor }]}
          >
            {formatMoney(currentBalance)}
          </ZText>
        </View>
      </View>

      {/* ── KPI Strip (white card, overlaps hero) ── */}
      <View
        style={[
          styles.kpiStrip,
          {
            backgroundColor: isDark ? Colors.dark.surface : Colors.white,
            shadowColor: isDark ? '#000' : '#475569',
          },
        ]}
      >
        <KpiCell
          label={t('statement.openingBalance')}
          value={formatMoney(opening)}
          valueColor={
            opening > 0 ? '#16a34a' :
            opening < 0 ? '#dc2626' :
            undefined
          }
        />
        <View style={styles.kpiDivider} />
        <KpiCell
          label={t('statement.totalEntries')}
          value={String(totalEntries)}
        />
        <View style={styles.kpiDivider} />
        <KpiCell
          label={t('statement.closingBalance')}
          value={formatMoney(closing)}
          valueColor={
            closing > 0 ? '#16a34a' :
            closing < 0 ? '#dc2626' :
            undefined
          }
        />
      </View>
    </View>
  );
}

function KpiCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.kpiCell}>
      <ZText size="xs" variant="secondary" style={styles.kpiLabel}>
        {label}
      </ZText>
      <ZText
        weight="bold"
        size="sm"
        style={{ color: valueColor ?? palette.text, textAlign: 'center' }}
      >
        {value}
      </ZText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  partyName: {
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBlock: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.75)',
  },
  balanceValue: {
    fontSize: 30,
    color: '#fff',
  },
  kpiStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginTop: -Spacing[6],
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    gap: 3,
  },
  kpiLabel: {
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    marginVertical: Spacing[2],
    backgroundColor: 'rgba(71,85,105,0.12)',
  },
});
