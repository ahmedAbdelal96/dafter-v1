// ─── Expenses Feature — Types ──────────────────────────────────────────────────
// Matches backend ExpenseWithSupplier shape + summary shape exactly.
// All Decimal (amount, totals) arrive as strings over HTTP.

// ─── Enum (must match Prisma enum names) ──────────────────────────────────────

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

export const ALL_CATEGORIES: ExpenseCategory[] = [
  'RENT', 'SALARIES', 'UTILITIES', 'SUPPLIES',
  'TRANSPORTATION', 'MAINTENANCE', 'MARKETING', 'TAXES', 'OTHER',
];

// ─── Entity ───────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  companyId: string;
  supplierId: string | null;
  /** Supplier mini-object or null if no supplier linked */
  supplier: { id: string; name: string } | null;
  category: ExpenseCategory;
  /** Prisma Decimal — serialized as string */
  amount: string;
  /** ISO date string, e.g. "2026-03-15T00:00:00.000Z" */
  expenseDate: string;
  description: string | null;
  referenceNumber: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdById: string;
  createdBy: { id: string; fullName: string | null };
  createdAt: string;
  updatedAt: string;
}

// ─── Paginated list ───────────────────────────────────────────────────────────

export interface ExpenseListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ExpenseListResponse {
  items: Expense[];
  meta: ExpenseListMeta;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category: ExpenseCategory;
  /** Decimal string */
  total: string;
  count: number;
}

export interface ExpenseSummary {
  /** Total amount across all matching expenses (Decimal string) */
  totalAmount: string;
  count: number;
  byCategory: CategoryBreakdown[];
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  category?: ExpenseCategory;
  supplierId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  search?: string;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateExpenseDto {
  category: ExpenseCategory;
  /** Amount in absolute value — must be > 0 */
  amount: number;
  /** YYYY-MM-DD */
  expenseDate: string;
  description?: string;
  supplierId?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateExpenseDto extends Partial<CreateExpenseDto> {}

// ─── Constants ────────────────────────────────────────────────────────────────

export const EXPENSE_ACCENT = '#d97706';
export const EXPENSE_ACCENT_LIGHT = '#fffbeb';

/** Icon + accent color per category */
export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { icon: string; color: string }
> = {
  RENT:           { icon: 'business-outline',                  color: '#7c3aed' },
  SALARIES:       { icon: 'people-outline',                    color: '#2563eb' },
  UTILITIES:      { icon: 'flash-outline',                     color: '#0d9488' },
  SUPPLIES:       { icon: 'cube-outline',                      color: '#ea580c' },
  TRANSPORTATION: { icon: 'car-outline',                       color: '#16a34a' },
  MAINTENANCE:    { icon: 'construct-outline',                 color: '#ca8a04' },
  MARKETING:      { icon: 'megaphone-outline',                 color: '#db2777' },
  TAXES:          { icon: 'document-text-outline',             color: '#dc2626' },
  OTHER:          { icon: 'ellipsis-horizontal-circle-outline', color: '#64748b' },
};

/** Parse a Decimal string or number safely */
export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

/** Format date for API (YYYY-MM-DD) */
export function formatDateForApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Display-friendly date */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
