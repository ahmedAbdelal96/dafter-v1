// ─── Customers Feature — Types ────────────────────────────────────────────────
// All types match the backend contract exactly.
// Decimal fields from Prisma arrive as strings over JSON.

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  address: string | null;
  /** Prisma Decimal — serialized as string */
  openingBalance: string;
  /** Prisma Decimal — serialized as string. null = no limit */
  creditLimit: string | null;
  isActive: boolean;
  /** Optimistic locking — required in every PATCH */
  version: number;
  /** Current ledger balance — merged by the repo from Balance table */
  balance: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Shape returned by ListCustomersUseCase (note: `items`, not `data`) */
export interface CustomersListResponse {
  items: Customer[];
  meta: CustomersListMeta;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  address?: string;
  /** Opening balance (default 0) — only settable at creation */
  openingBalance?: number;
  creditLimit?: number;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  address?: string;
  creditLimit?: number | null;
  isActive?: boolean;
  /** REQUIRED — optimistic locking version check */
  version: number;
}

export type CustomerListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

// ─── Module constants ─────────────────────────────────────────────────────────

export const CUSTOMER_ACCENT = '#2563eb';
export const CUSTOMER_ACCENT_LIGHT = '#eff6ff';
export const CUSTOMER_ACCENT_DARK = '#1d4ed8';

/** Parse a Prisma Decimal field (string | number) safely */
export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}
