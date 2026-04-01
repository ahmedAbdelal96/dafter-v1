// ============================================
// Daftar - Auth Types
// ============================================

import { UserRole } from '@prisma/client';

/**
 * JWT Access Token Payload
 * Stored inside every signed JWT token
 */
export interface JwtPayload {
  /** User ID (UUID) */
  sub: string;

  /** User email */
  email: string;

  /** User role */
  role: UserRole;

  /** Company ID (null for SUPER_ADMIN) */
  companyId: string | null;

  /** Token issued at (epoch seconds) */
  iat?: number;

  /** Token expiration (epoch seconds) */
  exp?: number;
}

/**
 * Permission flags map for STAFF users.
 *
 * Design: stored as JSON in DB → adding new permissions never requires a migration.
 * To add a new permission:
 *   1. Add the key here (type safety)
 *   2. Add the field to StaffPermissionsDto (Swagger + validation)
 *   3. Use @RequirePermissions('newKey') on the route
 *   Done — no DB migration needed.
 *
 * OWNER and SUPER_ADMIN bypass all permission checks automatically (see PermissionsGuard).
 */
export interface StaffPermissionsMap {
  // ── Users ─────────────────────────────────────────────────
  manageUsers?: boolean;

  // ── Parties (customers / suppliers / employees) ───────────
  viewParties?: boolean; // read-only list + details
  manageParties?: boolean; // full CRUD

  // ── Ledger (financial transactions) ───────────────────────
  viewLedger?: boolean; // read-only view entries + balances
  manageLedger?: boolean; // create / edit / delete entries

  // ── Reports ───────────────────────────────────────────────
  viewReports?: boolean; // view + export reports

  // ── Invoices (P3-BE-2) ────────────────────────────────────
  createInvoice?: boolean;       // create DRAFT invoices
  editDraft?: boolean;           // edit/update DRAFT invoices
  approveInvoice?: boolean;      // approve invoices (financial effect)
  rejectInvoice?: boolean;       // reject pending invoices
  recordPayment?: boolean;       // record payments on invoices
  viewCustomerBalances?: boolean; // view customer snapshot / balances

  // Index signature — allows type-safe extension without breaking existing code
  [key: string]: boolean | undefined;
}

/**
 * Authenticated user object attached to request.user
 * Available via @CurrentUser() decorator
 *
 * Populated by JwtStrategy.validate() on every authenticated request.
 * Permissions are loaded from DB for STAFF — so permission changes
 * take effect immediately (no stale JWT issue).
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  /** Populated only for STAFF users. OWNER/SUPER_ADMIN = undefined (they bypass guard). */
  permissions?: StaffPermissionsMap;
}

/**
 * Auth tokens returned on login / refresh
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  tokens: AuthTokens;
}
