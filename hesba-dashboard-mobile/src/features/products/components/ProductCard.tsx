/**
 * ProductCard — compact list row for the products catalog.
 *
 * Shows: icon-box (teal) | name + category + SKU | price + active badge
 * Teal accent (#0d9488) throughout.
 */
import React, { memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZText } from '@/components/ui/ZText';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { PRODUCT_ACCENT, formatPrice, type Product } from '../types';

interface Props {
  item: Product;
  onPress: (id: string) => void;
}

const ProductCard = memo(function ProductCard({ item, onPress }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const palette = isDark ? Colors.dark : Colors.light;

  const price = formatPrice(item.unitPrice);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.surface : '#fff',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}
    >
      {/* ── Icon box ── */}
      <View style={[styles.iconBox, { backgroundColor: `${PRODUCT_ACCENT}15` }]}>
        <Ionicons name="cube-outline" size={22} color={PRODUCT_ACCENT} />
      </View>

      {/* ── Info ── */}
      <View style={[styles.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <ZText
          weight="bold"
          size="sm"
          numberOfLines={1}
          style={{ color: palette.text }}
        >
          {item.name}
        </ZText>

        <View
          style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {item.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: `${PRODUCT_ACCENT}12` }]}>
              <ZText size="xs" style={{ color: PRODUCT_ACCENT }}>
                {item.category}
              </ZText>
            </View>
          ) : null}

          {item.unit ? (
            <ZText size="xs" variant="muted">
              {item.unit}
            </ZText>
          ) : null}
        </View>

        {item.sku ? (
          <ZText size="xs" variant="muted" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            SKU: {item.sku}
          </ZText>
        ) : null}
      </View>

      {/* ── Price + status ── */}
      <View style={[styles.right, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
        <ZText weight="bold" style={{ color: PRODUCT_ACCENT, fontSize: 14 }}>
          {price}
        </ZText>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6',
            },
          ]}
        >
          <ZText
            size="xs"
            weight="medium"
            style={{ color: item.isActive ? '#16a34a' : '#6b7280' }}
          >
            {item.isActive ? '●' : '○'}
          </ZText>
        </View>
      </View>

      {/* ── Chevron ── */}
      <Ionicons
        name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
        size={15}
        color={palette.textMuted}
      />
    </TouchableOpacity>
  );
});

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  right: {
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
