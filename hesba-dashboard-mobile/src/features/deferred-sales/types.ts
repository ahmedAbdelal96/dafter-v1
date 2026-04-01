/**
 * Deferred Sales — Type Definitions
 *
 * Mirrors the backend DeferredSale + DeferredPayment Prisma models.
 * All monetary amounts are strings (Prisma Decimal serialized to string over HTTP).
 * All dates are ISO strings.
 *
 * Status lifecycle:
 *   PENDING → PARTIAL → PAID  (normal flow with payments)
 *   PENDING | PARTIAL → OVERDUE (when dueDate passes without full payment)
 *   Any status → cancelled (admin action, not a status — soft cancellation)
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type DeferredSaleStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface DeferredSale {
  id: string;
  companyId: string;
  partyType: PartyType;
  partyId: string;
  ledgerEntryId: string;
  referenceNumber: string;
  description?: string | null;
  /** Prisma Decimal → serialized as string over HTTP */
  totalAmount: string;
  /** Prisma Decimal → serialized as string over HTTP */
  paidAmount: string;
  /** Computed by backend: totalAmount - paidAmount, as string */
  remaining: string;
  /** ISO date string (date only, no time component) */
  dueDate: string;
  status: DeferredSaleStatus;
  createdById: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeferredPayment {
  id: string;
  companyId: string;
  deferredSaleId: string;
  ledgerEntryId: string;
  /** Prisma Decimal → serialized as string */
  amount: string;
  /** ISO date string (date only) */
  paymentDate: string;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Detail response — includes party name + full payments array */
export interface DeferredSaleDetail extends DeferredSale {
  partyName: string | null;
  payments: DeferredPayment[];
}

// ─── API Shapes ───────────────────────────────────────────────────────────────

export interface DeferredSalesListResponse {
  items: DeferredSale[];
  total: number;
  page: number;
  limit: number;
}

/** Query params for GET /deferred-sales */
export interface DeferredSalesQuery {
  status?: DeferredSaleStatus;
  partyType?: PartyType;
  partyId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/** POST /deferred-sales */
export interface CreateDeferredSalePayload {
  partyType: PartyType;
  partyId: string;
  /** Number — backend validates >= 0.01 */
  totalAmount: number;
  /** YYYY-MM-DD */
  dueDate: string;
  description?: string;
  expectedPaymentMethod?: string;
  /** YYYY-MM-DD — defaults to today on backend */
  entryDate?: string;
}

/** POST /deferred-sales/:id/payments */
export interface RecordPaymentPayload {
  /** Number — must be > 0 and <= remaining */
  amount: number;
  /** YYYY-MM-DD */
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

/** Module accent color — violet, distinct from all other modules */
export const DEFERRED_ACCENT = '#7c3aed';
export const DEFERRED_ACCENT_LIGHT = '#ede9fe';
export const DEFERRED_ACCENT_DARK = '#6d28d9';

/** Per-status color config for badges and progress */
export const STATUS_CONFIG: Record<
  DeferredSaleStatus,
  { color: string; bgColor: string; darkColor: string; darkBgColor: string }
> = {
  PENDING: {
    color: '#b45309',
    bgColor: '#fffbeb',
    darkColor: '#fbbf24',
    darkBgColor: '#292524',
  },
  PARTIAL: {
    color: '#1d4ed8',
    bgColor: '#eff6ff',
    darkColor: '#60a5fa',
    darkBgColor: '#1e3a5f',
  },
  PAID: {
    color: '#15803d',
    bgColor: '#f0fdf4',
    darkColor: '#4ade80',
    darkBgColor: '#14532d',
  },
  OVERDUE: {
    color: '#b91c1c',
    bgColor: '#fef2f2',
    darkColor: '#f87171',
    darkBgColor: '#450a0a',
  },
};

/** Status filter tabs shown at the top of the list screen */
export type StatusFilter = 'ALL' | DeferredSaleStatus;

export const STATUS_FILTERS: StatusFilter[] = [
  'ALL',
  'PENDING',
  'PARTIAL',
  'OVERDUE',
  'PAID',
];

/** Convert a monetary Decimal string to a JS float for display */
export function toFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return parseFloat(String(value)) || 0;
}

/** Format today's date as YYYY-MM-DD */
export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
