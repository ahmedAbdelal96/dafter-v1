/**
 * Suppliers Screen (الموردون)
 *
 * Layout:
 *   ┌── Violet Header ──────────────────────────────────────────────┐
 *   │  الموردون  [count badge]  [+ Add]                             │
 *   │  [Search input]                                               │
 *   └── FlatList of SupplierCard ───────────────────────────────────┘
 *
 * - Search: 350ms debounce
 * - Pagination: PAGE_SIZE=20, accumulates in allItems state
 * - Tap card → SupplierDetail modal
 * - + button → SupplierForm (create) modal
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ZText } from "@/components/ui/ZText";
import { useTheme } from "@/stores/theme-store";
import { useLocale } from "@/stores/locale-store";
import { Colors, Spacing, Radius } from "@/constants/theme";
import SupplierCard from "@/features/suppliers/components/SupplierCard";
import { SupplierSkeleton } from "@/features/suppliers/components/SupplierSkeleton";
import { SupplierDetail } from "@/features/suppliers/components/SupplierDetail";
import { SupplierForm } from "@/features/suppliers/components/SupplierForm";
import { useListSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { SUPPLIER_ACCENT, type Supplier } from "@/features/suppliers/types";

const PAGE_SIZE = 20;

export default function SuppliersScreen() {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation("suppliers");
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;

  // ── State ───────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip on initial mount — avoids clearing allItems 350ms after data loads from cache
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllItems([]);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // ── Query ───────────────────────────────────────────────────────────────────
  const query = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };
  const { data, isLoading, isFetching, refetch, isError } =
    useListSuppliers(query);
  console.log("Suppliers query", {
    query,
    data,
    isLoading,
    isFetching,
    isError,
  });
  // ── Accumulate pages ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    setAllItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
  }, [data, page]);

  const totalCount = data?.meta?.total ?? 0;
  // Use hasNext from server — prevents infinite loop when page is out of range
  const hasMore = data?.meta?.hasNext ?? false;

  function handleLoadMore() {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }

  function handleRefresh() {
    setPage(1);
    setAllItems([]);
    refetch();
  }

  const renderItem = useCallback(
    ({ item }: { item: Supplier }) => (
      <SupplierCard item={item} onPress={setSelectedId} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Supplier) => item.id, []);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError && allItems.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: palette.background }]}>
        <Header
          title={t("title")}
          count={0}
          isRTL={isRTL}
          insets={insets}
          onAdd={() => setShowCreate(true)}
          search={search}
          onSearchChange={setSearch}
          t={t}
        />
        <View style={styles.errorCenter}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={palette.textMuted}
          />
          <ZText variant="secondary" style={{ textAlign: "center" }}>
            {t("errors.loadFailed")}
          </ZText>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <ZText style={{ color: SUPPLIER_ACCENT }}>
              {t("errors.retry")}
            </ZText>
          </TouchableOpacity>
        </View>
        <SupplierForm
          visible={showCreate}
          onClose={() => setShowCreate(false)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>
      {/* Header */}
      <Header
        title={t("title")}
        count={totalCount}
        isRTL={isRTL}
        insets={insets}
        onAdd={() => setShowCreate(true)}
        search={search}
        onSearchChange={setSearch}
        t={t}
      />

      {/* List */}
      {isLoading && allItems.length === 0 ? (
        <SupplierSkeleton />
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
              tintColor={SUPPLIER_ACCENT}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Ionicons
                name="business-outline"
                size={56}
                color={palette.textMuted}
              />
              <ZText
                weight="bold"
                style={{ color: palette.text, textAlign: "center" }}
              >
                {t("list.empty")}
              </ZText>
              <ZText
                variant="secondary"
                size="sm"
                style={{ textAlign: "center" }}
              >
                {t("list.emptyDesc")}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={SUPPLIER_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* Detail modal */}
      <SupplierDetail
        visible={!!selectedId}
        supplierId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Create modal */}
      <SupplierForm visible={showCreate} onClose={() => setShowCreate(false)} />
    </View>
  );
}

// ─── Header sub-component ──────────────────────────────────────────────────────

function Header({
  title,
  count,
  isRTL,
  insets,
  onAdd,
  search,
  onSearchChange,
  t,
}: {
  title: string;
  count: number;
  isRTL: boolean;
  insets: { top: number };
  onAdd: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  t: (key: string) => string;
}) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
      {/* Title row */}
      <View
        style={[
          styles.headerTitleRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.headerLeft,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <ZText weight="bold" size="xl" style={styles.headerTitle}>
            {title}
          </ZText>
          {count > 0 && (
            <View style={styles.countBadge}>
              <ZText size="xs" style={styles.countText}>
                {count}
              </ZText>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchRow,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            direction: isRTL ? "rtl" : "ltr",
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={16}
          color="rgba(255,255,255,0.7)"
        />
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? "right" : "left" }]}
          placeholder={t("list.searchPlaceholder")}
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: SUPPLIER_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  headerTitleRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    alignItems: "center",
    gap: Spacing[2],
  },
  headerTitle: {
    color: "#fff",
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    color: "#fff",
    fontWeight: "700",
  },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Platform.OS === "ios" ? Spacing[2] : 0,
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: Platform.OS === "android" ? Spacing[2] : 0,
  },
  list: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[8],
    gap: Spacing[3],
  },
  errorCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
    padding: Spacing[6],
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  footerLoader: {
    paddingVertical: Spacing[4],
    alignItems: "center",
  },
});
