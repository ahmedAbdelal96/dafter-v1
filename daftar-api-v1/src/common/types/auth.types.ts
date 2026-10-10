// ============================================
// Daftar - Auth Types
// ============================================

import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  iat?: number;
  exp?: number;
}

/**
 * Permission flags map for STAFF users.
 *
 * The JSON shape is intentionally extensible so new permissions can be added
 * without changing the database schema.
 */
export interface StaffPermissionsMap {
  manageUsers?: boolean;
  viewParties?: boolean;
  manageParties?: boolean;
  viewPartners?: boolean;
  managePartners?: boolean;
  viewSalesInvoices?: boolean;
  createSalesInvoice?: boolean;
  editSalesInvoice?: boolean;
  postSalesInvoice?: boolean;
  viewSalesCreditNotes?: boolean;
  createSalesCreditNote?: boolean;
  editSalesCreditNote?: boolean;
  postSalesCreditNote?: boolean;
  viewAccountingSetup?: boolean;
  manageAccountingSetup?: boolean;
  viewOpeningBalances?: boolean;
  manageOpeningBalances?: boolean;
  viewLedger?: boolean;
  manageLedger?: boolean;
  viewReports?: boolean;
  createInvoice?: boolean;
  editDraft?: boolean;
  approveInvoice?: boolean;
  rejectInvoice?: boolean;
  recordPayment?: boolean;
  viewCustomerBalances?: boolean;
  viewInstallments?: boolean;
  manageInstallments?: boolean;
  'tax_setup.view'?: boolean;
  'tax_setup.manage_registration_profile'?: boolean;
  'tax_setup.create_rate'?: boolean;
  'tax_setup.edit_rate'?: boolean;
  'tax_setup.archive_rate'?: boolean;
  'tax_setup.manage_treatments'?: boolean;
  'tax_setup.manage_defaults'?: boolean;
  'tax_setup.manage_account_bindings'?: boolean;
  'tax_setup.manage_module_applicability'?: boolean;
  [key: string]: boolean | undefined;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  permissions?: StaffPermissionsMap;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  tokens: AuthTokens;
}
