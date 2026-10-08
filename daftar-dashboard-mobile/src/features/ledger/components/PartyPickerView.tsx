/**
 * PartyPickerView — Party selector for the ledger screen.
 *
 * Shows 3 tabs (Customers | Suppliers | Employees).
 * Tapping a party navigates to the statement view via route params.
 *
 * Architecture:
 * - Only the active tab's query fires (conditional mount via `{activeTab === 'X' && ...}`)
 * - Each tab has its own search state to preserve search when switching back
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { ZAvatar } from '@/components/ui/ZAvatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useListCustomers } from '@/features/customers/hooks/useCustomers';
import { useListSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useListEmployees } from '@/features/employees/hooks/useEmployees';
import { LEDGER_ACCENT, toFloat, type PartyType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartyItem {
  id: string;
  name: string;
  phone?: string | null;
  balance: string | number;
  subtitle?: string | null; // jobTitle for employees
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { key: PartyType; i18nKey: string }[] = [
  { key: 'CUSTOMER', i18nKey: 'partyPicker.tabs.customers' },
  { key: 'SUPPLIER', i18nKey: 'partyPicker.tabs.suppliers' },
  { key: 'EMPLOYEE', i18nKey: 'partyPicker.tabs.employees' },
];

// ─── Party Row ────────────────────────────────────────────────────────────────

const PartyRow = React.memo(function PartyRow({
  item,
  partyType,
  onPress,
}: {
  item: PartyItem;
  partyType: PartyType;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  const balance = toFloat(item.balance);
  const balanceColor =
    balance > 0 ? '#16a34a' :
    balance < 0 ? '#dc2626' :
    palette.textMuted;
  const balanceBg =
    balance > 0 ? '#f0fdf4' :
    balance < 0 ? '#fef2f2' :
    isDark ? Colors.dark.surfaceSecondary : '#f1f5f9';

  return (
    <TouchableOpacity
      style={[
        styles.partyRow,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.white,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          shadowColor: isDark ? '#000' : '#64748b',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <ZAvatar name={item.name} size="md" />
      <View
        style={[
          styles.partyInfo,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <ZText weight="semibold" style={{ color: palette.text }}>
          {item.name}
        </ZText>
        {item.subtitle ? (
          <ZText size="xs" style={{ color: LEDGER_ACCENT }}>
            {item.subtitle}
          </ZText>
        ) : item.phone ? (
          <ZText size="sm" variant="secondary">
            {item.phone}
          </ZText>
        ) : null}
      </View>
      <View style={[styles.partyRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.balancePill, { backgroundColor: balanceBg }]}>
          <ZText size="xs" weight="bold" style={{ color: balanceColor }}>
            {Math.abs(balance).toLocaleString('ar-SA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </ZText>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
          size={16}
          color={palette.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
});

// ─── Tab Content ──────────────────────────────────────────────────────────────

function CustomerTab({ search, onPress }: { search: string; onPress: (item: PartyItem) => void }) {
  const { data, isLoading } = useListCustomers({ page: 1, limit: 50, search: search || undefined });
  const items: PartyItem[] = (data?.items ?? []).map((c) => ({
    id: c.id, name: c.name, phone: c.phone, balance: c.balance,
  }));
  return <TabList items={items} isLoading={isLoading} partyType="CUSTOMER" onPress={onPress} />;
}

function SupplierTab({ search, onPress }: { search: string; onPress: (item: PartyItem) => void }) {
  const { data, isLoading } = useListSuppliers({ page: 1, limit: 50, search: search || undefined });
  const items: PartyItem[] = (data?.items ?? []).map((s) => ({
    id: s.id, name: s.name, phone: s.phone, balance: s.balance,
  }));
  return <TabList items={items} isLoading={isLoading} partyType="SUPPLIER" onPress={onPress} />;
}

function EmployeeTab({ search, onPress }: { search: string; onPress: (item: PartyItem) => void }) {
  const { data, isLoading } = useListEmployees({ page: 1, limit: 50, search: search || undefined });
  const items: PartyItem[] = (data?.items ?? []).map((e) => ({
    id: e.id, name: e.name, phone: e.phone, balance: e.balance, subtitle: e.jobTitle,
  }));
  return <TabList items={items} isLoading={isLoading} partyType="EMPLOYEE" onPress={onPress} />;
}

function TabList({
  items,
  isLoading,
  partyType,
  onPress,
}: {
  items: PartyItem[];
  isLoading: boolean;
  partyType: PartyType;
  onPress: (item: PartyItem) => void;
}) {
  const { t } = useTranslation('ledger');
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  if (isLoading) {
    return (
      <View style={{ paddingTop: Spacing[3] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.partyRow, { backgroundColor: isDark ? Colors.dark.surface : Colors.white, flexDirection: 'row' }]}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: Spacing[2], paddingHorizontal: Spacing[3] }}>
              <Skeleton width={130} height={13} borderRadius={6} />
              <Skeleton width={80} height={11} borderRadius={5} />
            </View>
            <Skeleton width={64} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyCenter}>
        <Ionicons name="people-outline" size={48} color={palette.textMuted} />
        <ZText variant="secondary" style={{ textAlign: 'center' }}>
          {t('partyPicker.empty')}
        </ZText>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PartyRow
          item={item}
          partyType={partyType}
          onPress={() => onPress(item)}
        />
      )}
      contentContainerStyle={styles.tabList}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PartyPickerView() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('ledger');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<PartyType>('CUSTOMER');
  const [searches, setSearches] = useState<Record<PartyType, string>>({
    CUSTOMER: '', SUPPLIER: '', EMPLOYEE: '',
  });

  const search = searches[activeTab];

  const handlePartyPress = useCallback(
    (item: PartyItem, partyType: PartyType) => {
      router.push({
        pathname: '/(client)/ledger',
        params: { partyId: item.id, partyType, partyName: item.name },
      });
    },
    [router],
  );

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing[3], backgroundColor: LEDGER_ACCENT },
        ]}
      >
        <ZText weight="bold" size="xl" style={styles.headerTitle}>
          {t('title')}
        </ZText>

        {/* Search */}
        <View
          style={[
            styles.searchRow,
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('partyPicker.searchPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={search}
            onChangeText={(v) =>
              setSearches((prev) => ({ ...prev, [activeTab]: v }))
            }
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearches((prev) => ({ ...prev, [activeTab]: '' }))}
              activeOpacity={0.75}
            >
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? Colors.dark.surface : Colors.white,
            borderBottomColor: palette.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {TABS.map(({ key, i18nKey }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabBtn,
                isActive && { borderBottomColor: LEDGER_ACCENT, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.75}
            >
              <ZText
                size="sm"
                weight={isActive ? 'bold' : 'regular'}
                style={{ color: isActive ? LEDGER_ACCENT : palette.textSecondary }}
              >
                {t(i18nKey)}
              </ZText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === 'CUSTOMER' && (
        <CustomerTab
          search={search}
          onPress={(item) => handlePartyPress(item, 'CUSTOMER')}
        />
      )}
      {activeTab === 'SUPPLIER' && (
        <SupplierTab
          search={search}
          onPress={(item) => handlePartyPress(item, 'SUPPLIER')}
        />
      )}
      {activeTab === 'EMPLOYEE' && (
        <EmployeeTab
          search={search}
          onPress={(item) => handlePartyPress(item, 'EMPLOYEE')}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerTitle: { color: '#fff' },
  searchRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Platform.OS === 'ios' ? Spacing[2] : 0,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: Platform.OS === 'android' ? Spacing[2] : 0,
  },
  tabBar: {
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabList: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  partyRow: {
    alignItems: 'center',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: Radius.xl,
    padding: Spacing[3],
    gap: Spacing[3],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  partyInfo: {
    flex: 1,
    gap: 3,
  },
  partyRight: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  balancePill: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[8],
  },
});
