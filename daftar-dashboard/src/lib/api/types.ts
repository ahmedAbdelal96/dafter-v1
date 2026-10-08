/**
 * API Types - Based on Backend Prisma Schema
 * Ø§Ù„Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ù…Ø´ØªØ±ÙƒØ© Ù„Ù„Ù€ API Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ schema Ø§Ù„Ù€ backend
 *
 * âš ï¸ Ù‡Ø°Ù‡ Ø§Ù„Ø£Ù†ÙˆØ§Ø¹ Ù…Ø¨Ù†ÙŠØ© Ø¹Ù„Ù‰ Prisma schema Ø§Ù„ÙØ¹Ù„ÙŠ
 */

// ==================== Common Types ====================

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
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, any>;
}

export type EntitlementQuotaType =
  | "users"
  | "customers"
  | "suppliers"
  | "employees"
  | "ledgerEntries";

export interface EntitlementQuotaStatus {
  limit: number | string | null;
  current: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
  usagePercent: number | null;
}

export interface MyEntitlementsResponse {
  planName: string;
  subscriptionStatus: string;
  endDate: string;
  features: string[];
  quotas: Record<EntitlementQuotaType, EntitlementQuotaStatus>;
}

export interface FeatureCatalogResponse {
  version: string;
  features: string[];
}

// ==================== Enums from Prisma ====================

export type UserRole =
  | "OWNER"
  | "SUPER_ADMIN"
  | "ACCOUNTANT"
  | "RECEPTION"
  | "STAFF";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type BookingSource =
  | "ONLINE"
  | "WALK_IN"
  | "PHONE"
  | "WHATSAPP"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "ADMIN"
  | "OTHER";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "WALLET"
  | "OTHER";

export type Gender = "MALE" | "FEMALE";
export type ClientRating = "VIP" | "EXCELLENT" | "GOOD" | "POOR" | "BLOCKED";
export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type ClientSource =
  | "WALK_IN"
  | "ONLINE"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "GOOGLE"
  | "OTHER";

export type PricingType = "FIXED" | "STARTING_FROM" | "RANGE";
export type DiscountType = "PERCENTAGE" | "FIXED";
export type ServiceGender = "MALE" | "FEMALE" | "UNISEX";
export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";

export type LegacyInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "PARTIAL"
  | "OVERDUE"
  | "VOIDED";

export type SubscriptionPlan = "FREE" | "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED";

export type CashReconciliationMode = "DISABLED" | "SIMPLE_DAILY";
export type CashReconciliationStatus = "DRAFT" | "CLOSED";

export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "BOOKING_COMPLETED"
  | "PAYMENT_RECEIVED"
  | "REVIEW_RECEIVED"
  | "POINTS_EARNED"
  | "POINTS_REDEEMED"
  | "WELCOME"
  | "CUSTOM";

export type NotificationChannel = "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
export type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";

// ==================== Auth Types ====================

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
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
  tenant: Tenant;
}

export interface RegisterRequest {
  /** Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ© */
  companyName: string;
  /** Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„ Ù„ØµØ§Ø­Ø¨ Ø§Ù„Ø­Ø³Ø§Ø¨ */
  fullName: string;
  /** Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ */
  email: string;
  /** Ø±Ù‚Ù… Ù‡Ø§ØªÙ ØµØ§Ø­Ø¨ Ø§Ù„Ø­Ø³Ø§Ø¨ */
  phone?: string;
  /** Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø§Ù„Ø´Ø±ÙƒØ© */
  companyPhone?: string;
  /** ÙƒÙ„Ù…Ø© Ø§Ù„Ø³Ø± */
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
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
  password: string;
}

