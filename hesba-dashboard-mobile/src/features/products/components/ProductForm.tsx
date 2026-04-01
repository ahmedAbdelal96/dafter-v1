/**
 * ProductForm — slide-up modal for create / edit.
 *
 * Fields: name (required) | unitPrice (required) | category | unit | sku | description | isActive toggle
 * Handles: 409 SKU conflict → inline field error
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZModal } from '@/components/ui/ZModal';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useCreateProduct, useUpdateProduct, extractErrorMessage } from '../hooks/useProductMutations';
import { PRODUCT_ACCENT, type Product } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When provided — edit mode; else — create mode */
  editProduct?: Product | null;
}

interface FormState {
  name: string;
  unitPrice: string;
  category: string;
  unit: string;
  sku: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  unitPrice: '',
  category: '',
  unit: '',
  sku: '',
  description: '',
  isActive: true,
};

export function ProductForm({ visible, onClose, editProduct }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('products');
  const palette = isDark ? Colors.dark : Colors.light;

  const isEdit = !!editProduct;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // focus refs for chain
  const priceRef = useRef<TextInput>(null);
  const categoryRef = useRef<TextInput>(null);
  const unitRef = useRef<TextInput>(null);
  const skuRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(editProduct?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Populate form in edit mode
  useEffect(() => {
    if (visible && editProduct) {
      setForm({
        name: editProduct.name,
        unitPrice: editProduct.unitPrice,
        category: editProduct.category ?? '',
        unit: editProduct.unit ?? '',
        sku: editProduct.sku ?? '',
        description: editProduct.description ?? '',
        isActive: editProduct.isActive,
      });
    } else if (visible && !editProduct) {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [visible, editProduct]);

  const set = (field: keyof FormState) => (value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) {
      errs.name = t('validation.nameRequired');
    }
    const price = parseFloat(form.unitPrice);
    if (!form.unitPrice.trim() || isNaN(price)) {
      errs.unitPrice = t('validation.priceRequired');
    } else if (price < 0) {
      errs.unitPrice = t('validation.pricePositive');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      unitPrice: parseFloat(form.unitPrice),
      category: form.category.trim() || undefined,
      unit: form.unit.trim() || undefined,
      sku: form.sku.trim() || undefined,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
    };

    const onError = (error: unknown) => {
      const e = error as any;
      if (e?.response?.status === 409) {
        // SKU conflict
        setErrors((prev) => ({ ...prev, sku: t('validation.skuExists') }));
      }
    };

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: onClose,
        onError,
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: onClose,
        onError,
      });
    }
  }

  return (
    <ZModal
      visible={visible}
      onClose={onClose}
      title={isEdit ? t('form.edit') : t('form.create')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* ── Name ── */}
          <ZInput
            label={t('form.name')}
            placeholder={t('form.namePlaceholder')}
            value={form.name}
            onChangeText={set('name')}
            error={errors.name}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => priceRef.current?.focus()}
          />

          {/* ── Price ── */}
          <ZInput
            ref={priceRef}
            label={t('form.price')}
            placeholder={t('form.pricePlaceholder')}
            value={form.unitPrice}
            onChangeText={set('unitPrice')}
            error={errors.unitPrice}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => categoryRef.current?.focus()}
          />

          {/* ── Category + Unit row ── */}
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <ZInput
                ref={categoryRef}
                label={t('form.category')}
                placeholder={t('form.categoryPlaceholder')}
                value={form.category}
                onChangeText={set('category')}
                returnKeyType="next"
                onSubmitEditing={() => unitRef.current?.focus()}
              />
            </View>
            <View style={{ width: 100 }}>
              <ZInput
                ref={unitRef}
                label="الوحدة"
                placeholder="قطعة"
                value={form.unit}
                onChangeText={set('unit')}
                returnKeyType="next"
                onSubmitEditing={() => skuRef.current?.focus()}
              />
            </View>
          </View>

          {/* ── SKU ── */}
          <ZInput
            ref={skuRef}
            label={t('form.sku')}
            placeholder={t('form.skuPlaceholder')}
            value={form.sku}
            onChangeText={set('sku')}
            error={errors.sku}
            hint={t('form.skuHint')}
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={() => descRef.current?.focus()}
          />

          {/* ── Description ── */}
          <ZInput
            ref={descRef}
            label={t('form.description')}
            placeholder={t('form.descriptionPlaceholder')}
            value={form.description}
            onChangeText={set('description')}
            multiline
            numberOfLines={3}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* ── isActive toggle ── */}
          <View
            style={[
              styles.toggleRow,
              {
                backgroundColor: isDark ? Colors.dark.surface : '#f8fafc',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ZText weight="medium" size="sm" style={{ color: palette.text }}>
                {t('form.isActive')}
              </ZText>
              <ZText size="xs" variant="muted">
                {form.isActive ? 'ظاهر في الكتالوج' : 'مخفي من الكتالوج'}
              </ZText>
            </View>
            <Switch
              value={form.isActive}
              onValueChange={(v) => set('isActive')(v)}
              trackColor={{ false: '#d1d5db', true: `${PRODUCT_ACCENT}80` }}
              thumbColor={form.isActive ? PRODUCT_ACCENT : '#9ca3af'}
            />
          </View>
        </ScrollView>

        {/* ── Submit ── */}
        <ZButton
          title={isEdit ? t('form.save', { defaultValue: 'حفظ التعديلات' }) : t('form.create')}
          onPress={handleSubmit}
          loading={isPending}
          style={styles.submitBtn}
        />
      </KeyboardAvoidingView>
    </ZModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing[3],
    paddingBottom: Spacing[4],
  },
  row: {
    gap: Spacing[2],
    alignItems: 'flex-start',
  },
  toggleRow: {
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.xl,
    gap: Spacing[3],
  },
  submitBtn: {
    marginTop: Spacing[3],
  },
});
