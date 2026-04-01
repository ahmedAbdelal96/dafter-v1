export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function normalizePagination(params?: PaginationParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const rawPage = Number(params?.page ?? DEFAULT_PAGE);
  const rawLimit = Number(params?.limit ?? DEFAULT_LIMIT);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const safeTotal = Math.max(0, total);
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));

  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

