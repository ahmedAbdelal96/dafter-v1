/**
 * Installments (بيع بالتقسيط) — Type Definitions
 *
 * Mirrors backend Prisma models:
 *   InstallmentContract, InstallmentSchedule, InstallmentPayment
 *
 * ⚠️  All monetary fields (totalAmount, paidAmount, etc.) are Prisma Decimal
 *     and arrive from the API as STRINGS. Always use toFloat() before display
 *     or arithmetic.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';

export type InstallmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'DEFAULTED';

export type ScheduleStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';

export type ScheduleType = 'FIXED' | 'CUSTOM';

// ─── Status Filter ─────────────────────────────────────────────────────────────

export type ContractStatusFilter = 'ALL' | InstallmentStatus;
export const CONTRACT_STATUS_FILTERS: ContractStatusFilter[] = [
  'ALL',
  'ACTIVE',
  'OVERDUE',
  'COMPLETED',
  'CANCELLED',
  'DEFAULTED',
];

// ─── Status Visual Config ─────────────────────────────────────────────────────

interface StatusColors {
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
}

export const CONTRACT_STATUS_CONFIG: Record<InstallmentStatus, StatusColors> = {
  ACTIVE:    { color: '#16a34a', bgColor: '#dcfce7', darkColor: '#4ade80', darkBgColor: '#14532d' },
  COMPLETED: { color: '#2563eb', bgColor: '#dbeafe', darkColor: '#60a5fa', darkBgColor: '#1e3a5f' },
  OVERDUE:   { color: '#dc2626', bgColor: '#fee2e2', darkColor: '#f87171', darkBgColor: '#450a0a' },
  CANCELLED: { color: '#6b7280', bgColor: '#f3f4f6', darkColor: '#9ca3af', darkBgColor: '#1f2937' },
  DEFAULTED: { color: '#ea580c', bgColor: '#ffedd5', darkColor: '#fb923c', darkBgColor: '#431407' },
};

export const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatus, StatusColors> = {
  PENDING:  { color: '#d97706', bgColor: '#fef3c7', darkColor: '#fbbf24', darkBgColor: '#451a03' },
  PARTIAL:  { color: '#7c3aed', bgColor: '#ede9fe', darkColor: '#a78bfa', darkBgColor: '#2e1065' },
  PAID:     { color: '#16a34a', bgColor: '#dcfce7', darkColor: '#4ade80', darkBgColor: '#14532d' },
  OVERDUE:  { color: '#dc2626', bgColor: '#fee2e2', darkColor: '#f87171', darkBgColor: '#450a0a' },
  WAIVED:   { color: '#6b7280', bgColor: '#f3f4f6', darkColor: '#9ca3af', darkBgColor: '#1f2937' },
};

// ─── Module Accent Color ──────────────────────────────────────────────────────

export const INSTALLMENT_ACCENT        = '#16a34a';
export const INSTALLMENT_ACCENT_LIGHT  = '#dcfce7';
export const INSTALLMENT_ACCENT_DARK   = '#15803d';

// ─── Models ───────────────────────────────────────────────────────────────────

/** Single payment on one installment schedule row */
export interface InstallmentPayment {
  id: string;
  scheduleId: string;
  contractId: string;
  companyId: string;
  amount: string;           // Prisma Decimal → string
  paymentDate: string;      // ISO date string
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

/** One row in the installment schedule (a single installment) */
export interface InstallmentSchedule {
  id: string;
  contractId: string;
  companyId: string;
  installmentNumber: number;
  dueDate: string;          // ISO date string
  amount: string;           // Prisma Decimal → string
  paidAmount: string;       // Prisma Decimal → string
  status: ScheduleStatus;
  notes: string | null;
  payments?: InstallmentPayment[];
}

/** List item shape (no schedules, no payments) */
export interface InstallmentContract {
  id: string;
  companyId: string;
  contractNumber: string;
  partyType: PartyType;
  partyId: string;
  partyName: string | null;
  status: InstallmentStatus;
  scheduleType: ScheduleType;
  totalAmount: string;       // Prisma Decimal → string
  downPayment: string;       // Prisma Decimal → string
  paidAmount: string;        // Prisma Decimal → string
  numberOfInstallments: number;
  startDate: string;         // ISO date string
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Detail shape (includes schedules; optionally includes payments per schedule) */
export interface InstallmentContractDetail extends InstallmentContract {
  schedules: InstallmentSchedule[];
}

// ─── List Response ────────────────────────────────────────────────────────────

/**
 * NOTE: The backend controller returns:
 *   { statusCode, message, data: InstallmentContract[], meta: { ... } }
 * The `meta` is attached directly to the response (not nested under `data`).
 * In the API layer: `res.data.data` = array, `res.data.meta` = pagination.
 */
export interface InstallmentsListResponse {
  data: InstallmentContract[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface ScheduleItemPayload {
  dueDate: string;
  amount: number;
  notes?: string;
}

export interface CreateContractPayload {
  partyType: PartyType;
  partyId: string;
  totalAmount: number;
  downPayment?: number;
  numberOfInstallments: number;
  scheduleType: ScheduleType;
  startDate: string;
  scheduleItems?: ScheduleItemPayload[];
  description?: string;
}

export interface RecordInstallmentPaymentPayload {
  scheduleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

export interface QueryContractsParams {
  page?: number;
  limit?: number;
  status?: InstallmentStatus;
  partyType?: PartyType;
  search?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely parse Prisma Decimal string to number */
export function toFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

/** Today's date as YYYY-MM-DD */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compute remaining amount on a contract */
export function remainingAmount(contract: InstallmentContract): number {
  return Math.max(0, toFloat(contract.totalAmount) - toFloat(contract.paidAmount));
}
