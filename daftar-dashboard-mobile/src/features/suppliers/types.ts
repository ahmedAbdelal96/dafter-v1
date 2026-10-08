// ─── Suppliers Feature — Types ────────────────────────────────────────────────
// All types match the backend contract exactly.
// Decimal fields from Prisma arrive as strings over JSON.

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  address: string | null;
  /** Prisma Decimal — serialized as string */
  openingBalance: string;
  isActive: boolean;
  /** Optimistic locking — required in every PATCH */
  version: number;
  /** Current ledger balance — merged by the repo from Balance table */
  balance: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Shape returned by ListSuppliersUseCase (note: `items`, not `data`) */
export interface SuppliersListResponse {
  items: Supplier[];
  meta: SuppliersListMeta;
}

export interface CreateSupplierDto {
  name: string;
  phone?: string;
  address?: string;
  /** Opening balance (default 0) — only settable at creation */
  openingBalance?: number;
}

export interface UpdateSupplierDto {
  name?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
  /** REQUIRED — optimistic locking version check */
  version: number;
}

export type SupplierListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

// ─── Module constants ─────────────────────────────────────────────────────────

export const SUPPLIER_ACCENT = '#7c3aed';
export const SUPPLIER_ACCENT_LIGHT = '#f5f3ff';
export const SUPPLIER_ACCENT_DARK = '#6d28d9';

/** Parse a Prisma Decimal field (string | number) safely */
export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}
