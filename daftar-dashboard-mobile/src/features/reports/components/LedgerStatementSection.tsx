// ─── LedgerStatementSection ───────────────────────────────────────────────────
// Standalone section in AdvancedReportsTab that requires party selection
// before the ledger-statement report is fetched.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { PartyCombobox, type SelectedParty, type PartyType } from '@/components/ui/PartyCombobox';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/stores/theme-store';
import { REPORTS_ACCENT, toFloat, type DateRangeParams, type LedgerPartyType } from '../types';
import { useLedgerStatementReport } from '../hooks/useReports';

const PARTY_TYPES: PartyType[] = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE'];

function fmt(value: string | number) {
  return toFloat(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.statRow}>
      <ZText size="sm" style={{ color: palette.textSecondary }}>
        {label}
      </ZText>
      <ZText weight="bold" size="sm" style={{ color: palette.text }}>
        {value}
      </ZText>
    </View>
  );
}

export function LedgerStatementSection({ params }: { params: DateRangeParams }) {
  const { isDark } = useTheme();
  const { t } = useTranslation('reports');
  const palette = isDark ? Colors.dark : Colors.light;

  const [partyType, setPartyType] = useState<PartyType>('CUSTOMER');
  const [selectedParty, setSelectedParty] = useState<SelectedParty | null>(null);

  const queryParams =
    selectedParty !== null
      ? {
          partyType: partyType as LedgerPartyType,
          partyId: selectedParty.id,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }
      : null;

  const { data, isLoading, isError, refetch } = useLedgerStatementReport(queryParams);

  // Reset selected party when party type changes
  const handlePartyTypeChange = (pt: PartyType) => {
    setPartyType(pt);
    setSelectedParty(null);
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? Colors.dark.surface : '#fff' }]}>
      {/* Section title */}
      <ZText weight="bold" style={{ color: palette.text }}>
        {t('advanced.ledgerStatement.title')}
      </ZText>

      {/* Party type tabs */}
      <View style={[styles.tabRow, { borderColor: palette.border }]}>
        {PARTY_TYPES.map((pt) => {
          const active = pt === partyType;
          return (
            <TouchableOpacity
              key={pt}
              onPress={() => handlePartyTypeChange(pt)}
              style={[
                styles.tab,
                active && { backgroundColor: REPORTS_ACCENT },
              ]}
            >
              <ZText
                size="xs"
                weight={active ? 'bold' : 'regular'}
                style={{ color: active ? '#fff' : palette.textSecondary }}
              >
                {t(`advanced.ledgerStatement.partyType.${pt}`)}
              </ZText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Party picker */}
      <PartyCombobox
        partyType={partyType}
        value={selectedParty}
        onChange={setSelectedParty}
        label={t('advanced.ledgerStatement.selectParty')}
      />

      {/* Results */}
      {selectedParty === null && (
        <View style={styles.hint}>
          <Ionicons name="person-outline" size={28} color={palette.textMuted} />
          <ZText size="sm" variant="secondary">
            {t('advanced.ledgerStatement.hint')}
          </ZText>
        </View>
      )}

      {selectedParty !== null && isLoading && (
        <View style={styles.hint}>
          <ActivityIndicator color={REPORTS_ACCENT} />
        </View>
      )}

      {selectedParty !== null && isError && (
        <View style={styles.hint}>
          <Ionicons name="alert-circle-outline" size={28} color={palette.textMuted} />
          <ZText size="sm" variant="secondary">
            {t('errors.loadFailed')}
          </ZText>
          <TouchableOpacity onPress={() => void refetch()}>
            <ZText size="sm" style={{ color: REPORTS_ACCENT }}>
              {t('errors.retry')}
            </ZText>
          </TouchableOpacity>
        </View>
      )}

      {selectedParty !== null && data && (
        <View style={styles.statsBlock}>
          <StatRow
            label={t('advanced.ledgerStatement.openingBalance')}
            value={fmt(data.openingBalance)}
          />
          <StatRow
            label={t('advanced.ledgerStatement.totalDebit')}
            value={fmt(data.totalDebit)}
          />
          <StatRow
            label={t('advanced.ledgerStatement.totalCredit')}
            value={fmt(data.totalCredit)}
          />
          <StatRow
            label={t('advanced.ledgerStatement.closingBalance')}
            value={fmt(data.closingBalance)}
          />
          <StatRow
            label={t('advanced.ledgerStatement.currentBalance')}
            value={fmt(data.currentBalance)}
          />
          <StatRow
            label={t('advanced.ledgerStatement.entriesCount')}
            value={data.meta?.total ?? data.items.length}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },
  statsBlock: {
    gap: Spacing[2],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
