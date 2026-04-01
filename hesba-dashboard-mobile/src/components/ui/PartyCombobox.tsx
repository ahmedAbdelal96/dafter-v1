/**
 * PartyCombobox — Reusable searchable party selector
 *
 * A full-featured combobox for selecting any party type (Customer, Supplier,
 * Employee) from the backend via a debounced live search.
 *
 * Architecture decisions:
 *   - Renders as a pressable field that opens a slide-up search modal.
 *     This avoids the Z-index issues of inline dropdowns in ScrollViews.
 *   - Each partyType hits its own endpoint (/customers, /suppliers, /employees)
 *     but the combobox normalises results to { id, name, subtitle? }.
 *   - Results are NOT cached in React Query because:
 *     a) They change based on the live search text.
 *     b) The list is short (≤15 items), so re-fetching is cheap.
 *   - Debounce: 300ms — prevents a request on every keystroke.
 *   - Minimum 1 character to trigger search (prevents showing all records
 *     on first open, which could be thousands).
 *
 * Usage:
 *   <PartyCombobox
 *     partyType="CUSTOMER"
 *     value={selectedParty}
 *     onChange={(party) => setSelectedParty(party)}
 *     label="العميل"
 *     error={errors.partyId}
 *   />
 *
 *   // Selected party shape:
 *   interface SelectedParty { id: string; name: string }
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
} from 'react';
import {
  View,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from './ZText';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, FontSize, Fonts } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';

export interface SelectedParty {
  id: string;
  name: string;
}

export interface PartyComboboxProps {
  partyType: PartyType;
  value: SelectedParty | null;
  onChange: (party: SelectedParty | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

// ─── Party search result (normalised from all three endpoints) ─────────────

interface PartyOption {
  id: string;
  name: string;
  subtitle?: string; // phone / email / jobTitle
}

// ─── API search (raw Axios call — no React Query, intentional) ─────────────

async function searchParties(
  partyType: PartyType,
  search: string,
): Promise<PartyOption[]> {
  const endpointMap: Record<PartyType, string> = {
    CUSTOMER: API_ENDPOINTS.customers.list,
    SUPPLIER: API_ENDPOINTS.suppliers.list,
    EMPLOYEE: API_ENDPOINTS.employees.list,
  };

  const res = await apiClient.get<{
    data: Array<{
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      jobTitle?: string | null;
    }>;
  }>(endpointMap[partyType], {
    params: { search, limit: 15, page: 1 },
  });

  // Normalise to PartyOption — works for Customer, Supplier and Employee
  // (all three share `name` + optional `phone`/`jobTitle`)
  return (res.data.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    subtitle: item.phone ?? item.email ?? item.jobTitle ?? undefined,
  }));
}

// ─── Search Modal (internal) ──────────────────────────────────────────────────

interface SearchModalProps {
  visible: boolean;
  partyType: PartyType;
  onSelect: (party: SelectedParty) => void;
  onClose: () => void;
  labelMap: Record<PartyType, string>;
}

const SearchModal = memo(function SearchModal({
  visible,
  partyType,
  onSelect,
  onClose,
  labelMap,
}: SearchModalProps) {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;
  const fontReg = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PartyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // true after first search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<TextInput>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSearched(false);
      // Small delay to ensure the modal is fully rendered before focusing
      const t = setTimeout(() => searchRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Debounced search — fires on every query change including empty string
  // so the modal shows the first 15 results immediately on open.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Empty query = browse-all with limit 15 (no minimum-length guard)
    const delay = query.trim().length === 0 ? 0 : 300;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchParties(partyType, query.trim());
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, partyType]);

  const handleSelect = useCallback(
    (item: PartyOption) => {
      onSelect({ id: item.id, name: item.name });
      setQuery('');
      setResults([]);
    },
    [onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: PartyOption }) => (
      <TouchableOpacity
        style={[
          styles.resultItem,
          {
            borderBottomColor: palette.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.65}
      >
        {/* Avatar */}
        <View
          style={[
            styles.resultAvatar,
            { backgroundColor: isDark ? Colors.dark.surfaceTertiary : '#e0e7ff' },
          ]}
        >
          <ZText style={{ color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: '700' }}>
            {item.name.charAt(0).toUpperCase()}
          </ZText>
        </View>

        {/* Info */}
        <View style={[styles.resultInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <ZText weight="medium" size="sm" numberOfLines={1}>
            {item.name}
          </ZText>
          {item.subtitle ? (
            <ZText size="xs" variant="secondary" numberOfLines={1}>
              {item.subtitle}
            </ZText>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [handleSelect, palette.border, isRTL, isDark],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: isDark ? Colors.dark.surface : Colors.white },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.borderStrong }]} />

          {/* Header */}
          <View
            style={[
              styles.sheetHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: palette.border },
            ]}
          >
            <ZText weight="bold" size="lg">
              {labelMap[partyType]}
            </ZText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchWrapper, { borderBottomColor: palette.border }]}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f3f4f6',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={palette.textMuted} />
              <TextInput
                ref={searchRef}
                style={[
                  styles.searchInput,
                  {
                    fontFamily: fontReg,
                    color: palette.text,
                    textAlign: isRTL ? 'right' : 'left',
                  } as any,
                ]}
                placeholder="ابحث بالاسم..."
                placeholderTextColor={palette.textMuted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {loading && (
                <ActivityIndicator size="small" color={palette.textMuted} />
              )}
              {query.length > 0 && !loading && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={16} color={palette.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              loading ? null : searched ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="search-outline"
                    size={32}
                    color={palette.textMuted}
                  />
                  <ZText variant="secondary" size="sm">
                    لا توجد نتائج
                  </ZText>
                </View>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── PartyCombobox (exported) ─────────────────────────────────────────────────

const PARTY_LABEL_MAP: Record<PartyType, string> = {
  CUSTOMER: 'اختر عميلاً',
  SUPPLIER: 'اختر موردًا',
  EMPLOYEE: 'اختر موظفاً',
};

export const PartyCombobox = memo(function PartyCombobox({
  partyType,
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
}: PartyComboboxProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;
  const [modalVisible, setModalVisible] = useState(false);

  const displayPlaceholder = placeholder ?? PARTY_LABEL_MAP[partyType];

  const handleSelect = useCallback(
    (party: SelectedParty) => {
      onChange(party);
      setModalVisible(false);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <ZText
          size="sm"
          weight="medium"
          style={[
            styles.label,
            { color: palette.text, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {label}
        </ZText>
      )}

      {/* Trigger field */}
      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.75}
        style={[
          styles.trigger,
          {
            backgroundColor: isDark ? Colors.dark.surfaceSecondary : Colors.white,
            borderColor: error
              ? Colors.status.error
              : isDark
              ? Colors.dark.borderStrong
              : Colors.light.borderStrong,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {/* Selected value or placeholder */}
        <View style={styles.triggerContent}>
          {value ? (
            <>
              <ZText size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                {value.name}
              </ZText>
            </>
          ) : (
            <ZText
              size="sm"
              style={{ color: palette.textMuted, flex: 1, textAlign: isRTL ? 'right' : 'left' }}
              numberOfLines={1}
            >
              {displayPlaceholder}
            </ZText>
          )}
        </View>

        {/* Icons */}
        <View
          style={[
            styles.triggerIcons,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {value && !disabled && (
            <TouchableOpacity
              onPress={() => onChange(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          )}
          <Ionicons
            name="chevron-down"
            size={16}
            color={palette.textMuted}
          />
        </View>
      </TouchableOpacity>

      {/* Error message */}
      {error && (
        <ZText
          size="xs"
          style={[
            styles.errorText,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {error}
        </ZText>
      )}

      {/* Search modal */}
      <SearchModal
        visible={modalVisible}
        partyType={partyType}
        onSelect={handleSelect}
        onClose={() => setModalVisible(false)}
        labelMap={PARTY_LABEL_MAP}
      />
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    marginBottom: 2,
  },
  trigger: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
    minHeight: 48,
  },
  triggerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerIcons: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  errorText: {
    color: Colors.status.error,
    marginTop: 2,
  },

  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '75%',
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
  },
  sheetHeader: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    padding: Spacing[3],
    borderBottomWidth: 1,
  },
  searchBar: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignItems: 'center',
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    padding: 0,
    margin: 0,
  },
  resultsList: {
    flexGrow: 0,
  },
  resultItem: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing[3],
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[8],
    gap: Spacing[2],
  },
});
