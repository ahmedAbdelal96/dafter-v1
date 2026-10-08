export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export type UserRole = "OWNER" | "STAFF" | "SUPER_ADMIN";
export type CompanyUserRole = UserRole;
export type CompanyUserStatus = "ACTIVE" | "DISABLED";

export interface StaffPermissionsMap {
  manageUsers?: boolean;
  viewParties?: boolean;
  manageParties?: boolean;
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

export interface CompanyUser {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: CompanyUserRole;
  status: CompanyUserStatus;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    id?: string;
    userId?: string;
    permissions?: StaffPermissionsMap;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export interface CreateStaffUserRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  permissions?: StaffPermissionsMap;
}

export interface UpdateCompanyUserRequest {
  fullName?: string;
  phone?: string | null;
}

export interface UpdateStaffPermissionsRequest extends StaffPermissionsMap {}

export type CredentialsResetChannel = "email" | "whatsapp";

export interface ResetUserCredentialsResponse {
  userId: string;
  channel: CredentialsResetChannel;
  expiresAt: string;
  sessionsRevoked: boolean;
}

export interface UsersStats {
  total: number;
  active: number;
  disabled: number;
  staff: number;
  owners: number;
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: CompanyUserStatus;
}

export interface UsersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsersListResponse {
  items: CompanyUser[];
  meta: UsersListMeta;
}
