// ─── Employees Feature — Types ────────────────────────────────────────────────
// All types match the backend contract exactly.
// Decimal fields from Prisma arrive as strings over JSON.

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  /** Free-text job title — optional */
  jobTitle: string | null;
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

export interface EmployeesListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Shape returned by ListEmployeesUseCase */
export interface EmployeesListResponse {
  items: Employee[];
  meta: EmployeesListMeta;
}

export interface CreateEmployeeDto {
  name: string;
  phone?: string;
  jobTitle?: string;
  /** Opening balance (default 0) — only settable at creation */
  openingBalance?: number;
}

export interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  jobTitle?: string;
  isActive?: boolean;
  /** REQUIRED — optimistic locking version check */
  version: number;
}

export type EmployeeListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

// ─── Module constants ─────────────────────────────────────────────────────────

export const EMPLOYEE_ACCENT = '#4f46e5';
export const EMPLOYEE_ACCENT_LIGHT = '#eef2ff';
export const EMPLOYEE_ACCENT_DARK = '#4338ca';

/** Parse a Prisma Decimal field (string | number) safely */
export function toFloat(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}
