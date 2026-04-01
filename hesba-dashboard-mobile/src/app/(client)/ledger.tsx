/**
 * Ledger Screen — Dual-mode
 *
 * Mode 1 — PartyPicker (no route params):
 *   3-tab selector (Customers | Suppliers | Employees)
 *   Tap a party → navigate back to this screen with params
 *
 * Mode 2 — StatementView (partyId + partyType + partyName params):
 *   Full paginated account statement with running balance per entry.
 *   - Slate header: party name + current balance
 *   - KPI strip: opening balance | total entries | closing balance
 *   - FlatList of entries (chronological, paginated)
 *   - Tap entry → EntryDetail (view + delete)
 *   - + button → EntryForm (create new entry)
 *
 * Navigation contract (from party detail screens):
 *   router.push({
 *     pathname: '/(client)/ledger',
 *     params: { partyId, partyType: 'CUSTOMER'|'SUPPLIER'|'EMPLOYEE', partyName }
 *   })
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { Colors, Spacing } from '@/constants/theme';

import { useStatement } from '@/features/ledger/hooks/useLedger';
import { StatementHeader } from '@/features/ledger/components/StatementHeader';
import EntryRow from '@/features/ledger/components/EntryRow';
import { LedgerSkeleton } from '@/features/ledger/components/LedgerSkeleton';
import { EntryDetail } from '@/features/ledger/components/EntryDetail';
import { EntryForm } from '@/features/ledger/components/EntryForm';
import { PartyPickerView } from '@/features/ledger/components/PartyPickerView';
import { LEDGER_ACCENT, type LedgerEntry, type PartyType } from '@/features/ledger/types';

const PAGE_SIZE = 20;

// ─── Statement View ────────────────────────────────────────────────────────────

function StatementView({
  partyId,
  partyType,
  partyName,
}: {
  partyId: string;
  partyType: PartyType;
  partyName: string;
}) {
  const { isDark } = useTheme();
  const { t } = useTranslation('ledger');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<LedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);

  // Reset when partyId changes (navigating to different party)
  const prevPartyId = useRef(partyId);
  useEffect(() => {
    if (prevPartyId.current !== partyId) {
      prevPartyId.current = partyId;
      setPage(1);
      setAllItems([]);
    }
  }, [partyId]);

  const queryParams = { partyType, partyId, page, limit: PAGE_SIZE };
  const { data, isLoading, isFetching, refetch, isError } = useStatement(queryParams);

  // Accumulate pages
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
  }, [data, page]);

  const hasMore = allItems.length < (data?.total ?? 0);

  function handleLoadMore() {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }

  function handleRefresh() {
    setPage(1);
    setAllItems([]);
    refetch();
  }

  // Reset after create/delete so the statement reloads fresh
  function handleMutationDone() {
    setPage(1);
    setAllItems([]);
    refetch();
  }

  const renderItem = useCallback(
    ({ item }: { item: LedgerEntry }) => (
      <EntryRow item={item} onPress={setSelectedEntry} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: LedgerEntry) => item.id, []);

  if (isError && allItems.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <StatementHeader
          partyName={partyName}
          partyType={partyType}
          statement={undefined}
          insetTop={insets.top}
          onAddEntry={() => setShowEntryForm(true)}
        />
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.textMuted} />
          <ZText variant="secondary" style={{ textAlign: 'center' }}>
            {t('errors.loadFailed')}
          </ZText>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <ZText style={{ color: LEDGER_ACCENT }}>{t('errors.retry')}</ZText>
          </TouchableOpacity>
        </View>
        <EntryForm
          visible={showEntryForm}
          partyId={partyId}
          partyType={partyType}
          partyName={partyName}
          onClose={() => {
            setShowEntryForm(false);
            handleMutationDone();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {isLoading && allItems.length === 0 ? (
        <>
          <StatementHeader
            partyName={partyName}
            partyType={partyType}
            statement={undefined}
            insetTop={insets.top}
            onAddEntry={() => setShowEntryForm(true)}
          />
          <LedgerSkeleton />
        </>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            allItems.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor={LEDGER_ACCENT}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <StatementHeader
              partyName={partyName}
              partyType={partyType}
              statement={data}
              insetTop={insets.top}
              onAddEntry={() => setShowEntryForm(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Ionicons name="book-outline" size={56} color={palette.textMuted} />
              <ZText
                weight="bold"
                style={{ color: palette.text, textAlign: 'center' }}
              >
                {t('statement.empty')}
              </ZText>
              <ZText
                variant="secondary"
                size="sm"
                style={{ textAlign: 'center' }}
              >
                {t('statement.emptyDesc')}
              </ZText>
              <TouchableOpacity
                style={[styles.addFirstBtn, { backgroundColor: LEDGER_ACCENT }]}
                onPress={() => setShowEntryForm(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <ZText size="sm" weight="bold" style={{ color: '#fff' }}>
                  {t('entry.create')}
                </ZText>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={LEDGER_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* Entry detail + delete */}
      <EntryDetail
        visible={!!selectedEntry}
        entry={selectedEntry}
        partyId={partyId}
        partyType={partyType}
        onClose={() => {
          setSelectedEntry(null);
          handleMutationDone();
        }}
      />

      {/* Create entry form */}
      <EntryForm
        visible={showEntryForm}
        partyId={partyId}
        partyType={partyType}
        partyName={partyName}
        onClose={() => {
          setShowEntryForm(false);
          handleMutationDone();
        }}
      />
    </View>
  );
}

// ─── Root Screen ──────────────────────────────────────────────────────────────

export default function LedgerScreen() {
  const params = useLocalSearchParams<{
    partyId?: string;
    partyType?: string;
    partyName?: string;
  }>();

  const isStatementMode =
    !!params.partyId && !!params.partyType && !!params.partyName;

  if (isStatementMode) {
    return (
      <StatementView
        partyId={params.partyId!}
        partyType={params.partyType as PartyType}
        partyName={decodeURIComponent(params.partyName!)}
      />
    );
  }

  return <PartyPickerView />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingBottom: Spacing[8],
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[6],
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  footerLoader: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: 24,
    marginTop: Spacing[2],
  },
});
