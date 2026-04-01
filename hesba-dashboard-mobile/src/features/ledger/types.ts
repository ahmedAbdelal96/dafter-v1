// ─── Ledger Feature — Types ────────────────────────────────────────────────────
// Matches backend contract exactly.
// All Decimal fields arrive as strings over HTTP.
// Dates from backend arrive as ISO strings.

// ─── Enums (must match Prisma enum names) ─────────────────────────────────────

export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';

export type LedgerEntryType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'ADVANCE'
  | 'SALARY_PAYMENT'
  | 'DEDUCTION';

// ─── Entry / Statement ────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  entryType: LedgerEntryType;
  /** Prisma Decimal — serialized as string */
  signedAmount: string;
  /** Date-only ISO string, e.g. "2026-03-11T00:00:00.000Z" */
  entryDate: string;
  dueDate: string | null;
  note: string | null;
  createdById: string;
  createdAt: string;
  /** Running balance AFTER this entry — 2dp string (computed server-side) */
  runningBalance: string;
}

export interface StatementResult {
  partyInfo: { id: string; name: string; partyType: PartyType } | null;
  /** Real-time balance from Balance snapshot table */
  currentBalance: string;
  /** Balance at the start of the requested period */
  openingBalanceForPeriod: string;
  /** Balance at the end of the requested period */
  closingBalanceForPeriod: string;
  items: LedgerEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface StatementParams {
  partyType: PartyType;
  partyId: string;
  page?: number;
  limit?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateLedgerEntryDto {
  partyType: PartyType;
  partyId: string;
  entryType: LedgerEntryType;
  /** signedAmount: client is responsible for the sign (see computeSignedAmount) */
  signedAmount: number;
  /** YYYY-MM-DD */
  entryDate: string;
  dueDate?: string;
  note?: string;
}

// ─── Module constants ─────────────────────────────────────────────────────────

export const LEDGER_ACCENT = '#475569';
export const LEDGER_ACCENT_LIGHT = '#f8fafc';

/** Entry types available per party type */
export const ENTRY_TYPES_BY_PARTY: Record<PartyType, LedgerEntryType[]> = {
  CUSTOMER: ['INVOICE', 'PAYMENT', 'RETURN', 'ADJUSTMENT'],
  SUPPLIER: ['INVOICE', 'PAYMENT', 'RETURN', 'ADJUSTMENT'],
  EMPLOYEE: ['ADVANCE', 'SALARY_PAYMENT', 'DEDUCTION'],
};

/**
 * Sign map: the client computes signedAmount based on partyType + entryType.
 * +1 = credit (increases balance toward our favor)
 * -1 = debit  (decreases balance toward our favor)
 *
 * Backend DTO comments (source of truth):
 *   Customer INVOICE: -500 (debt ON customer)
 *   Customer PAYMENT: +500 (payment FROM customer)
 *   Supplier INVOICE: +500 (we received goods — debt TO supplier)
 *   Supplier PAYMENT: -500 (we paid the supplier)
 *   Employee ADVANCE: -200 (advance TO employee — they owe us)
 *   Employee SALARY_PAYMENT: +3000 (we paid salary)
 */
const SIGN_MAP: Record<PartyType, Partial<Record<LedgerEntryType, 1 | -1>>> = {
  CUSTOMER: { INVOICE: -1, PAYMENT: 1, RETURN: 1, ADJUSTMENT: -1 },
  SUPPLIER: { INVOICE: 1,  PAYMENT: -1, RETURN: -1, ADJUSTMENT: 1 },
  EMPLOYEE: { ADVANCE: -1, SALARY_PAYMENT: 1, DEDUCTION: -1 },
};

/** Returns the signed amount to send to the backend */
export function computeSignedAmount(
  amount: number,
  partyType: PartyType,
  entryType: LedgerEntryType,
): number {
  const sign = SIGN_MAP[partyType]?.[entryType] ?? -1;
  return parseFloat((sign * amount).toFixed(2));
}

/** Parse a Decimal string or number safely */
export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

/** Format date string to YYYY-MM-DD for API */
export function formatDateForApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Icon name per entry type */
export const ENTRY_TYPE_ICONS: Record<LedgerEntryType, string> = {
  INVOICE:         'receipt-outline',
  PAYMENT:         'cash-outline',
  RETURN:          'return-down-back-outline',
  ADJUSTMENT:      'options-outline',
  ADVANCE:         'wallet-outline',
  SALARY_PAYMENT:  'card-outline',
  DEDUCTION:       'remove-circle-outline',
};

/** Accent color per entry type (for icon circles) */
export const ENTRY_TYPE_COLORS: Record<LedgerEntryType, string> = {
  INVOICE:        '#dc2626',
  PAYMENT:        '#16a34a',
  RETURN:         '#2563eb',
  ADJUSTMENT:     '#d97706',
  ADVANCE:        '#7c3aed',
  SALARY_PAYMENT: '#0d9488',
  DEDUCTION:      '#475569',
};
