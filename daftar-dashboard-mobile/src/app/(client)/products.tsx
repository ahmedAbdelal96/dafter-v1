/**
 * Products Screen — كتالوج المنتجات
 *
 * Layout:
 *   ┌── Teal Header ──────────────────────────────────────────────┐
 *   │  كتالوج المنتجات   [count badge]              [+ إضافة]    │
 *   │  🔍 Search bar                                              │
 *   └─────────────────────────────────────────────────────────────┘
 *   Filter strip: All | Active | Inactive | [category chips]
 *   FlatList of ProductCard rows
 *   ─────────────────────────────────────────────────────────────
 *   Tap card → ProductDetail modal (view + edit + toggle + delete)
 *   Tap + → ProductForm modal (create)
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useProducts } from '@/features/products/hooks/useProducts';
import ProductCard from '@/features/products/components/ProductCard';
import { ProductListSkeleton } from '@/features/products/components/ProductSkeleton';
import { ProductDetail } from '@/features/products/components/ProductDetail';
import { ProductForm } from '@/features/products/components/ProductForm';
import { PRODUCT_ACCENT, type Product, type ProductsQuery } from '@/features/products/types';

// ─── Filter types ─────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const { isDark } = useTheme();
  const { isRTL, fontLocale } = useLocale();
  const { t } = useTranslation('products');
  const insets = useSafeAreaInsets();
  const palette = isDark ? Colors.dark : Colors.light;
  const fontFamily = fontLocale === 'arabic' ? Fonts.arabic.regular : Fonts.latin.regular;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Product[]>([]);
  const isFirstRender = useRef(true);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination when filters change
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
    setAllItems([]);
  }, [debouncedSearch, statusFilter, selectedCategory]);

  // ── Query params ──────────────────────────────────────────────────────────
  const queryParams: ProductsQuery = useMemo(() => ({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    category: selectedCategory ?? undefined,
    isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
  }), [page, debouncedSearch, statusFilter, selectedCategory]);

  const { data, isLoading, isFetching, refetch } = useProducts(queryParams);

  // Accumulate pages
  useEffect(() => {
    if (data?.items) {
      setAllItems((prev) =>
        page === 1 ? data.items : [...prev, ...data.items],
      );
    }
  }, [data, page]);

  // Collect unique categories from loaded items for filter chips
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [allItems]);

  const total = data?.meta.total ?? 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCardPress = useCallback((id: string) => {
    setSelectedProductId(id);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const product = allItems.find((p) => p.id === id);
    if (product) {
      setEditProduct(product);
    }
  }, [allItems]);

  const handleDetailClose = useCallback(() => {
    setSelectedProductId(null);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowCreateForm(false);
    setEditProduct(null);
    setPage(1);
    setAllItems([]);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (allItems.length < total && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [allItems.length, total, isFetching]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    setAllItems([]);
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  // ── Status filter chips ────────────────────────────────────────────────────
  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: t('filter.allCategories').replace('الفئات', 'الكل').replace('Categories', 'All') },
    { key: 'ACTIVE', label: t('filter.active').replace(' فقط', '').replace(' only', '') },
    { key: 'INACTIVE', label: t('filter.inactive').replace(' فقط', '').replace(' only', '') },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: palette.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing[3] }]}>
        {/* Title row */}
        <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.titleLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ZText weight="bold" size="xl" style={styles.headerTitle}>
              {t('list.title')}
            </ZText>
            {total > 0 && (
              <View style={styles.countBadge}>
                <ZText size="xs" weight="bold" style={{ color: PRODUCT_ACCENT }}>
                  {total}
                </ZText>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreateForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchBar,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            style={[
              styles.searchInput,
              {
                fontFamily,
                textAlign: isRTL ? 'right' : 'left',
                color: '#1f2937',
              },
            ]}
            placeholder={t('list.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter strip ── */}
      <View
        style={[
          styles.filterStrip,
          { backgroundColor: isDark ? Colors.dark.surface : '#fff', borderBottomColor: palette.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterScroll,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Status chips */}
          {STATUS_FILTERS.map((sf) => {
            const active = statusFilter === sf.key;
            return (
              <TouchableOpacity
                key={sf.key}
                style={[
                  styles.chip,
                  { backgroundColor: active ? PRODUCT_ACCENT : (isDark ? '#374151' : '#f1f5f9') },
                ]}
                onPress={() => { setStatusFilter(sf.key); setSelectedCategory(null); }}
                activeOpacity={0.75}
              >
                <ZText
                  size="xs"
                  weight={active ? 'bold' : 'regular'}
                  style={{ color: active ? '#fff' : palette.textSecondary }}
                >
                  {sf.label}
                </ZText>
              </TouchableOpacity>
            );
          })}

          {/* Separator */}
          {categories.length > 0 && (
            <View style={styles.chipSeparator} />
          )}

          {/* Category chips */}
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? `${PRODUCT_ACCENT}20`
                      : (isDark ? '#374151' : '#f1f5f9'),
                    borderWidth: active ? 1 : 0,
                    borderColor: active ? PRODUCT_ACCENT : 'transparent',
                  },
                ]}
                onPress={() => setSelectedCategory(active ? null : cat)}
                activeOpacity={0.75}
              >
                <ZText
                  size="xs"
                  weight={active ? 'bold' : 'regular'}
                  style={{ color: active ? PRODUCT_ACCENT : palette.textSecondary }}
                >
                  {cat}
                </ZText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {isLoading && page === 1 ? (
        <ProductListSkeleton count={7} />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            allItems.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor={PRODUCT_ACCENT}
              colors={[PRODUCT_ACCENT]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={56} color={palette.textMuted} />
              <ZText weight="bold" style={{ color: palette.text, textAlign: 'center' }}>
                {t('list.empty')}
              </ZText>
              <ZText variant="secondary" size="sm" style={{ textAlign: 'center' }}>
                {t('list.emptyDesc')}
              </ZText>
            </View>
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View style={{ padding: Spacing[4], alignItems: 'center' }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={PRODUCT_ACCENT} />
              </View>
            ) : null
          }
        />
      )}

      {/* ── Detail modal ── */}
      <ProductDetail
        productId={selectedProductId}
        onClose={handleDetailClose}
        onEdit={handleEdit}
      />

      {/* ── Create form ── */}
      <ProductForm
        visible={showCreateForm}
        onClose={handleFormClose}
      />

      {/* ── Edit form ── */}
      <ProductForm
        visible={!!editProduct}
        onClose={handleFormClose}
        editProduct={editProduct}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: PRODUCT_ACCENT,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerTitle: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search bar (white pill inside header)
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    alignItems: 'center',
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    margin: 0,
  },

  // Filter strip
  filterStrip: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  chipSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginHorizontal: Spacing[1],
  },

  // List
  list: {
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  emptyList: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
});