/**
 * Auth Tokens for storage
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tenantId?: string;
}

export interface Session {
  id: string;
  deviceInfo?: string;
  deviceName?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface LoginHistory {
  id: string;
  email: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  deviceInfo?: string;
  browser?: string;
  os?: string;
  success: boolean;
  failureReason?: string;
  loginAt: string;
  logoutAt?: string;
}

// ==================== Customers Types ====================

export type CustomerMoneyValue = string | number;

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  openingBalance: CustomerMoneyValue;
  creditLimit?: CustomerMoneyValue | null;
  balance: CustomerMoneyValue;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters extends PaginationParams {
  isActive?: boolean;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  address?: string;
  openingBalance?: number;
  creditLimit?: number;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string | null;
  address?: string | null;
  creditLimit?: number | null;
  isActive?: boolean;
  version: number;
}

export interface CustomersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CustomersListResponse {
  items: Customer[];
  meta: CustomersListMeta;
}

export interface CustomerSnapshot {
  currentBalance: CustomerMoneyValue;
  creditLimit?: CustomerMoneyValue | null;
  overdueAmount: CustomerMoneyValue;
  lastInvoiceDate?: string | null;
  lastPaymentDate?: string | null;
  openInvoicesCount: number;
  totalPurchases: CustomerMoneyValue;
  hasOverdue: boolean;
}

// ==================== Suppliers Types ====================

export type SupplierMoneyValue = string | number;

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  openingBalance: SupplierMoneyValue;
  balance: SupplierMoneyValue;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilters extends PaginationParams {
  isActive?: boolean;
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string;
  address?: string;
  openingBalance?: number;
}

export interface UpdateSupplierRequest {
  name?: string;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
  version: number;
}

export interface SuppliersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SuppliersListResponse {
  items: Supplier[];
  meta: SuppliersListMeta;
}

// ==================== Employees Types ====================

export type EmployeeMoneyValue = string | number;

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  phone?: string | null;
  jobTitle?: string | null;
  openingBalance: EmployeeMoneyValue;
  balance: EmployeeMoneyValue;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters extends PaginationParams {
  isActive?: boolean;
}

export interface CreateEmployeeRequest {
  name: string;
  phone?: string;
  jobTitle?: string;
  openingBalance?: number;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  jobTitle?: string;
  isActive?: boolean;
  version: number;
}

export interface EmployeesListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EmployeesListResponse {
  items: Employee[];
  meta: EmployeesListMeta;
}

// ==================== Products Types ====================

export type ProductMoneyValue = string | number;

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  unitPrice: ProductMoneyValue;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    fullName?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters extends PaginationParams {
  category?: string;
  isActive?: boolean;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit?: string;
  unitPrice: number;
  isActive?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  unitPrice?: number;
  isActive?: boolean;
}

export interface ProductsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductsListResponse {
  items: Product[];
  meta: ProductsListMeta;
}

// ==================== Expenses Types ====================

export type ExpenseCategoryValue =
  | "RENT"
  | "SALARIES"
  | "UTILITIES"
  | "SUPPLIES"
  | "TRANSPORTATION"
  | "MAINTENANCE"
  | "MARKETING"
  | "TAXES"
  | "OTHER";

export interface ExpenseRecord {
  id: string;
  companyId: string;
  supplierId?: string | null;
  supplier?: {
    id: string;
    name: string;
  } | null;
  category: ExpenseCategoryValue;
  amount: string | number;
  expenseDate: string;
  description?: string | null;
  referenceNumber?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    fullName?: string | null;
  };
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface ExpenseFilters extends PaginationParams {
  category?: ExpenseCategoryValue;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateExpenseRequestPayload {
  category: ExpenseCategoryValue;
  amount: number;
  expenseDate: string;
  description?: string;
  supplierId?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateExpenseRequestPayload extends Partial<CreateExpenseRequestPayload> {}

export interface ExpensesListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ExpensesListResponse {
  items: ExpenseRecord[];
  meta: ExpensesListMeta;
}

export interface ExpenseSummaryByCategory {
  category: ExpenseCategoryValue;
  total: string;
  count: number;
}

export interface ExpensesSummaryResponse {
  totalAmount: string;
  count: number;
  byCategory: ExpenseSummaryByCategory[];
}

// ==================== Ledger Types ====================

export type PartyType = "CUSTOMER" | "SUPPLIER" | "EMPLOYEE";

export type LedgerEntryType =
  | "INVOICE"
  | "PAYMENT"
  | "RETURN"
  | "ADJUSTMENT"
  | "ADVANCE"
  | "SALARY_PAYMENT"
  | "DEDUCTION"
  | "SETTLEMENT";

export interface LedgerStatementFilters {
  partyType: PartyType;
  partyId: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface LedgerStatementItem {
  id: string;
  entryType: LedgerEntryType;
  signedAmount: string | number;
  entryDate: string;
  dueDate?: string | null;
  note?: string | null;
  createdById: string;
  createdAt: string;
  runningBalance: string;
}

export interface LedgerStatementPartyInfo {
  id: string;
  name: string;
  partyType: PartyType;
}

export interface LedgerStatementResponse {
  partyInfo: LedgerStatementPartyInfo | null;
  currentBalance: string;
  openingBalanceForPeriod: string;
  closingBalanceForPeriod: string;
  items: LedgerStatementItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLedgerEntryRequest {
  partyType: PartyType;
  partyId: string;
  entryType: LedgerEntryType;
  signedAmount: number;
  entryDate: string;
  dueDate?: string;
  note?: string;
}

// ==================== Invoices Types ====================

export type InvoiceStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type InvoicePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface InvoiceLineItemPayload {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceRequest {
  partyType: PartyType;
  partyId: string;
  partyAddress?: string;
  items: InvoiceLineItemPayload[];
  taxAmount?: number;
  notes?: string;
  issueDate: string;
}

export interface InvoiceSummaryItem {
  id: string;
  companyId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  deferredSaleId?: string | null;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  partyPhone?: string | null;
  totalAmount: string | number;
  taxAmount: string | number;
  paidAmount?: string | number;
  invoicePaymentStatus?: InvoicePaymentStatus;
  issueDate: string;
  createdAt: string;
  createdById: string;
  createdBy?: {
    id: string;
    fullName?: string | null;
  };
}

export interface InvoiceDetailsItem {
  id: string;
  productId?: string | null;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  total: string | number;
}

export interface InvoiceDetailsRecord {
  id: string;
  companyId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  deferredSaleId?: string | null;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  partyPhone?: string | null;
  partyAddress?: string | null;
  totalAmount: string | number;
  taxAmount: string | number;
  paidAmount?: string | number;
  invoicePaymentStatus?: InvoicePaymentStatus;
  notes?: string | null;
  issueDate: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: {
    id: string;
    fullName?: string | null;
  };
  items: InvoiceDetailsItem[];
}

export interface InvoicesListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface InvoicesListResponse {
  items: InvoiceSummaryItem[];
  meta: InvoicesListMeta;
}

export interface InvoicesFilters extends PaginationParams {
  partyType?: PartyType;
  partyId?: string;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface RecordInvoicePaymentRequest {
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateStandalonePaymentRequest {
  partyType: PartyType;
  partyId: string;
  amount: number;
  paymentDate?: string;
  note?: string;
}

export interface DistributePaymentRequest {
  customerId: string;
  amount: number;
  invoiceIds?: string[];
  note?: string;
}

export interface DistributePaymentResult {
  totalApplied: string;
  invoicesUpdated: number;
  breakdown: Array<{
    invoiceId: string;
    invoiceNumber: string;
    applied: string;
  }>;
}

// ==================== Deferred Sales Types ====================

export type DeferredSaleStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export interface DeferredSaleRecord {
  id: string;
  companyId: string;
  partyType: PartyType;
  partyId: string;
  referenceNumber: string;
  description?: string | null;
  totalAmount: string | number;
  paidAmount: string | number;
  remaining: string | number;
  dueDate: string;
  status: DeferredSaleStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeferredSalePaymentRecord {
  id: string;
  deferredSaleId: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod?: string | null;
  notes?: string | null;
  createdById: string;
  createdAt: string;
}

export interface DeferredSaleDetailsRecord extends DeferredSaleRecord {
  partyName?: string | null;
  payments: DeferredSalePaymentRecord[];
}

export interface DeferredSalesFilters extends PaginationParams {
  partyType?: PartyType;
  partyId?: string;
  status?: DeferredSaleStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface DeferredSalesListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DeferredSalesListResponse {
  items: DeferredSaleRecord[];
  meta: DeferredSalesListMeta;
}

export interface CreateDeferredSaleRequest {
  partyType: PartyType;
  partyId: string;
  totalAmount: number;
  dueDate: string;
  description?: string;
  expectedPaymentMethod?: string;
  entryDate?: string;
}

export interface RecordDeferredPaymentRequest {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

// ==================== Installments Types ====================

export type InstallmentContractStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type InstallmentScheduleStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "WAIVED";
export type InstallmentScheduleType = "FIXED" | "CUSTOM";

export interface InstallmentPaymentRecord {
  id: string;
  companyId: string;
  contractId: string;
  scheduleId: string;
  ledgerEntryId: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod?: string | null;
  notes?: string | null;
  createdById: string;
  createdAt: string;
}

export interface InstallmentScheduleRecord {
  id: string;
  companyId: string;
  contractId: string;
  installmentNumber: number;
  dueDate: string;
  amount: string | number;
  paidAmount: string | number;
  status: InstallmentScheduleStatus;
  paidAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  payments?: InstallmentPaymentRecord[];
}

export interface InstallmentContractRecord {
  id: string;
  companyId: string;
  partyType: PartyType;
  partyId: string;
  ledgerEntryId: string;
  contractNumber: string;
  description?: string | null;
  totalAmount: string | number;
  downPayment: string | number;
  paidAmount: string | number;
  numberOfInstallments: number;
  scheduleType: InstallmentScheduleType;
  startDate: string;
  status: InstallmentContractStatus;
  createdById: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  schedules?: InstallmentScheduleRecord[];
}

export interface InstallmentContractDetails extends InstallmentContractRecord {
  partyName?: string | null;
  schedules: InstallmentScheduleRecord[];
}

export interface InstallmentsFilters extends PaginationParams {
  partyType?: PartyType;
  partyId?: string;
  status?: InstallmentContractStatus;
  scheduleStatus?: InstallmentScheduleStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface InstallmentsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface InstallmentsListResponse {
  items: InstallmentContractRecord[];
  meta: InstallmentsListMeta;
}

export interface InstallmentsScheduleFilters {
  dateFrom: string;
  dateTo: string;
  status?: InstallmentScheduleStatus[];
  page?: number;
  limit?: number;
}

export interface InstallmentScheduleListRecord extends InstallmentScheduleRecord {
  contract: {
    id: string;
    contractNumber: string;
    partyType: PartyType;
    partyId: string;
    totalAmount: string | number;
    status: InstallmentContractStatus;
  };
}

export interface InstallmentsScheduleListResponse {
  items: InstallmentScheduleListRecord[];
  meta: InstallmentsListMeta;
}

export interface InstallmentScheduleItemPayload {
  dueDate: string;
  amount: number;
  notes?: string;
}

export interface CreateInstallmentContractRequest {
  partyType: PartyType;
  partyId: string;
  totalAmount: number;
  downPayment?: number;
  numberOfInstallments: number;
  scheduleType: InstallmentScheduleType;
  startDate: string;
  scheduleItems?: InstallmentScheduleItemPayload[];
  description?: string;
}

export interface RecordInstallmentPaymentRequest {
  scheduleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

// ==================== Tenant Types ====================

export interface Tenant {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  descriptionAr?: string;
  descriptionEn?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  primaryColor: string;
  secondaryColor?: string;
  addressAr?: string;
  addressEn?: string;
  city?: string;
  governorate?: string;
  googleMapsUrl?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  timezone: string;
  currency: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMetrics {
  totalBookings: number;
  totalRevenue: number;
  activeClients: number;
  lastBookingAt?: string;
}

// ==================== Booking Types ====================

export interface Booking {
  id: string;
  tenantId: string;
  clientId: string;
  client: Client;
  staffId?: string;
  staff?: Staff;
  serviceId?: string;
  service?: Service;
  bundleId?: string;
  specialOfferId?: string;
  services: BookingService[];
  addOns: BookingAddOn[];
  bookingDate: string;
  startTime: string;
  endTime?: string;
  duration: number;
  status: BookingStatus;
  source: BookingSource;
  // Pricing
  servicePrice: number;
  addOnsPrice: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isPaid: boolean;
  // Invoice
  invoiceNumber?: string;
  invoicePrintedAt?: string;
  // Notes
  clientNotes?: string;
  staffNotes?: string;
  // Notifications
  confirmationSent: boolean;
  reminderSent: boolean;
  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  // Tracking
  confirmedAt?: string;
  confirmedBy?: string;
  startedAt?: string;
  startedBy?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingService {
  id: string;
  bookingId: string;
  serviceId: string;
  service?: Service;
  nameAr: string;
  nameEn?: string;
  price: number;
  duration: number;
  order: number;
}

export interface BookingAddOn {
  id: string;
  bookingId: string;
  addOnId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  addedAt: string;
  addedBy: string;
}

export interface BookingPayment {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  transactionId?: string;
  notes?: string;
  paidAt: string;
  createdBy: string;
}

export interface CreateBookingRequest {
  clientId: string;
  serviceIds: string[];
  staffId?: string;
  bookingDate: string;
  startTime: string;
  clientNotes?: string;
  source?: BookingSource;
}

export interface CreateGuestBookingRequest {
  // Client info
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  gender?: Gender;
  // Booking info
  serviceIds: string[];
  staffId?: string;
  bookingDate: string;
  startTime: string;
  clientNotes?: string;
}

export interface UpdateBookingRequest {
  staffId?: string;
  bookingDate?: string;
  startTime?: string;
  clientNotes?: string;
  staffNotes?: string;
}

export interface BookingFilters extends PaginationParams {
  status?: BookingStatus;
  source?: BookingSource;
  staffId?: string;
  clientId?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPaid?: boolean;
}

export interface AvailableSlotsRequest {
  date: string;
  serviceIds: string[];
  staffId?: string;
  duration?: number;
}

export interface AvailableSlot {
  time: string;
  staffId?: string;
  staffName?: string;
  available: boolean;
}

// ==================== Client Types ====================

export interface Client {
  id: string;
  tenantId: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  phone: string;
  email?: string;
  gender: Gender;
  dateOfBirth?: string;
  avatar?: string;
  notes?: string;
  tags: string[];
  source?: ClientSource;
  // Stats
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowCount: number;
  totalSpent: number;
  averageVisitValue?: number;
  // Loyalty
  loyaltyPoints: number;
  lifetimePoints: number;
  loyaltyTier: LoyaltyTier;
  tierReachedAt?: string;
  // Rating
  clientRating: ClientRating;
  ratingNotes?: string;
  // Referral
  referralCode?: string;
  referredById?: string;
  totalReferrals: number;
  // Balance
  outstandingBalance: number;
  // Dates
  firstVisitDate?: string;
  lastVisitDate?: string;
  lastLoginAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  tenantId: string;
  createdBy: string;
  note: string;
  createdAt: string;
  user?: User;
}

export interface CreateClientRequest {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  gender?: Gender;
  dateOfBirth?: string;
  notes?: string;
  tags?: string[];
  source?: ClientSource;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {}

export interface ClientFilters extends PaginationParams {
  isActive?: boolean;
  gender?: Gender;
  clientRating?: ClientRating;
  loyaltyTier?: LoyaltyTier;
  source?: ClientSource;
  hasEmail?: boolean;
  tags?: string[];
  minSpent?: number;
  maxSpent?: number;
}

// ==================== Service Types ====================

export interface Service {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  categoryId: string;
  category: {
    id: string;
    nameAr: string;
    nameEn: string | null;
  };
  duration: number;
  bufferTime: number;
  // Pricing
  pricingType: PricingType;
  price: number | null;
  estimatedPriceFrom: number | null;
  estimatedPriceTo: number | null;
  // Discount
  hasDiscount: boolean;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountStartDate: string | null;
  discountEndDate: string | null;
  // Display
  image: string | null;
  gallery: string[];
  gender: ServiceGender;
  order: number;
  // Stats
  popularityScore: number;
  totalBookings: number;
  deletedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string | null;
  icon: string | null;
  description: string | null;
  order: number;
  isActive: boolean;
  serviceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAddon {
  id: string;
  serviceId: string;
  tenantId: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  duration: number;
  isOptional: boolean;
  isActive: boolean;
  order: number;
}

export interface CreateServiceRequest {
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  categoryId: string;
  duration: number;
  bufferTime?: number;
  pricingType?: PricingType;
  price?: number;
  estimatedPriceFrom?: number;
  estimatedPriceTo?: number;
  gender?: ServiceGender;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  isActive?: boolean;
  order?: number;
}

export interface ServiceFilters extends PaginationParams {
  categoryId?: string;
  isActive?: boolean;
  gender?: ServiceGender;
  pricingType?: PricingType;
  hasDiscount?: boolean;
}

// ==================== Staff Types ====================

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  specialization?: string;
  bio?: string;
  yearsOfExperience?: number;
  isActive: boolean;
  // Relations
  availability?: StaffAvailability[];
  metrics?: StaffMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAvailability {
  id: string;
  staffId: string;
  tenantId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface StaffDayOff {
  id: string;
  staffId: string;
  tenantId: string;
  date: string;
  reason?: string;
  type: "VACATION" | "SICK" | "PERSONAL" | "OTHER";
}

export interface StaffMetrics {
  id: string;
  staffId: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  totalRevenue: number;
  averageRating: number;
}

export interface CreateStaffRequest {
  name: string;
  phone?: string;
  email?: string;
  specialization?: string;
  bio?: string;
  yearsOfExperience?: number;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {
  isActive?: boolean;
}

export interface StaffFilters extends PaginationParams {
  isActive?: boolean;
}

// ==================== Users Types ====================

export type CompanyUserRole = "OWNER" | "STAFF" | "SUPER_ADMIN";
export type CompanyUserStatus = "ACTIVE" | "DISABLED";

export interface StaffPermissionsMap {
  manageUsers?: boolean;
  viewParties?: boolean;
  manageParties?: boolean;
  viewLedger?: boolean;
  manageLedger?: boolean;
  viewReports?: boolean;
  createInvoice?: boolean;
  editDraft?: boolean;
  approveInvoice?: boolean;
  rejectInvoice?: boolean;
  recordPayment?: boolean;
  viewCustomerBalances?: boolean;
  viewInstallments?: boolean;
  manageInstallments?: boolean;
  'tax_setup.view'?: boolean;
  'tax_setup.manage_registration_profile'?: boolean;
  'tax_setup.create_rate'?: boolean;
  'tax_setup.edit_rate'?: boolean;
  'tax_setup.archive_rate'?: boolean;
  'tax_setup.manage_treatments'?: boolean;
  'tax_setup.manage_defaults'?: boolean;
  'tax_setup.manage_account_bindings'?: boolean;
  'tax_setup.manage_module_applicability'?: boolean;
  [key: string]: boolean | undefined;
}

export interface CompanyUser {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: CompanyUserRole;
  status: CompanyUserStatus;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    id?: string;
    userId?: string;
    permissions?: StaffPermissionsMap;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export interface CreateStaffUserRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  permissions?: StaffPermissionsMap;
}

export interface UpdateCompanyUserRequest {
  fullName?: string;
  phone?: string | null;
}

export interface UpdateStaffPermissionsRequest extends StaffPermissionsMap {}

export type CredentialsResetChannel = "email" | "whatsapp";

export interface ResetUserCredentialsRequest {
  companyId: string;
  channel?: CredentialsResetChannel;
  reason?: string;
}

export interface ResetUserCredentialsResponse {
  userId: string;
  channel: CredentialsResetChannel;
  expiresAt: string;
  sessionsRevoked: boolean;
}

export interface UsersStats {
  total: number;
  active: number;
  disabled: number;
  staff: number;
  owners: number;
}

export interface UsersFilters extends PaginationParams {
  search?: string;
  status?: CompanyUserStatus;
}

export interface UsersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsersListResponse {
  items: CompanyUser[];
  meta: UsersListMeta;
}

// ==================== Notifications Types ====================

export type NotificationDevicePlatform = "ios" | "android" | "web";

export interface NotificationFeedItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface NotificationFeedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface NotificationFeedResponse {
  items: NotificationFeedItem[];
  meta: NotificationFeedMeta;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  onlyUnread?: boolean;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface RegisterNotificationDeviceTokenRequest {
  token: string;
  platform: NotificationDevicePlatform;
  deviceName?: string;
}

// ==================== Accounting Types ====================

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  clientId?: string;
  client?: Client;
  bookingId?: string;
  booking?: Booking;
  // Items
  items: InvoiceItem[];
  // Amounts
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  // Status
  status: InvoiceStatus;
  dueDate?: string;
  issuedAt?: string;
  paidAt?: string;
  voidedAt?: string;
  voidReason?: string;
  // Meta
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceId?: string;
}

export interface CreateAccountingInvoiceRequest {
  clientId?: string;
  bookingId?: string;
  items: {
    description: string;
    descriptionAr?: string;
    quantity: number;
    unitPrice: number;
    serviceId?: string;
  }[];
  discountAmount?: number;
  taxAmount?: number;
  dueDate?: string;
  notes?: string;
}

export interface InvoiceFilters extends PaginationParams {
  status?: InvoiceStatus;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface Expense {
  id: string;
  tenantId: string;
  categoryId: string;
  category?: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  receiptUrl?: string;
  paymentMethod?: PaymentMethod;
  vendor?: string;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export interface CreateExpenseRequest {
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod?: PaymentMethod;
  vendor?: string;
  reference?: string;
  notes?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {}

export interface ExpenseFilters extends PaginationParams {
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface DailyClose {
  id: string;
  tenantId: string;
  date: string;
  // Revenue
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  otherRevenue: number;
  // Expenses
  totalExpenses: number;
  // Summary
  netAmount: number;
  bookingsCount: number;
  // Cash
  openingCash: number;
  closingCash: number;
  cashDifference: number;
  // Status
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  notes?: string;
  createdAt: string;
}

// ==================== Reports Types ====================

export interface ProfitLossReport {
  period: { from: string; to: string };
  revenue: {
    total: number;
    byPaymentMethod: Record<PaymentMethod, number>;
    byService: { serviceId: string; name: string; amount: number }[];
  };
  expenses: {
    total: number;
    byCategory: { categoryId: string; name: string; amount: number }[];
  };
  grossProfit: number;
  profitMargin: number;
}

export interface DailySummary {
  date: string;
  bookings: { total: number; completed: number; cancelled: number; noShow: number };
  revenue: { total: number; byPaymentMethod: Record<PaymentMethod, number> };
  expenses: number;
  netAmount: number;
  newClients: number;
}

export interface CashFlowReport {
  period: { from: string; to: string };
  inflows: { total: number; bySource: Record<string, number> };
  outflows: { total: number; byCategory: Record<string, number> };
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

// ==================== Operational Reports (Accounting Backend) ====================

export interface ReportsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReportsSummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  partyType?: PartyType;
}

export interface ReportsSummaryResponse {
  totalReceivables: string;
  deferredSales: {
    total: number;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    overdueCount: number;
    overdueAmount: string;
  };
  installments: {
    activeContracts: number;
    totalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    overdueSchedules: number;
    overdueAmount: string;
  };
}

export type CollectionItemType = "DEFERRED" | "INSTALLMENT";
export type CollectionFlow = "DEFERRED" | "INSTALLMENT";
export type CollectionMetric = "PAID" | "REMAINING" | "OVERDUE";
export type DebtEntityType = "CUSTOMER" | "SUPPLIER";
export type DebtBalanceType = "RECEIVABLE" | "PAYABLE";

export interface CollectionsFollowupFilters extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  partyType?: PartyType;
  partyId?: string;
  flow?: CollectionFlow;
  metric?: CollectionMetric;
}

export interface CollectionFollowupItem {
  type: CollectionItemType;
  referenceNumber: string;
  dueDate: string;
  partyName: string;
  partyPhone: string | null;
  expectedAmount: string;
  daysUntilDue: number;
}

export interface CollectionsFollowupSummary {
  expectedAmount: string;
  collectedAmount: string;
  collectionRatePercent: string;
  overdueOutstanding: string;
}

export interface CollectionsFollowupReportResponse {
  period: {
    dateFrom: string;
    dateTo: string;
  };
  summary: CollectionsFollowupSummary;
  items: CollectionFollowupItem[];
  meta: ReportsMeta;
}

export interface DebtsSummaryFilters extends PaginationParams {
  entityType?: DebtEntityType;
  balanceType?: DebtBalanceType;
  isActive?: boolean;
  minAmount?: number;
}

export interface DebtsSummaryTotals {
  customersReceivable: string;
  customersCredit: string;
  suppliersReceivable: string;
  suppliersPayable: string;
  netReceivable: string;
}

export interface DebtsSummaryItem {
  entityType: DebtEntityType;
  partyId: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  amount: string;
  balanceRaw: string;
  balanceType: DebtBalanceType;
}

export interface DebtsSummaryReportResponse {
  totals: DebtsSummaryTotals;
  items: DebtsSummaryItem[];
  meta: ReportsMeta;
}

export interface StaffActivityFilters extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export interface StaffActivitySummary {
  usersCount: number;
  totalActivities: number;
  totalInvoices: number;
  totalInvoiceAmount: string;
  totalCollections: string;
  totalExpenses: string;
}

export interface StaffActivityItem {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  activitiesCount: number;
  invoicesCount: number;
  invoicesAmount: string;
  collectionsAmount: string;
  expensesAmount: string;
  lastActivityAt: string | null;
}

export interface StaffActivityReportResponse {
  period: {
    dateFrom: string;
    dateTo: string;
  };
  summary: StaffActivitySummary;
  items: StaffActivityItem[];
  meta: ReportsMeta;
}

export interface SimpleLedgerFilters extends PaginationParams {
  partyType: PartyType;
  partyId: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SimpleLedgerItem {
  id: string;
  date: string;
  dueDate: string | null;
  entryType: string;
  note: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface SimpleLedgerReportResponse {
  party: {
    id: string;
    name: string;
    partyType: PartyType;
  } | null;
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  currentBalance: string;
  items: SimpleLedgerItem[];
  meta: ReportsMeta;
}

export type ReportSaleType = "CASH" | "DEFERRED" | "INSTALLMENT";

export interface ProfitLossFilters {
  dateFrom?: string;
  dateTo?: string;
  comparePrevious?: boolean;
}

export interface ProfitLossResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  revenue: {
    invoicesCount: number;
    grossSales: string;
    taxAmount: string;
    netSales: string;
    byPartyType: Array<{
      partyType: PartyType;
      amount: string;
    }>;
  };
  expenses: {
    expensesCount: number;
    total: string;
    byCategory: Array<{
      category: string;
      amount: string;
    }>;
  };
  profit: {
    grossProfit: string;
    netProfit: string;
    marginPercent: string;
  };
  comparison: {
    previousPeriod: {
      dateFrom: string;
      dateTo: string;
      days: number;
    };
    revenue: string;
    expenses: string;
    netProfit: string;
    netProfitGrowthPercent: string | null;
  } | null;
}

export interface CashFlowFilters extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface CashFlowDayItem {
  date: string;
  inflow: string;
  outflow: string;
  net: string;
  closingBalance: string;
}

export interface CashFlowResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  totals: {
    openingBalance: string;
    inflow: string;
    outflow: string;
    netChange: string;
    closingBalance: string;
  };
  items: CashFlowDayItem[];
  meta: ReportsMeta;
}

export interface AgingFilters extends PaginationParams {
  asOfDate?: string;
  search?: string;
  isActive?: boolean;
}

export interface AgingSummary {
  partiesCount: number;
  totalOutstanding: string;
  bucket_0_30: string;
  bucket_31_60: string;
  bucket_61_90: string;
  bucket_90_plus: string;
}

export interface AgingItem {
  partyId: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  totalOutstanding: string;
  bucket_0_30: string;
  bucket_31_60: string;
  bucket_61_90: string;
  bucket_90_plus: string;
  oldestDueDate: string | null;
  lastTransactionDate: string | null;
}

export interface AgingResponse {
  asOfDate: string;
  summary: AgingSummary;
  items: AgingItem[];
  meta: ReportsMeta;
}

export interface SalesDetailedFilters extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  partyType?: PartyType;
  partyId?: string;
  createdById?: string;
  saleType?: ReportSaleType;
  search?: string;
}

export interface SalesDetailedItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  totalAmount: string;
  taxAmount: string;
  netAmount: string;
  saleType: ReportSaleType;
  createdBy: {
    id: string;
    fullName: string | null;
  };
}

export interface SalesDetailedResponse {
  summary: {
    invoicesCount: number;
    grossAmount: string;
    taxAmount: string;
    netAmount: string;
  };
  items: SalesDetailedItem[];
  meta: ReportsMeta;
}

export interface ExpensesAnalyticsFilters extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  category?: ExpenseCategoryValue;
  supplierId?: string;
  search?: string;
  comparePrevious?: boolean;
}

export interface ExpensesAnalyticsResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  summary: {
    totalAmount: string;
    expensesCount: number;
    averageExpense: string;
  };
  byCategory: Array<{
    category: string;
    amount: string;
    count: number;
    percentOfTotal: string;
  }>;
  comparison: {
    previousTotalAmount: string;
    previousExpensesCount: number;
    growthPercent: string | null;
  } | null;
  items: Array<{
    id: string;
    expenseDate: string;
    category: string;
    amount: string;
    supplierName: string | null;
    description: string | null;
    createdBy: { id: string; fullName: string | null };
  }>;
  meta: ReportsMeta;
}

export interface ProductsPerformanceFilters extends PaginationParams {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  isActive?: boolean;
}

export interface ProductsPerformanceResponse {
  summary: {
    totalProducts: number;
    totalQuantity: string;
    totalSalesAmount: string;
  };
  items: Array<{
    productId: string | null;
    productName: string;
    sku: string | null;
    category: string | null;
    quantitySold: string;
    salesAmount: string;
    averageUnitPrice: string;
    invoicesCount: number;
  }>;
  meta: ReportsMeta;
}

export interface OperationalPerformanceFilters {
  dateFrom?: string;
  dateTo?: string;
  comparePrevious?: boolean;
}

export interface OperationalPerformanceResponse {
  period: {
    dateFrom: string;
    dateTo: string;
    days: number;
  };
  sales: {
    invoicesCount: number;
    revenue: string;
    avgInvoiceValue: string;
    growthPercent: string | null;
  };
  expenses: {
    total: string;
    growthPercent: string | null;
  };
  quality: {
    cancelledInvoicesCount: number;
    cancellationRatePercent: string;
  };
  collections: {
    expected: string;
    actual: string;
    collectionRatePercent: string;
  };
}

export interface CriticalAlertsFilters {
  asOfDate?: string;
  creditUsageThresholdPercent?: number;
  largeOverdueAmount?: number;
  upcomingInstallmentsDays?: number;
  limit?: number;
}

export interface CriticalAlertsResponse {
  asOfDate: string;
  creditLimitRisk: Array<{
    customerId: string;
    name: string;
    phone: string | null;
    creditLimit: string;
    balance: string;
    usagePercent: string;
  }>;
  largeOverdues: Array<{
    type: "DEFERRED" | "INSTALLMENT";
    referenceNumber: string;
    partyName: string;
    dueDate: string;
    overdueDays: number;
    outstandingAmount: string;
  }>;
  expensesSpike: {
    current: string;
    previous: string;
    growthPercent: string | null;
    isAlert: boolean;
  };
  upcomingInstallments: Array<{
    contractId: string;
    contractNumber: string;
    scheduleId: string;
    partyName: string;
    dueDate: string;
    amount: string;
    remainingAmount: string;
  }>;
}

export interface ReportsLedgerStatementFilters extends PaginationParams {
  partyType: PartyType;
  partyId: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportsLedgerStatementResponse {
  party: {
    id: string;
    name: string;
    partyType: PartyType;
  } | null;
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  currentBalance: string;
  items: SimpleLedgerItem[];
  meta: ReportsMeta;
}

// ==================== Loyalty Types ====================

export interface LoyaltySettings {
  id: string;
  tenantId: string;
  isEnabled: boolean;
  pointsPerEGP: number; // Points earned per currency unit spent
  egpPerPoint: number; // Currency value per point redeemed
  minimumRedemption: number;
  maximumRedemption?: number;
  pointsExpiry?: number; // Days until points expire (null = never)
  welcomePoints: number;
  referralPointsReferrer: number;
  referralPointsReferred: number;
  birthdayPoints: number;
}

export interface LoyaltyReward {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  pointsCost: number;
  rewardType: "DISCOUNT_PERCENTAGE" | "DISCOUNT_FIXED" | "FREE_SERVICE" | "GIFT";
  discountValue?: number;
  serviceId?: string;
  service?: Service;
  maxRedemptions?: number;
  currentRedemptions: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PointsTransaction {
  id: string;
  clientId: string;
  tenantId: string;
  type: "EARN" | "REDEEM" | "EXPIRE" | "ADJUST" | "WELCOME" | "REFERRAL" | "BIRTHDAY";
  points: number; // Positive for earn, negative for redeem/expire
  balanceAfter: number;
  description: string;
  bookingId?: string;
  rewardId?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CreateRewardRequest {
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  pointsCost: number;
  rewardType: LoyaltyReward["rewardType"];
  discountValue?: number;
  serviceId?: string;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface RedeemRewardRequest {
  clientId: string;
  rewardId: string;
  bookingId?: string;
}

// ==================== Review Types ====================

export interface Review {
  id: string;
  tenantId: string;
  bookingId: string;
  booking?: Booking;
  clientId: string;
  client?: Client;
  rating: number; // 1-5
  comment?: string;
  // Response
  response?: string;
  respondedAt?: string;
  respondedBy?: string;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  recentReviews: Review[];
}

export interface ReviewFilters extends PaginationParams {
  rating?: number;
  hasResponse?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface RespondToReviewRequest {
  response: string;
}

// ==================== Notification Types ====================

export interface Notification {
  id: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  // Recipient
  clientId?: string;
  client?: Client;
  bookingId?: string;
  phone?: string;
  email?: string;
  // Content
  subject?: string;
  message: string;
  templateUsed?: string;
  // Tracking
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  // Meta
  scheduledAt?: string;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  messageAr: string;
  messageEn?: string;
  variables: string[]; // Available template variables
  isActive: boolean;
}

export interface NotificationSettings {
  id: string;
  tenantId: string;
  // Channels
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  // Auto-notifications
  sendBookingConfirmation: boolean;
  sendBookingReminder: boolean;
  reminderHoursBefore: number;
  sendReviewRequest: boolean;
  reviewRequestHoursAfter: number;
  // Provider settings
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
}

export interface NotificationFilters extends PaginationParams {
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  clientId?: string;
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SendNotificationRequest {
  clientId: string;
  channel: NotificationChannel;
  type?: NotificationType;
  message: string;
  scheduledAt?: string;
}

// ==================== Settings Types ====================

export interface TenantSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  businessHours: BusinessHoursSettings;
  booking: BookingSettings;
  notification: NotificationPreferences;
  loyalty: LoyaltySettings;
}

export interface GeneralSettings {
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  locale: string;
}

export interface BrandingSettings {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  coverUrl?: string;
  fontFamily?: string;
}

export interface BusinessHoursSettings {
  workingHours: Record<
    string,
    { isOpen: boolean; open?: string; close?: string; breakStart?: string; breakEnd?: string }
  >;
  holidays: { date: string; nameAr: string; nameEn?: string }[];
}

export interface BookingSettings {
  allowOnlineBooking: boolean;
  requireClientPhone: boolean;
  requireClientEmail: boolean;
  allowWalkins: boolean;
  autoConfirmBookings: boolean;
  allowStaffSelection: boolean;
  showPrices: boolean;
  bookingLeadTime: number; // hours
  maxAdvanceBooking: number; // days
  cancellationWindow: number; // hours
  requireDeposit: boolean;
  depositType?: "FIXED" | "PERCENTAGE";
  depositAmount?: number;
  lateCancelPenalty: number;
  noShowPenalty: number;
}

export interface NotificationPreferences {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  sendBookingConfirmation: boolean;
  sendReminder: boolean;
  reminderHoursBefore: number;
}

// ==================== Dashboard Types ====================

export interface DashboardStats {
  today: {
    bookings: number;
    revenue: number;
    newClients: number;
    completedServices: number;
  };
  week: {
    bookings: number;
    revenue: number;
    newClients: number;
  };
  month: {
    bookings: number;
    revenue: number;
    newClients: number;
    averageTicket: number;
  };
  bookingsByStatus: Record<BookingStatus, number>;
}

export interface QuickDashboard {
  todayRevenue: number;
  todayBookings: number;
  pendingBookings: number;
  upcomingBookings: Booking[];
}

export interface OwnerDashboard extends DashboardStats {
  revenueChart: { labels: string[]; data: number[] };
  bookingsChart: { labels: string[]; data: number[] };
  topServices: { service: Service; count: number; revenue: number }[];
  topStaff: { staff: Staff; bookings: number; revenue: number; rating: number }[];
  recentActivity: {
    type: string;
    message: string;
    timestamp: string;
    data?: any;
  }[];
}

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  period?: "today" | "week" | "month" | "year" | "custom";
}

// ==================== Calendar Types ====================

export interface CalendarDay {
  date: string;
  bookings: Booking[];
  totalBookings: number;
  totalRevenue: number;
}

export interface CalendarWeek {
  weekStart: string;
  weekEnd: string;
  days: CalendarDay[];
}

export interface CalendarMonth {
  month: number;
  year: number;
  days: {
    date: string;
    bookingsCount: number;
    hasBookings: boolean;
  }[];
}

export interface CalendarFilters {
  date?: string;
  staffId?: string;
  view?: "day" | "week" | "month";
}

// ==================== Public Booking Types ====================

export interface PublicCenterInfo {
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  addressAr?: string;
  addressEn?: string;
  googleMapsUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  workingHours: {
    day: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  }[];
  primaryColor?: string;
  secondaryColor?: string;
}

export interface PublicService {
  id: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  categoryId: string;
  categoryNameAr: string;
  categoryNameEn?: string;
  duration: number;
  pricingType: PricingType;
  price?: number;
  priceFrom?: number;
  priceTo?: number;
  hasDiscount: boolean;
  discountedPrice?: number;
  image?: string;
  gender: ServiceGender;
}

export interface PublicBundle {
  id: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  services: { id: string; nameAr: string; nameEn?: string }[];
  originalPrice: number;
  bundlePrice: number;
  discountPercent?: number;
  totalDuration: number;
  imageUrl?: string;
  badge?: string;
}

export interface PublicOffer {
  id: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  offerType: "PERCENTAGE" | "FIXED_AMOUNT" | "BUY_X_GET_Y";
  discountPercent?: number;
  discountAmount?: number;
  validFrom: string;
  validUntil: string;
  imageUrl?: string;
  badge?: string;
}

export interface CheckAvailabilityRequest {
  serviceIds: string[];
  staffId?: string;
  date: string;
}

export interface AvailabilitySlot {
  time: string;
  staffId?: string;
  staffName?: string;
  available: boolean;
}

export interface CreatePublicBookingRequest {
  // Client info
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  gender?: Gender;
  // Booking
  serviceIds: string[];
  staffId?: string;
  date: string;
  time: string;
  notes?: string;
}

// ==================== SETTINGS ====================



export interface UpdateGeneralSettingsDto {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  addressAr?: string;
  addressEn?: string;
  city?: string;
  governorate?: string;
  googleMapsUrl?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  timezone?: string;
  currency?: string;
  language?: string;
}



export interface UpdateBrandingSettingsDto {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  customCSS?: string;
}

export interface DaySchedule {
  isOpen: boolean;
  open?: string;
  close?: string;
}

export interface WorkingHours {
  sunday?: DaySchedule;
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
}

export interface Holiday {
  date: string;
  nameAr: string;
  nameEn: string;
}



export interface UpdateBusinessHoursSettingsDto {
  workingHours?: WorkingHours;
  holidays?: Holiday[];
}



export interface UpdateBookingSettingsDto {
  allowOnlineBooking?: boolean;
  requireApproval?: boolean;
  minBookingNoticeHours?: number;
  maxAdvanceBookingDays?: number;
  bufferTimeBetweenBookings?: number;
  slotDuration?: number;
  allowCancellation?: boolean;
  cancellationDeadlineHours?: number;
  cancellationFeePercentage?: number;
  noShowFeePercentage?: number;
  requireDeposit?: boolean;
  depositPercentage?: number;
  depositRefundable?: boolean;
  enableWaitingList?: boolean;
  maxWaitingListSize?: number;
  waitingListExpiryHours?: number;
}



export interface UpdateNotificationSettingsDto {
  whatsappEnabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  confirmationEnabled?: boolean;
  reminderEnabled?: boolean;
  completionEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderHoursBefore?: number;
}

export interface LoyaltyTierType {
  name: string;
  minPoints: number;
  discountPercentage: number;
}



export interface UpdateLoyaltySettingsDto {
  isEnabled?: boolean;
  pointsPerEGP?: number;
  pointsExpiryDays?: number;
  minimumPointsToRedeem?: number;
  pointsRedemptionValue?: number;
  tiers?: LoyaltyTierType[];
  referralEnabled?: boolean;
  referrerPoints?: number;
  refereePoints?: number;
}

export interface AllSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  businessHours: BusinessHoursSettings;
  booking: BookingSettings;
  notification: NotificationSettings;
  loyalty: LoyaltySettings;
}

export interface UploadResponse {
  message: string;
  logoUrl?: string;
  coverUrl?: string;
}

export interface ResetResponse {
  message: string;
  category: string;
}

