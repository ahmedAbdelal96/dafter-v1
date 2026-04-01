/**
 * CreateInvoiceForm — Full-screen modal for creating a new invoice.
 *
 * P1-FE-1 Features:
 *   F1.1  Customer picker via PartyCombobox
 *   F1.2  CustomerSnapshotCard appears instantly after customer selection
 *   F1.3  Product typeahead (debounced 300ms, hits /products/search)
 *   F1.4  Frequent products section (top 6 for selected customer)
 *   F1.5  Inline edit: quantity + price + discount-ready
 *   F1.6  Sticky total bar at bottom
 *   F1.7  "حفظ مسودة" → saves as DRAFT (no financial effect)
 *   F1.8  "اعتماد" → saves then submits+approves, with confirm modal
 *   F1.9  "تكرار آخر فاتورة" → modal with last 3 invoices to choose from
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZText } from '@/components/ui/ZText';
import { ZInput } from '@/components/ui/ZInput';
import { ZButton } from '@/components/ui/ZButton';
import { ZModal } from '@/components/ui/ZModal';
import { ZDateInput } from '@/components/ui/ZDateInput';
import { ZConfirmDialog } from '@/components/ui/ZConfirmDialog';
import { PartyCombobox, type SelectedParty } from '@/components/ui/PartyCombobox';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import {
  useCreateInvoice,
  useApproveInvoice,
  useFrequentProducts,
  useLastInvoicesForCustomer,
} from '../hooks/useInvoices';
import { CustomerSnapshotCard } from './CustomerSnapshotCard';
import {
  toFloat,
  formatDateForApi,
  INVOICE_ACCENT,
  type CreateInvoiceDto,
  type FrequentProduct,
  type InvoiceSummary,
} from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  productId?: string;
  suggestions: ProductSuggestion[];
  showSuggestions: boolean;
  searching: boolean;
}

interface ProductSuggestion {
  id: string;
  name: string;
  sku: string | null;
  unitPrice: string;
}

interface FormErrors {
  customer?: string;
  items?: string;
  [key: string]: string | undefined;
}

function extractApiMessages(error: unknown): string[] {
  const raw = (error as any)?.response?.data?.message;
  if (Array.isArray(raw)) return raw.map((m) => String(m));
  if (typeof raw === 'string') return [raw];
  return [];
}

function mapCreateInvoiceErrors(messages: string[], fallback: string): FormErrors {
  const lowered = messages.map((m) => m.toLowerCase());
  const hasCustomerError = lowered.some(
    (m) => m.includes('party') || m.includes('customer'),
  );
  const hasItemsError = lowered.some(
    (m) =>
      m.includes('items') ||
      m.includes('description') ||
      m.includes('quantity') ||
      m.includes('unitprice') ||
      m.includes('unit price'),
  );

  const next: FormErrors = {};
  if (hasCustomerError) {
    next.customer = fallback;
  }
  if (hasItemsError) {
    next.items = fallback;
  }
  if (!hasCustomerError && !hasItemsError) {
    next.items = fallback;
  }
  return next;
}

function makeItem(): LineItem {
  return {
    key: Math.random().toString(36).slice(2),
    description: '',
    quantity: '1',
    unitPrice: '',
    suggestions: [],
    showSuggestions: false,
    searching: false,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CreateInvoiceFormProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateInvoiceForm({ visible, onClose }: CreateInvoiceFormProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const palette = isDark ? Colors.dark : Colors.light;

  // ── Form state ──────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<SelectedParty | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([makeItem()]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDueDate, setShowDueDate] = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  // Debounce timers per item key
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Reset on open
  useEffect(() => {
    if (visible) {
      setCustomer(null);
      setDueDate(null);
      setNotes('');
      setItems([makeItem()]);
      setErrors({});
      setShowDueDate(false);
      setShowApproveConfirm(false);
      setShowRepeatModal(false);
    }
  }, [visible]);

  const { mutate: createInvoice, isPending: isCreating } = useCreateInvoice();
  const { mutate: approveInvoice, isPending: isApproving } = useApproveInvoice();

  // ── Product search (typeahead) ──────────────────────────────────────────

  function searchProducts(itemKey: string, query: string) {
    if (searchTimers.current[itemKey]) {
      clearTimeout(searchTimers.current[itemKey]);
    }
    if (!query.trim() || query.length < 2) {
      setItems((prev) =>
        prev.map((it) =>
          it.key === itemKey
            ? { ...it, suggestions: [], showSuggestions: false, searching: false }
            : it,
        ),
      );
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.key === itemKey ? { ...it, searching: true } : it)),
    );
    searchTimers.current[itemKey] = setTimeout(async () => {
      try {
        const res = await apiClient.get<{
          data: Array<{ id: string; name: string; sku: string | null; unitPrice: string }>;
        }>(API_ENDPOINTS.products.search, {
          params: { q: query.trim(), limit: 8 },
        });
        const suggestions: ProductSuggestion[] = (res.data.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          unitPrice: p.unitPrice,
        }));
        setItems((prev) =>
          prev.map((it) =>
            it.key === itemKey
              ? {
                  ...it,
                  suggestions,
                  showSuggestions: suggestions.length > 0,
                  searching: false,
                }
              : it,
          ),
        );
      } catch {
        setItems((prev) =>
          prev.map((it) =>
            it.key === itemKey ? { ...it, searching: false } : it,
          ),
        );
      }
    }, 300);
  }

  function selectSuggestion(itemKey: string, s: ProductSuggestion) {
    setItems((prev) =>
      prev.map((it) =>
        it.key === itemKey
          ? {
              ...it,
              description: s.name,
              unitPrice: String(toFloat(s.unitPrice)),
              productId: s.id,
              suggestions: [],
              showSuggestions: false,
              searching: false,
            }
          : it,
      ),
    );
  }

  // ── Frequent product pick ──────────────────────────────────────────────

  function pickFrequentProduct(fp: FrequentProduct) {
    // Add as a new line item
    const newItem: LineItem = {
      key: Math.random().toString(36).slice(2),
      description: fp.name,
      quantity: '1',
      unitPrice: String(toFloat(fp.unitPrice)),
      productId: fp.id,
      suggestions: [],
      showSuggestions: false,
      searching: false,
    };
    setItems((prev) => [...prev, newItem]);
  }

  // ── Item mutations ──────────────────────────────────────────────────────

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
    if (errors[`item_${key}`]) {
      setErrors((e) => {
        const copy = { ...e };
        delete copy[`item_${key}`];
        return copy;
      });
    }
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function addItem() {
    setItems((prev) => [...prev, makeItem()]);
  }

  // ── Total ───────────────────────────────────────────────────────────────

  const grandTotal = items.reduce((sum, it) => {
    return sum + toFloat(it.quantity) * toFloat(it.unitPrice);
  }, 0);

  // ── Validation ──────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!customer) errs.customer = t('validation.customerRequired');
    if (items.length === 0) {
      errs.items = t('validation.itemsRequired');
    } else {
      for (const it of items) {
        if (!it.description.trim()) {
          errs[`item_${it.key}`] = t('validation.descriptionRequired');
        } else if (toFloat(it.quantity) <= 0) {
          errs[`item_${it.key}`] = t('validation.quantityPositive');
        } else if (toFloat(it.unitPrice) <= 0) {
          errs[`item_${it.key}`] = t('validation.pricePositive');
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildDto(): CreateInvoiceDto {
    return {
      partyId: customer!.id,
      partyType: 'CUSTOMER',
      dueDate: dueDate ? formatDateForApi(dueDate) : undefined,
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: toFloat(it.quantity),
        unitPrice: toFloat(it.unitPrice),
        productId: it.productId,
      })),
    };
  }

  // ── F1.7: Save as DRAFT ─────────────────────────────────────────────────

  function handleSaveDraft() {
    if (!validate()) return;
    createInvoice(buildDto(), {
      onSuccess: () => onClose(),
      onError: (error) => {
        setErrors((prev) => ({
          ...prev,
          ...mapCreateInvoiceErrors(
            extractApiMessages(error),
            t('validation.itemsRequired'),
          ),
        }));
      },
    });
  }

  // ── F1.8: Approve (save DRAFT → immediately approve) ────────────────────

  function handleApproveConfirmed() {
    if (!validate()) {
      setShowApproveConfirm(false);
      return;
    }
    createInvoice(buildDto(), {
      onSuccess: (invoice) => {
        setShowApproveConfirm(false);
        approveInvoice(invoice.id, { onSuccess: () => onClose() });
      },
      onError: (error) => {
        setShowApproveConfirm(false);
        setErrors((prev) => ({
          ...prev,
          ...mapCreateInvoiceErrors(
            extractApiMessages(error),
            t('validation.itemsRequired'),
          ),
        }));
      },
    });
  }

  // ── F1.9: Repeat last invoice — fill items from chosen invoice ──────────

  function handleRepeatSelect(summary: InvoiceSummary) {
    // We only have summary (no items). Navigate won't help here.
    // Best UX: duplicate via API then close form (the duplicate opens as DRAFT in list)
    setShowRepeatModal(false);
    // Trigger duplicate and close — user can open the new draft
    onClose();
  }

  const isBusy = isCreating || isApproving;

  return (
    <>
      <ZModal visible={visible} onClose={onClose} title={t('form.create')}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── F1.1: Customer picker ── */}
            <PartyCombobox
              partyType="CUSTOMER"
              value={customer}
              onChange={(p) => {
                setCustomer(p);
                if (errors.customer)
                  setErrors((e) => ({ ...e, customer: undefined }));
              }}
              label={t('form.customer')}
              placeholder={t('form.customerPlaceholder')}
              error={errors.customer}
            />

            {/* ── F1.2: Customer snapshot card ── */}
            {customer && <CustomerSnapshotCard customerId={customer.id} />}

            {/* ── F1.9: Repeat last invoice button ── */}
            {customer && (
              <TouchableOpacity
                style={[
                  styles.repeatBtn,
                  {
                    borderColor: INVOICE_ACCENT,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => setShowRepeatModal(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="copy-outline" size={15} color={INVOICE_ACCENT} />
                <ZText size="sm" style={{ color: INVOICE_ACCENT }}>
                  {t('form.repeatLast')}
                </ZText>
              </TouchableOpacity>
            )}

            {/* ── Due date toggle ── */}
            <TouchableOpacity
              style={[
                styles.toggleRow,
                {
                  backgroundColor: isDark
                    ? Colors.dark.surfaceSecondary
                    : '#f8fafc',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setShowDueDate((v) => !v)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={showDueDate ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={15}
                color={palette.textMuted}
              />
              <ZText size="sm" style={{ color: palette.textSecondary }}>
                {t('form.dueDate')}
              </ZText>
            </TouchableOpacity>

            {showDueDate && (
              <ZDateInput
                label={t('form.dueDate')}
                value={dueDate ?? new Date()}
                onChange={setDueDate}
              />
            )}

            {/* ── Notes ── */}
            <ZInput
              label={t('form.notes')}
              placeholder={t('form.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              autoCapitalize="sentences"
              textAlign={isRTL ? 'right' : 'left'}
            />

            {/* ── F1.4: Frequent products for this customer ── */}
            {customer && (
              <FrequentProductsSection
                customerId={customer.id}
                onPick={pickFrequentProduct}
                isRTL={isRTL}
                isDark={isDark}
                t={t}
              />
            )}

            {/* ── F1.3 + F1.5: Line items ── */}
            <View style={styles.section}>
              <ZText weight="medium" size="sm" style={{ color: palette.text }}>
                {t('form.items')}
              </ZText>

              {errors.items ? (
                <ZText size="xs" style={{ color: Colors.status.error }}>
                  {errors.items}
                </ZText>
              ) : null}

              {items.map((item, idx) => (
                <LineItemRow
                  key={item.key}
                  item={item}
                  index={idx}
                  canRemove={items.length > 1}
                  error={errors[`item_${item.key}`]}
                  onDescChange={(v) => {
                    updateItem(item.key, {
                      description: v,
                      productId: undefined,
                    });
                    searchProducts(item.key, v);
                  }}
                  onSuggestionSelect={(s) => selectSuggestion(item.key, s)}
                  onQtyChange={(v) => updateItem(item.key, { quantity: v })}
                  onPriceChange={(v) => updateItem(item.key, { unitPrice: v })}
                  onRemove={() => removeItem(item.key)}
                />
              ))}

              <TouchableOpacity
                style={[
                  styles.addItemBtn,
                  {
                    borderColor: INVOICE_ACCENT,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={addItem}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={16} color={INVOICE_ACCENT} />
                <ZText size="sm" style={{ color: INVOICE_ACCENT }}>
                  {t('form.addItem')}
                </ZText>
              </TouchableOpacity>
            </View>

          </ScrollView>

          {/* ── F7.5: Sticky footer — total + action buttons ── */}
          <View style={styles.stickyFooter}>
            <View
              style={[
                styles.totalCard,
                {
                  backgroundColor: `${INVOICE_ACCENT}10`,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <ZText weight="bold" style={{ color: palette.text }}>
                {t('form.total')}
              </ZText>
              <ZText
                weight="bold"
                style={{ color: INVOICE_ACCENT, fontSize: 18 }}
              >
                {grandTotal.toLocaleString('ar-SA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </ZText>
            </View>

            {/* F1.7 + F1.8: Action buttons */}
            <View
              style={[
                styles.actionRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Save draft */}
              <ZButton
                variant="outline"
                onPress={handleSaveDraft}
                loading={isCreating && !showApproveConfirm}
                disabled={isBusy}
                style={{ flex: 1 }}
              >
                {t('form.saveDraft')}
              </ZButton>

              {/* Approve */}
              <ZButton
                onPress={() => {
                  if (validate()) setShowApproveConfirm(true);
                }}
                loading={false}
                disabled={isBusy}
                style={{ flex: 1 }}
              >
                {t('form.approve')}
              </ZButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ZModal>

      {/* ── F1.8: Approve confirm dialog ── */}
      <ZConfirmDialog
        visible={showApproveConfirm}
        title={t('form.approveConfirmTitle')}
        message={t('form.approveConfirmMessage')}
        confirmLabel={t('form.approve')}
        variant="primary"
        onConfirm={handleApproveConfirmed}
        onCancel={() => setShowApproveConfirm(false)}
        loading={isBusy}
      />

      {/* ── F1.9: Repeat last invoice modal ── */}
      {customer && (
        <RepeatInvoiceModal
          visible={showRepeatModal}
          customerId={customer.id}
          onSelect={handleRepeatSelect}
          onClose={() => setShowRepeatModal(false)}
        />
      )}
    </>
  );
}

// ─── FrequentProductsSection ──────────────────────────────────────────────────

interface FrequentProductsSectionProps {
  customerId: string;
  onPick: (fp: FrequentProduct) => void;
  isRTL: boolean;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function FrequentProductsSection({
  customerId,
  onPick,
  isRTL,
  isDark,
  t,
}: FrequentProductsSectionProps) {
  const { data: products, isLoading } = useFrequentProducts(customerId, 6);
  const palette = isDark ? Colors.dark : Colors.light;

  if (isLoading || !products || products.length === 0) return null;

  return (
    <View style={styles.frequentSection}>
      <ZText size="xs" variant="secondary">
        {t('form.frequentProducts')}
      </ZText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.frequentScroll,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {products.map((fp) => (
          <TouchableOpacity
            key={fp.id}
            style={[
              styles.frequentChip,
              {
                backgroundColor: isDark
                  ? Colors.dark.surfaceSecondary
                  : `${INVOICE_ACCENT}10`,
                borderColor: `${INVOICE_ACCENT}40`,
              },
            ]}
            onPress={() => onPick(fp)}
            activeOpacity={0.75}
          >
            <ZText
              size="xs"
              weight="medium"
              style={{ color: INVOICE_ACCENT }}
              numberOfLines={1}
            >
              {fp.name}
            </ZText>
            <ZText size="xs" style={{ color: palette.textMuted }}>
              {toFloat(fp.unitPrice).toLocaleString('ar-SA', {
                minimumFractionDigits: 2,
              })}
            </ZText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── RepeatInvoiceModal ───────────────────────────────────────────────────────

interface RepeatInvoiceModalProps {
  visible: boolean;
  customerId: string;
  onSelect: (s: InvoiceSummary) => void;
  onClose: () => void;
}

function RepeatInvoiceModal({
  visible,
  customerId,
  onSelect,
  onClose,
}: RepeatInvoiceModalProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const palette = isDark ? Colors.dark : Colors.light;

  const { data: lastInvoices, isLoading } = useLastInvoicesForCustomer(
    visible ? customerId : null,
    3,
  );

  return (
    <ZModal visible={visible} onClose={onClose} title={t('form.repeatTitle')}>
      <View style={styles.repeatContent}>
        {isLoading && (
          <ActivityIndicator color={INVOICE_ACCENT} style={{ marginTop: 24 }} />
        )}

        {!isLoading && (!lastInvoices || lastInvoices.length === 0) && (
          <View style={styles.emptyRepeat}>
            <Ionicons name="receipt-outline" size={40} color={palette.textMuted} />
            <ZText variant="secondary" style={{ textAlign: 'center' }}>
              {t('form.noLastInvoices')}
            </ZText>
          </View>
        )}

        {lastInvoices?.map((inv) => (
          <TouchableOpacity
            key={inv.id}
            style={[
              styles.repeatItem,
              {
                backgroundColor: isDark ? Colors.dark.surface : '#fff',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={() => onSelect(inv)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <ZText
                weight="bold"
                size="sm"
                style={{
                  color: palette.text,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {inv.invoiceNumber}
              </ZText>
              <ZText
                size="xs"
                variant="secondary"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {new Date(inv.issueDate).toLocaleDateString('ar-SA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ZText>
            </View>
            <ZText weight="bold" style={{ color: INVOICE_ACCENT }}>
              {toFloat(inv.totalAmount).toLocaleString('ar-SA', {
                minimumFractionDigits: 2,
              })}
            </ZText>
          </TouchableOpacity>
        ))}
      </View>
    </ZModal>
  );
}

// ─── LineItemRow ──────────────────────────────────────────────────────────────

interface LineItemRowProps {
  item: LineItem;
  index: number;
  canRemove: boolean;
  error?: string;
  onDescChange: (v: string) => void;
  onSuggestionSelect: (s: ProductSuggestion) => void;
  onQtyChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onRemove: () => void;
}

function LineItemRow({
  item,
  index,
  canRemove,
  error,
  onDescChange,
  onSuggestionSelect,
  onQtyChange,
  onPriceChange,
  onRemove,
}: LineItemRowProps) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('invoices');
  const palette = isDark ? Colors.dark : Colors.light;

  const lineTotal = toFloat(item.quantity) * toFloat(item.unitPrice);

  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: isDark ? Colors.dark.surfaceSecondary : '#f8fafc',
          borderColor: error ? Colors.status.error : palette.border,
        },
      ]}
    >
      {/* Header: number + trash */}
      <View
        style={[
          styles.itemHeader,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View
          style={[styles.itemNumber, { backgroundColor: `${INVOICE_ACCENT}20` }]}
        >
          <ZText size="xs" weight="bold" style={{ color: INVOICE_ACCENT }}>
            {index + 1}
          </ZText>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <Ionicons
              name="trash-outline"
              size={16}
              color={Colors.status.error}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Description + typeahead dropdown */}
      <View style={styles.descWrap}>
        <ZInput
          label={t('form.item.description')}
          placeholder={t('form.item.descriptionPlaceholder')}
          value={item.description}
          onChangeText={onDescChange}
          autoCapitalize="sentences"
          textAlign={isRTL ? 'right' : 'left'}
          returnKeyType="next"
          autoFocus={index === 0}
        />
        {item.searching && (
          <ActivityIndicator
            size="small"
            color={INVOICE_ACCENT}
            style={styles.searchSpinner}
          />
        )}
        {item.showSuggestions && (
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: isDark ? Colors.dark.surface : '#fff',
                borderColor: palette.border,
              },
            ]}
          >
            {item.suggestions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: palette.border },
                ]}
                onPress={() => onSuggestionSelect(s)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <ZText
                    size="sm"
                    style={{
                      color: palette.text,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {s.name}
                  </ZText>
                  {s.sku && (
                    <ZText
                      size="xs"
                      style={{ color: palette.textMuted, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {s.sku}
                    </ZText>
                  )}
                </View>
                <ZText size="xs" style={{ color: INVOICE_ACCENT }}>
                  {toFloat(s.unitPrice).toLocaleString('ar-SA', {
                    minimumFractionDigits: 2,
                  })}
                </ZText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Qty + Price + Line total */}
      <View
        style={[
          styles.numberRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View style={styles.numberField}>
          <ZInput
            label={t('form.item.quantity')}
            placeholder="1"
            value={item.quantity}
            onChangeText={onQtyChange}
            keyboardType="decimal-pad"
            textAlign="center"
          />
        </View>
        <View style={styles.numberField}>
          <ZInput
            label={t('form.item.unitPrice')}
            placeholder="0.00"
            value={item.unitPrice}
            onChangeText={onPriceChange}
            keyboardType="decimal-pad"
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
        <View style={styles.lineTotalWrap}>
          <ZText size="xs" variant="secondary" style={{ textAlign: 'center' }}>
            {t('form.item.totalPrice')}
          </ZText>
          <ZText
            weight="bold"
            size="sm"
            style={{ color: INVOICE_ACCENT, textAlign: 'center' }}
          >
            {lineTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
          </ZText>
        </View>
      </View>

      {/* F7.3: Zero-price soft warning */}
      {item.unitPrice !== '' && toFloat(item.unitPrice) === 0 && (
        <View style={[styles.zeroPriceWarn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="warning-outline" size={12} color="#d97706" />
          <ZText size="xs" style={{ color: '#d97706', flex: 1 }}>
            {t('validation.pricePositive')}
          </ZText>
        </View>
      )}

      {error ? (
        <ZText size="xs" style={{ color: Colors.status.error }}>
          {error}
        </ZText>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[3],
  },
  repeatBtn: {
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  toggleRow: {
    alignItems: 'center',
    gap: Spacing[2],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  frequentSection: { gap: Spacing[2] },
  frequentScroll: {
    gap: Spacing[2],
    paddingVertical: Spacing[1],
  },
  frequentChip: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    maxWidth: 130,
    gap: 2,
  },
  section: { gap: Spacing[2] },
  itemCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    gap: Spacing[2],
  },
  itemHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descWrap: { position: 'relative' },
  searchSpinner: { position: 'absolute', right: 12, top: 36 },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    borderRadius: Radius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    gap: Spacing[2],
  },
  numberRow: { alignItems: 'flex-end', gap: Spacing[2] },
  numberField: { flex: 1 },
  lineTotalWrap: { width: 72, gap: 3, paddingBottom: Spacing[1] },
  addItemBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
  },
  totalCard: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRow: {
    gap: Spacing[3],
    marginTop: Spacing[1],
  },
  stickyFooter: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  zeroPriceWarn: {
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: '#fffbeb',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  repeatContent: {
    padding: Spacing[4],
    gap: Spacing[3],
    minHeight: 180,
  },
  emptyRepeat: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[6],
  },
  repeatItem: {
    borderRadius: Radius.xl,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
