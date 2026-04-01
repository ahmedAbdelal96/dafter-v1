// ─── Invoices Feature — Types ─────────────────────────────────────────────────
// Mirrors backend Invoice + InvoiceItem Prisma models.
// All Decimal fields arrive as strings over HTTP.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type InvoicePaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export const ALL_STATUSES: InvoiceStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

// ─── Constants ────────────────────────────────────────────────────────────────

export const INVOICE_ACCENT = '#d97706'; // amber
export const INVOICE_ACCENT_LIGHT = '#fffbeb';

export const STATUS_CONFIG: Record<InvoiceStatus, { color: string; bg: string }> = {
  DRAFT:            { color: '#64748b', bg: '#f1f5f9' },
  PENDING_APPROVAL: { color: '#d97706', bg: '#fffbeb' },
  APPROVED:         { color: '#16a34a', bg: '#dcfce7' },
  REJECTED:         { color: '#dc2626', bg: '#fee2e2' },
  CANCELLED:        { color: '#94a3b8', bg: '#f8fafc' },
};

// ─── Customer Snapshot ────────────────────────────────────────────────────────

export interface CustomerSnapshot {
  /** Decimal string — negative = customer owes money */
  currentBalance: string;
  /** Decimal string — total overdue amount */
  overdueAmount: string;
  lastInvoiceDate: string | null;
  lastPaymentDate: string | null;
  openInvoicesCount: number;
  totalPurchases: string;
  hasOverdue: boolean;
  defaultPaymentType: string | null;
}

export interface FrequentProduct {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  /** Decimal string */
  unitPrice: string;
  isActive: boolean;
  useCount: number;
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  /** Prisma Decimal → string */
  quantity: string;
  /** Prisma Decimal → string */
  unitPrice: string;
  /** Prisma Decimal → string */
  totalPrice: string;
  productId: string | null;
}

export interface Invoice {
  id: string;
  companyId: string;
  /** Auto-generated, e.g. "INV-2026-0001" */
  invoiceNumber: string;
  partyId: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  /** Kept for backwards compat — same as partyId when partyType=CUSTOMER */
  customerId?: string;
  customer: { id: string; name: string; phone?: string | null };
  status: InvoiceStatus;
  /** Prisma Decimal → string */
  totalAmount: string;
  /** Prisma Decimal → string */
  paidAmount: string;
  invoicePaymentStatus: InvoicePaymentStatus;
  /** YYYY-MM-DD */
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  items: InvoiceItem[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/** List response — items may omit line-item details for bandwidth */
export type InvoiceListItem = Omit<Invoice, 'items'> & { items?: InvoiceItem[] };

/** Lightweight summary for duplicate modal */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  issueDate: string;
  status: InvoiceStatus;
  customer: { id: string; name: string };
}

// ─── Paginated response ───────────────────────────────────────────────────────

export interface InvoiceListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface InvoiceListResponse {
  items: InvoiceListItem[];
  meta: InvoiceListMeta;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  customerId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  search?: string;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateInvoiceItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
}

export interface CreateInvoiceDto {
  partyId: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  /** YYYY-MM-DD */
  dueDate?: string;
  notes?: string;
  items: CreateInvoiceItemDto[];
}

export interface RecordPaymentDto {
  amount: number;
  note?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safe Decimal string → number */
export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

/** Format Date → "YYYY-MM-DD" for API */
export function formatDateForApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO string → display date */
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
