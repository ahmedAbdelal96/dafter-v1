/**
 * Subscriptions / Entitlements — Type definitions
 *
 * Data comes from GET /my/entitlements (EffectiveEntitlements from backend).
 * The merchant can VIEW but not change their plan (SuperAdmin only manages plans).
 */

// ─── Quota ────────────────────────────────────────────────────────────────────

export type QuotaType =
  | 'users'
  | 'customers'
  | 'suppliers'
  | 'employees'
  | 'ledgerEntries';

export interface QuotaStatus {
  limit: number | string | null;
  current: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
  usagePercent: number | null;
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TRIAL'
  | 'INACTIVE';

export interface EffectiveEntitlements {
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  endDate: string; // ISO date string
  features: string[]; // FeatureKey strings e.g. "module.customers.read"
  quotas: Record<QuotaType, QuotaStatus>;
}

// ─── Feature Display Helpers ──────────────────────────────────────────────────

/** Maps a FeatureKey prefix (module name) to display icon */
export const FEATURE_MODULE_ICONS: Record<string, string> = {
  dashboard: 'grid-outline',
  customers: 'people-outline',
  suppliers: 'business-outline',
  employees: 'person-outline',
  ledger: 'book-outline',
  expenses: 'wallet-outline',
  products: 'cube-outline',
  invoices: 'receipt-outline',
  deferred_sales: 'time-outline',
  installments: 'calendar-outline',
  reports: 'bar-chart-outline',
};

/** Parse a FeatureKey like "module.customers.read" into its module name */
export function parseFeatureModule(key: string): string {
  // key format: "module.<module>.<action>"
  const parts = key.split('.');
  return parts[1] ?? key;
}

/** Group feature keys by module */
export function groupFeaturesByModule(
  features: string[],
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const key of features) {
    const mod = parseFeatureModule(key);
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(key);
  }
  return groups;
}

// ─── Status Display Helpers ───────────────────────────────────────────────────

export interface StatusConfig {
  color: string;
  bgColor: string;
  icon: string;
}

export function getStatusConfig(status: SubscriptionStatus): StatusConfig {
  switch (status) {
    case 'ACTIVE':
      return { color: '#16a34a', bgColor: '#f0fdf4', icon: 'checkmark-circle' };
    case 'TRIAL':
      return { color: '#2563eb', bgColor: '#eff6ff', icon: 'time' };
    case 'SUSPENDED':
      return { color: '#dc2626', bgColor: '#fef2f2', icon: 'pause-circle' };
    case 'EXPIRED':
      return { color: '#ea580c', bgColor: '#fff7ed', icon: 'alert-circle' };
    default:
      return { color: '#6b7280', bgColor: '#f3f4f6', icon: 'help-circle' };
  }
}

// ─── Quota Display Helpers ────────────────────────────────────────────────────

export function getQuotaBarColor(percent: number | null): string {
  if (percent === null) return '#6b7280';
  if (percent >= 90) return '#dc2626';
  if (percent >= 70) return '#f59e0b';
  return '#16a34a';
}

/** Accent color for the subscriptions module */
export const SUBS_ACCENT = '#7c3aed';
