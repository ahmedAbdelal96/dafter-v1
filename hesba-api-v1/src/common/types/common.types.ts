// ============================================
// Daftar - Common Types
// ============================================

/**
 * Standardized API response wrapper
 * All endpoints return this shape
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

/**
 * Pagination metadata included when listing
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Common pagination query params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Base entity shape (common fields in all models)
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant-scoped entity (has companyId)
 */
export interface TenantEntity extends BaseEntity {
  companyId: string;
}

/**
 * Result of a soft-delete / disable operation
 */
export interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * Dashboard metric card shape
 */
export interface MetricCard {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Request context passed through middleware/guards
 */
export interface RequestContext {
  companyId?: string;
  userId?: string;
  lang?: string;
  ip?: string;
  userAgent?: string;
}
