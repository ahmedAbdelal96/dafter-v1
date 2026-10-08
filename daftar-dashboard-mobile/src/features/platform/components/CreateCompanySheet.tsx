/**
 * CreateCompanySheet — slide-up form to create a new tenant company.
 *
 * Three sections:
 *   1. Company   — name (required), phone (optional), currency (default EGP)
 *   2. Owner     — fullName (required), email (required), password (required), phone (optional)
 *   3. Subscription — plan picker + Trial | Paid toggle + duration input
 *
 * On success: invalidates company list + platform stats, then closes.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ZModal } from '@/components/ui/ZModal';
import { ZText } from '@/components/ui/ZText';
import { ZButton } from '@/components/ui/ZButton';
import { ZInput } from '@/components/ui/ZInput';
import { useTheme } from '@/stores/theme-store';
import { useLocale } from '@/stores/locale-store';
import { Colors, Spacing, Radius, type ColorPalette } from '@/constants/theme';
import { usePlans } from '../hooks/usePlatform';
import { useCreateCompany } from '../hooks/usePlatformMutations';
import { PLATFORM_ACCENT, type Plan } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

type SubMode = 'trial' | 'paid';

const TERM_OPTIONS = [1, 3, 6, 12] as const;

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'passwordTooShort';
  if (!/[A-Z]/.test(pw)) return 'passwordNeedsUppercase';
  if (!/\d/.test(pw)) return 'passwordNeedsNumber';
  return null;
}

// ─── Section title helper ─────────────────────────────────────────────────────

function SectionTitle({ title, palette }: { title: string; palette: ColorPalette }) {
  return (
    <ZText
      weight="semibold"
      size="xs"
      style={{
        color: PLATFORM_ACCENT,
        letterSpacing: 0.5,
        marginTop: Spacing[2],
        marginBottom: Spacing[1],
      }}
    >
      {title.toUpperCase()}
    </ZText>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCompanySheet({ visible, onClose, onCreated }: Props) {
  const { isDark } = useTheme();
  const { isRTL } = useLocale();
  const { t } = useTranslation('platform');
  const palette = isDark ? Colors.dark : Colors.light;

  // ── Form state ────────────────────────────────────────────────────────────
  const [companyName, setCompanyName]     = useState('');
  const [companyPhone, setCompanyPhone]   = useState('');
  const [currency, setCurrency]           = useState('EGP');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail]       = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone]       = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subMode, setSubMode]             = useState<SubMode>('trial');
  const [trialDays, setTrialDays]         = useState('14');
  const [termMonths, setTermMonths]       = useState<1 | 3 | 6 | 12>(1);
  const [error, setError]                 = useState<string | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: plans = [] } = usePlans();
  const activePlans = plans.filter((p) => p.isActive);
  const mutation = useCreateCompany();

  // ── Reset on close ────────────────────────────────────────────────────────
  function resetForm() {
    setCompanyName(''); setCompanyPhone(''); setCurrency('EGP');
    setOwnerFullName(''); setOwnerEmail(''); setOwnerPassword(''); setOwnerPhone('');
    setSelectedPlanId(''); setSubMode('trial'); setTrialDays('14'); setTermMonths(1);
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!companyName.trim()) return t('createCompany.validation.companyNameRequired');
    if (!ownerFullName.trim()) return t('createCompany.validation.ownerNameRequired');
    if (!ownerEmail.trim()) return t('createCompany.validation.emailRequired');
    if (!validateEmail(ownerEmail)) return t('createCompany.validation.emailInvalid');
    const pwErr = validatePassword(ownerPassword);
    if (!ownerPassword) return t('createCompany.validation.passwordRequired');
    if (pwErr) return t(`createCompany.validation.${pwErr}`);
    if (!selectedPlanId) return t('createCompany.validation.planRequired');
    if (subMode === 'trial' && (!trialDays || parseInt(trialDays, 10) < 1)) {
      return t('createCompany.validation.trialDaysRequired');
    }
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);

    mutation.mutate(
      {
        companyName: companyName.trim(),
        ownerFullName: ownerFullName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword,
        planId: selectedPlanId,
        companyPhone: companyPhone.trim() || undefined,
        currencyCode: currency.trim() || 'EGP',
        ownerPhone: ownerPhone.trim() || undefined,
        ...(subMode === 'trial'
          ? { trialDays: parseInt(trialDays, 10) }
          : { termMonths }),
      },
      {
        onSuccess: () => { resetForm(); onCreated?.(); onClose(); },
        onError: (e: unknown) => {
          const msg = (e as any)?.response?.data?.message;
          setError(Array.isArray(msg) ? msg[0] : (msg ?? t('createCompany.failed')));
        },
      },
    );
  }

  return (
    <ZModal visible={visible} onClose={handleClose} title={t('createCompany.title')}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
            <ZText size="sm" style={{ color: '#dc2626', flex: 1 }}>{error}</ZText>
          </View>
        ) : null}

        {/* ── Section 1: Company ── */}
        <SectionTitle title={t('createCompany.sectionCompany')} palette={palette} />

        <ZInput
          label={t('createCompany.companyName')}
          placeholder="Daftar Inc."
          value={companyName}
          onChangeText={(v) => { setCompanyName(v); setError(null); }}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <ZInput
          label={t('createCompany.companyPhone')}
          placeholder="+966501234567"
          value={companyPhone}
          onChangeText={setCompanyPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
        <ZInput
          label={t('createCompany.currency')}
          placeholder="EGP"
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          maxLength={3}
          returnKeyType="next"
        />

        {/* ── Section 2: Owner ── */}
        <SectionTitle title={t('createCompany.sectionOwner')} palette={palette} />

        <ZInput
          label={t('createCompany.ownerFullName')}
          placeholder="Ahmed Khalil"
          value={ownerFullName}
          onChangeText={(v) => { setOwnerFullName(v); setError(null); }}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <ZInput
          label={t('createCompany.ownerEmail')}
          placeholder="owner@company.com"
          value={ownerEmail}
          onChangeText={(v) => { setOwnerEmail(v); setError(null); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <ZInput
          label={t('createCompany.ownerPassword')}
          placeholder="Min 8 chars, A-Z, 0-9"
          value={ownerPassword}
          onChangeText={(v) => { setOwnerPassword(v); setError(null); }}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="next"
        />
        <ZInput
          label={t('createCompany.ownerPhone')}
          placeholder="+966501234567"
          value={ownerPhone}
          onChangeText={setOwnerPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        {/* ── Section 3: Subscription ── */}
        <SectionTitle title={t('createCompany.sectionSubscription')} palette={palette} />

        {/* Plan list */}
        <ZText weight="semibold" size="sm" style={{ color: palette.textMuted, marginBottom: Spacing[2] }}>
          {t('createCompany.selectPlan')}
        </ZText>
        {activePlans.map((plan: Plan) => {
          const isSelected = selectedPlanId === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planOption,
                {
                  borderColor: isSelected ? PLATFORM_ACCENT : palette.border,
                  backgroundColor: isSelected
                    ? `${PLATFORM_ACCENT}10`
                    : (isDark ? Colors.dark.surface : '#fff'),
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => { setSelectedPlanId(plan.id); setError(null); }}
            >
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <ZText weight="semibold" size="sm" style={{ color: palette.text }}>
                  {plan.name}
                </ZText>
                <ZText size="xs" variant="secondary">
                  {plan.currencyCode} {plan.price.toLocaleString()} / {t(`billing.${plan.billingCycle}`)}
                </ZText>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={PLATFORM_ACCENT} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Subscription mode toggle */}
        <View
          style={[
            styles.modeToggle,
            {
              backgroundColor: isDark ? Colors.dark.surface : '#f3f4f6',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          {(['trial', 'paid'] as SubMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeBtn,
                subMode === mode && {
                  backgroundColor: isDark ? Colors.dark.background : '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  elevation: 2,
                },
              ]}
              onPress={() => setSubMode(mode)}
            >
              <ZText
                size="sm"
                weight={subMode === mode ? 'semibold' : 'regular'}
                style={{ color: subMode === mode ? PLATFORM_ACCENT : palette.textMuted }}
              >
                {t(`createCompany.${mode}`)}
              </ZText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration inputs */}
        {subMode === 'trial' ? (
          <ZInput
            label={t('createCompany.trialDays')}
            value={trialDays}
            onChangeText={setTrialDays}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="done"
          />
        ) : (
          <View>
            <ZText
              weight="semibold"
              size="sm"
              style={{ color: palette.textMuted, marginBottom: Spacing[2] }}
            >
              {t('createCompany.termMonths')}
            </ZText>
            <View style={[styles.termRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {TERM_OPTIONS.map((months) => (
                <TouchableOpacity
                  key={months}
                  style={[
                    styles.termBtn,
                    {
                      backgroundColor: termMonths === months
                        ? PLATFORM_ACCENT
                        : (isDark ? Colors.dark.surface : '#f3f4f6'),
                      borderColor: termMonths === months ? PLATFORM_ACCENT : palette.border,
                    },
                  ]}
                  onPress={() => setTermMonths(months)}
                >
                  <ZText
                    size="sm"
                    weight="semibold"
                    style={{ color: termMonths === months ? '#fff' : palette.text }}
                  >
                    {months}
                  </ZText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Submit button — inside ScrollView so it's never clipped by the sheet */}
        <ZButton
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={{ marginTop: Spacing[3] }}
        >
          {t('createCompany.confirm')}
        </ZButton>
      </ScrollView>
    </ZModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[2],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: '#fef2f2',
    padding: Spacing[3],
    borderRadius: Radius.lg,
  },
  planOption: {
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },
  modeToggle: {
    borderRadius: Radius.lg,
    padding: 4,
    marginVertical: Spacing[2],
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
  },
  termRow: {
    gap: Spacing[2],
  },
  termBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
});
