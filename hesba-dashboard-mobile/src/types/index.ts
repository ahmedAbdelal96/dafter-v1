/**
 * Daftar Mobile Dashboard — Shared Type Definitions
 *
 * Mirrors the backend Prisma schema and NestJS DTOs exactly.
 * - All Decimal fields come from Prisma as strings → typed as `string` here.
 *   Use `parseFloat(String(value))` before any arithmetic or display formatting.
 * - Keep in sync with the backend whenever the schema changes.
 * - "isDeleted" rows are never returned by the API; no need to model that field.
 */

// ─── Common ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/** Standard backend error shape */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

/**
 * Entitlement error — thrown by FeatureGuard / TenantSubscriptionGuard.
 * statusCode is always 403.
 */
export interface EntitlementError {
  statusCode: 403;
  error: 'EntitlementError';
  code: 'FEATURE_NOT_AVAILABLE' | 'QUOTA_EXCEEDED' | 'SUBSCRIPTION_INACTIVE';
  featureKey?: string;
  entity?: string;
  limit?: number;
  current?: number;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

/** User roles — maps to UserRole enum in the backend */
export type UserRole = 'OWNER' | 'STAFF' | 'SUPER_ADMIN';

/** User account status */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

/** Party types — used in ledger entries */
export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';

/** Ledger entry types — maps to LedgerEntryType enum */
export type LedgerEntryType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'ADVANCE'
  | 'SALARY_PAYMENT'
  | 'DEDUCTION'
  | 'SETTLEMENT';

/** Expense categories — maps to ExpenseCategory enum */
export type ExpenseCategory =
  | 'RENT'
  | 'SALARIES'
  | 'UTILITIES'
  | 'SUPPLIES'
  | 'TRANSPORTATION'
  | 'MAINTENANCE'
  | 'MARKETING'
  | 'TAXES'
  | 'OTHER';

/** Invoice status */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

/** Deferred sale status */
export type DeferredSaleStatus = 'ACTIVE' | 'PAID' | 'OVERDUE' | 'CANCELLED';

/** Installment schedule type */
export type InstallmentScheduleType = 'FIXED' | 'CUSTOM';

/** Installment per-row status */
export type InstallmentStatus =
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED';

/** Overall installment contract status */
export type InstallmentContractStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED';

/** Subscription plan tiers */
export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

/** Subscription state */
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'DISABLED';

// ─── Auth & Identity ──────────────────────────────────────────────────────────

/**
 * Fine-grained permission flags for STAFF users.
 * OWNER always has all permissions implicitly.
 */
export interface StaffPermission {
  viewParties: boolean;
  manageParties: boolean;
  viewLedger: boolean;
  manageLedger: boolean;
  viewReports: boolean;
  manageReports: boolean;
  viewInstallments: boolean;
  manageInstallments: boolean;
  manageUsers: boolean;
}

/** Authenticated user — returned by /auth/me and embedded in login response */
export interface User {
  id: string;
  companyId: string | null; // null for SUPER_ADMIN
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  permissions?: StaffPermission; // only populated for STAFF
  createdAt: string;
  updatedAt: string;
}

/**
 * Company / Tenant — the billing + configuration root for each merchant.
 * Returned from /auth/me (nested) or /companies/me.
 */
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  currency: string; // e.g. "EGP"
  timezone?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string;
  planEndsAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  /** Company is populated when available; may be partial on first login */
  tenant: Tenant | null;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ─── Parties ─────────────────────────────────────────────────────────────────
// Customers, Suppliers, and Employees share the same ledger infrastructure.
// Each is a separate resource with slightly different fields.

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  /** Opening balance as Prisma Decimal string — parse before display */
  openingBalance: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  openingBalance: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  jobTitle?: string;
  /** Monthly salary as Prisma Decimal string */
  salary?: string;
  notes?: string;
  /**
   * Optimistic locking version counter.
   * Must be included in every PATCH request body.
   * Server returns 409 if the version is stale.
   */
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

/**
 * A single ledger transaction row.
 * Amounts are Prisma Decimal strings — use parseFloat() before arithmetic.
 */
export interface LedgerEntry {
  id: string;
  companyId: string;
  partyId: string;
  partyType: PartyType;
  type: LedgerEntryType;
  /** Raw Decimal string from Prisma (always positive) */
  amount: string;
  description?: string;
  date: string;
  /** Running balance after this entry (Decimal string) */
  runningBalance: string;
  createdAt: string;
  createdById: string;
}

/** Current balance for a single party (fast-read table) */
export interface PartyBalance {
  partyId: string;
  /** Decimal string — positive = party owes us; negative = we owe them */
  balance: string;
}

/**
 * Response from GET /ledger/:partyId/statement
 * Includes the full period statement with running balance per row.
 */
export interface LedgerStatementResponse {
  /** Balance before the requested date range */
  openingBalanceForPeriod: string;
  /** Balance after the requested date range */
  closingBalanceForPeriod: string;
  /** Current live balance (most recent) */
  currentBalance: string;
  items: LedgerEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Party summary row used in the party-picker list */
export interface PartyLedgerSummary {
  partyId: string;
  partyType: PartyType;
  partyName: string;
  balance: string; // Decimal string
}

export interface CreateLedgerEntryRequest {
  partyId: string;
  partyType: PartyType;
  type: LedgerEntryType;
  amount: number;
  description?: string;
  date?: string; // ISO date string, defaults to today
}

export interface LedgerFilters extends PaginationParams {
  partyId?: string;
  partyType?: PartyType;
  type?: LedgerEntryType;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  companyId: string;
  /** Decimal string */
  amount: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalAmount: string; // Decimal string
  byCategory: Record<ExpenseCategory, string>; // category → Decimal string
}

export interface CreateExpenseRequest {
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // ISO date
  notes?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {}

export interface ExpenseFilters extends PaginationParams {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  companyId: string;
  name: string;
  /** SKU is unique per company */
  sku: string;
  category?: string; // free-text
  /** Decimal string */
  price: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  category?: string;
  price: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductFilters extends PaginationParams {
  category?: string;
  isActive?: boolean;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  description: string;
  quantity: number;
  /** Decimal string */
  unitPrice: string;
  /** Decimal string */
  totalPrice: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  items: InvoiceItem[];
  /** Decimal string */
  totalAmount: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate?: string;
  notes?: string;
  /** Set when invoice was created from a DeferredSale */
  deferredSaleId?: string;
  createdAt: string;
}

export interface CreateInvoiceItemRequest {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceRequest {
  customerId: string;
  items: CreateInvoiceItemRequest[];
  dueDate?: string;
  notes?: string;
}

export interface InvoiceFilters extends PaginationParams {
  customerId?: string;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Deferred Sales (بيع آجل) ─────────────────────────────────────────────────

export interface DeferredPayment {
  id: string;
  saleId: string;
  /** Decimal string */
  amount: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface DeferredSale {
  id: string;
  companyId: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  /** Decimal string */
  totalAmount: string;
  /** Decimal string */
  paidAmount: string;
  /** Decimal string */
  remainingAmount: string;
  dueDate: string;
  status: DeferredSaleStatus;
  description?: string;
  payments?: DeferredPayment[];
  /** True once an Invoice has been generated from this sale */
  isInvoiced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeferredSaleRequest {
  customerId: string;
  totalAmount: number;
  dueDate: string;
  description?: string;
}

export interface RecordDeferredPaymentRequest {
  amount: number;
  date?: string;
  notes?: string;
}

export interface DeferredSaleFilters extends PaginationParams {
  customerId?: string;
  status?: DeferredSaleStatus;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Installments (بيع بالتقسيط) ──────────────────────────────────────────────

export interface InstallmentScheduleRow {
  id: string;
  contractId: string;
  dueDate: string;
  /** Decimal string */
  amount: string;
  /** Decimal string */
  paidAmount: string;
  status: InstallmentStatus;
  paidAt?: string;
}

export interface InstallmentContract {
  id: string;
  companyId: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  /** Decimal string */
  totalAmount: string;
  /** Decimal string */
  downPayment: string;
  /** Decimal string */
  remainingAmount: string;
  numberOfInstallments: number;
  /** Decimal string — only set for FIXED schedules */
  installmentAmount?: string;
  scheduleType: InstallmentScheduleType;
  status: InstallmentContractStatus;
  startDate: string;
  schedules: InstallmentScheduleRow[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstallmentContractRequest {
  customerId: string;
  totalAmount: number;
  downPayment: number;
  numberOfInstallments: number;
  startDate: string;
  scheduleType: InstallmentScheduleType;
  /** For FIXED schedule only */
  installmentAmount?: number;
  /** For CUSTOM schedule — amounts per installment */
  customAmounts?: number[];
  description?: string;
}

export interface InstallmentFilters extends PaginationParams {
  customerId?: string;
  status?: InstallmentContractStatus;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportSummary {
  totalRevenue: string;     // Decimal string
  totalExpenses: string;
  netProfit: string;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalEmployees: number;
}

export interface OverdueItem {
  partyId: string;
  partyName: string;
  partyType: PartyType;
  overdueAmount: string; // Decimal string
  dueDate?: string;
  daysPastDue?: number;
}

export interface CollectionScheduleItem {
  dueDate: string;
  amount: string; // Decimal string
  partyName: string;
  type: 'DEFERRED_SALE' | 'INSTALLMENT';
  referenceId: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/** Quick stats returned by GET /dashboard */
export interface DashboardStats {
  /** Total receivables (customers owe us) */
  totalReceivables: string;
  /** Total payables (we owe suppliers) */
  totalPayables: string;
  /** Net position = receivables − payables */
  netPosition: string;
  /** This month's total collections (payments received) */
  monthlyCollections: string;
  /** This month's total expenses */
  monthlyExpenses: string;
  /** Number of overdue deferred sales */
  overdueCount: number;
  /** Total overdue amount */
  overdueAmount: string;
  /** Number of customers with active balance */
  activeCustomers: number;
  /** Number of pending invoices */
  pendingInvoices: number;
  /** Recent ledger activity */
  recentEntries?: RecentActivityEntry[];
}

export interface RecentActivityEntry {
  id: string;
  partyName: string;
  partyType: PartyType;
  type: LedgerEntryType;
  amount: string; // Decimal string
  date: string;
  description?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'INSTALLMENT_DUE'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_EXPIRED'
  | 'GENERAL';

export interface Notification {
  id: string;
  companyId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Users (staff management) ─────────────────────────────────────────────────

/** Staff member created by the OWNER */
export interface StaffMember {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: 'STAFF';
  status: UserStatus;
  permissions: StaffPermission;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  email: string;
  fullName: string;
  password: string;
  permissions?: Partial<StaffPermission>;
}

export interface UpdateStaffRequest {
  fullName?: string;
  status?: UserStatus;
}

export interface UpdatePermissionsRequest {
  permissions: StaffPermission;
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

export interface EffectiveEntitlements {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  features: string[]; // list of FeatureKey strings
  quotas: Record<string, number>; // quotaType → limit
  currentUsage?: Record<string, number>; // quotaType → current count
}
