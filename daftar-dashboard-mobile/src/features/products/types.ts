// ─── Products Feature — Types ─────────────────────────────────────────────────
// Matches dafter-api-v1/src/modules/products exactly.
// unitPrice is Prisma Decimal → arrives as string over HTTP.

export const PRODUCT_ACCENT = '#0d9488'; // teal-600
export const PRODUCT_ACCENT_LIGHT = '#f0fdfa'; // teal-50

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  unit: string | null;
  /** Prisma Decimal → string over HTTP */
  unitPrice: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy: {
    id: string;
    fullName: string | null;
  };
}

// ─── Paginated list shape ─────────────────────────────────────────────────────

export interface ProductsListResponse {
  items: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

// ─── Mutation DTOs ────────────────────────────────────────────────────────────

export interface CreateProductDto {
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit?: string;
  unitPrice: number;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  sku?: string | null;
  category?: string;
  unit?: string;
  unitPrice?: number;
  isActive?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

export function formatPrice(value: string | number): string {
  return toFloat(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
