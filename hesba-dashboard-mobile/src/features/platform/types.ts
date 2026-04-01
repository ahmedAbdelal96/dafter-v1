/**
 * Platform Module — Super Admin types
 *
 * All platform management types: companies (tenants), subscriptions, plans.
 * Used exclusively in the (platform) route group.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'DISABLED';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'FAILED'
  | 'REFUNDED';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  price: number;
  currencyCode: string;
  billingCycle: BillingCycle;
  maxUsers: number | null;
  maxCustomers: number | null;
  maxSuppliers: number | null;
  maxEmployees: number | null;
  maxLedgerEntries: string | null; // BigInt over HTTP → string
  features: string;               // JSON string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentStatus: PaymentStatus;
  plan: {
    id: string;
    name: string;
    price: number;
    billingCycle: string;
    currencyCode: string;
  };
}

// ─── Company (Tenant) ─────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currencyCode: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  subscriptions: Subscription[];
  _count: {
    users: number;
    customers?: number;
    suppliers?: number;
    employees?: number;
    ledgerEntries?: number;
  };
}

export interface CompanyMetrics {
  companyId: string;
  companyName: string;
  usersCount: number;
  customersCount: number;
  suppliersCount: number;
  employeesCount: number;
  ledgerEntriesCount: number;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string;
    autoRenew: boolean;
    plan: {
      id: string;
      name: string;
      price: number;
      maxUsers: number | null;
      maxCustomers: number | null;
      maxSuppliers: number | null;
      maxEmployees: number | null;
    };
  } | null;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface CompanyQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface CompanyListResponse {
  data: Company[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ActivateSubscriptionDto {
  companyId: string;
  planId: string;
  endDate: string;  // ISO date string
  autoRenew?: boolean;
  note?: string;
}

export interface SuspendSubscriptionDto {
  companyId: string;
  reason?: string;
}

export interface ExtendSubscriptionDto {
  companyId: string;
  newEndDate: string;  // ISO date string
  reason?: string;
}

export interface ChangePlanDto {
  companyId: string;
  newPlanId: string;
  mode?: 'IMMEDIATE';
  reason?: string;
}

export interface UpdateCompanyDto {
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  currencyCode?: string;
}

export interface ArchiveCompanyDto {
  reason?: string;
}

export interface DeleteCompanyDto {
  confirmCompanyName: string;
  reason?: string;
}

export interface PlatformCapabilities {
  canHardDeleteCompany: boolean;
}

// --- Platform Audit ---

export type PlatformAuditSortBy = 'createdAt' | 'action' | 'entityType';
export type PlatformAuditSortOrder = 'asc' | 'desc';

export interface PlatformAuditFilters {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  actorUserId?: string;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: PlatformAuditSortBy;
  sortOrder?: PlatformAuditSortOrder;
}

export interface PlatformAuditActor {
  id: string;
  fullName: string | null;
  email: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF' | 'ACCOUNTANT' | 'RECEPTION';
}

export interface PlatformAuditCompany {
  id: string;
  name: string;
}

export interface PlatformAuditLogRecord {
  id: string;
  companyId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorUser: PlatformAuditActor | null;
  company: PlatformAuditCompany | null;
}

export interface PlatformAuditLogsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PlatformAuditLogsResponse {
  items: PlatformAuditLogRecord[];
  meta: PlatformAuditLogsMeta;
}

export interface PlatformAuditLookupsFilters {
  companySearch?: string;
  actorSearch?: string;
  companyId?: string;
  limit?: number;
}

export interface PlatformAuditLookupCompany {
  id: string;
  name: string;
}

export interface PlatformAuditLookupActor {
  id: string;
  fullName: string | null;
  email: string;
}

export interface PlatformAuditLookupsResponse {
  companies: PlatformAuditLookupCompany[];
  actors: PlatformAuditLookupActor[];
  actions: string[];
  entityTypes: string[];
}

// --- Platform Settings (phase 1: read-only) ---

export type PlatformProrationMode = 'NONE' | 'IMMEDIATE' | 'NEXT_CYCLE';

export interface PlatformSettings {
  trialDefaults: {
    durationDays: number;
    autoActivateOnSignup: boolean;
    requireCompanyPhone: boolean;
  };
  subscriptionPolicies: {
    gracePeriodDays: number;
    allowPlanDowngrade: boolean;
    allowPlanUpgrade: boolean;
    enforceSingleActiveSubscription: boolean;
    prorationMode: PlatformProrationMode;
  };
  governanceGuardrails: {
    strictQuotaEnforcement: boolean;
    blockOnExpiredSubscription: boolean;
    allowReadOnlyDuringGracePeriod: boolean;
  };
  updatedAt: string;
}

export interface PlatformFeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedCompanies: string[];
  blockedCompanies: string[];
  description: string;
  createdAt: string;
  lastModified: string;
}

// ─── Platform Stats (client-computed) ────────────────────────────────────────

export interface PlatformStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  expired: number;
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

export interface SubStatusConfig {
  color: string;
  bgColor: string;
  icon: string;
}

export function getSubStatusConfig(status: SubscriptionStatus): SubStatusConfig {
  switch (status) {
    case 'ACTIVE':
      return { color: '#16a34a', bgColor: '#f0fdf4', icon: 'checkmark-circle' };
    case 'TRIAL':
      return { color: '#2563eb', bgColor: '#eff6ff', icon: 'time' };
    case 'SUSPENDED':
      return { color: '#dc2626', bgColor: '#fef2f2', icon: 'pause-circle' };
    case 'EXPIRED':
      return { color: '#ea580c', bgColor: '#fff7ed', icon: 'alert-circle' };
    case 'DISABLED':
      return { color: '#6b7280', bgColor: '#f3f4f6', icon: 'close-circle' };
    default:
      return { color: '#6b7280', bgColor: '#f3f4f6', icon: 'help-circle' };
  }
}

/** Get the active (latest) subscription from a company */
export function getActiveSubscription(company: Company): Subscription | null {
  if (!company.subscriptions?.length) return null;
  // Prefer ACTIVE, then TRIAL, then SUSPENDED, then latest
  const priority: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];
  for (const status of priority) {
    const found = company.subscriptions.find((s) => s.status === status);
    if (found) return found;
  }
  return company.subscriptions[0] ?? null;
}

/** Accent color for the platform (super admin) module */
export const PLATFORM_ACCENT = '#7c3aed'; // Violet-700 — premium admin feel

// ─── Create Company ────────────────────────────────────────────────────────────

export interface CreateCompanyDto {
  companyName: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
  planId: string;
  companyPhone?: string;
  currencyCode?: string;
  ownerPhone?: string;
  /** Creates a TRIAL subscription lasting N days */
  trialDays?: number;
  /** Creates a ACTIVE subscription lasting N months (1 | 3 | 6 | 12) */
  termMonths?: number;
  autoRenew?: boolean;
}

// ─── Platform Users ────────────────────────────────────────────────────────────

export interface PlatformUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  permissions?: {
    manageUsers: boolean;
    viewParties: boolean;
    manageParties: boolean;
    viewLedger: boolean;
    manageLedger: boolean;
    viewReports: boolean;
  } | null;
}

export interface PlatformUserStats {
  total: number;
  active: number;
  disabled: number;
  staff: number;
}

export interface PlatformUserListResponse {
  data: PlatformUser[];
  meta: { page: number; limit: number; total: number };
}

export interface PlatformCreateStaffDto {
  companyId: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface PlatformUserQuery {
  companyId: string;
  search?: string;
  page?: number;
  limit?: number;
}
