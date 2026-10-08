/**
 * Users Module — Type definitions
 *
 * OWNER manages STAFF users who are scoped to that company only.
 * Only OWNER can create/disable/update staff. STAFF with manageUsers
 * permission can only view the list.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'STAFF' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'DISABLED';

// ─── Permissions ──────────────────────────────────────────────────────────────

export interface StaffPermissions {
  manageUsers: boolean;
  viewParties: boolean;
  manageParties: boolean;
  viewLedger: boolean;
  manageLedger: boolean;
  viewReports: boolean;
}

export interface StaffPermissionRecord {
  userId: string;
  permissions: StaffPermissions;
}

export const DEFAULT_PERMISSIONS: StaffPermissions = {
  manageUsers: false,
  viewParties: false,
  manageParties: false,
  viewLedger: false,
  manageLedger: false,
  viewReports: false,
};

// Permission key labels for display
export const PERMISSION_KEYS = Object.keys(
  DEFAULT_PERMISSIONS,
) as (keyof StaffPermissions)[];

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  permissions: StaffPermissionRecord | null;
}

// ─── Paginated List ───────────────────────────────────────────────────────────

export interface UsersListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface UserStats {
  total: number;
  active: number;
  disabled: number;
  staff: number;
  owners: number;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateStaffDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  permissions?: Partial<StaffPermissions>;
}

export interface UpdateUserDto {
  fullName?: string;
  phone?: string;
}

export type UpdatePermissionsDto = Partial<StaffPermissions>;

// ─── Accent Color ─────────────────────────────────────────────────────────────

export const USERS_ACCENT = '#0284c7'; // Sky-600 — distinct from customers (blue-600)
