export type UserRole = "OWNER" | "STAFF" | "SUPER_ADMIN";

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
  [key: string]: boolean | undefined;
}

const LEGACY_PERMISSION_TO_BACKEND_FLAG: Record<string, keyof StaffPermissionsMap> = {
  "customers:view": "viewParties",
  "customers:create": "manageParties",
  "customers:update": "manageParties",
  "customers:delete": "manageParties",

  "suppliers:view": "viewParties",
  "suppliers:create": "manageParties",
  "suppliers:update": "manageParties",
  "suppliers:delete": "manageParties",

  "employees:view": "viewParties",
  "employees:create": "manageParties",
  "employees:update": "manageParties",
  "employees:delete": "manageParties",

  "products:view": "viewParties",
  "products:create": "manageParties",
  "products:update": "manageParties",
  "products:delete": "manageParties",

  "invoices:view": "viewLedger",
  "invoices:create": "createInvoice",
  "invoices:delete": "manageLedger",

  "expenses:view": "viewLedger",
  "expenses:create": "manageLedger",
  "expenses:update": "manageLedger",
  "expenses:delete": "manageLedger",

  "deferredSales:view": "viewInstallments",
  "deferredSales:create": "manageInstallments",
  "deferredSales:update": "manageInstallments",

  "installments:view": "viewInstallments",
  "installments:create": "manageInstallments",
  "installments:update": "manageInstallments",

  "ledger:view": "viewLedger",
  "ledger:create": "manageLedger",
  "ledger:delete": "manageLedger",

  "reports:view": "viewReports",
  "reports:export": "viewReports",

  "users:view": "manageUsers",
  "users:create": "manageUsers",
  "users:update": "manageUsers",
  "users:disable": "manageUsers",
  "users:permissions": "manageUsers",

  "settings:view": "manageUsers",
  "settings:update": "manageUsers",
};

const STAFF_ALWAYS_ALLOWED_PERMISSIONS = new Set<string>([
  "notifications:view",
  "notifications:update",
]);

export function hasPermissionFromBackend(
  role: UserRole | null | undefined,
  staffPermissions: StaffPermissionsMap | null | undefined,
  permission: string,
): boolean {
  if (!role) return false;
  if (role === "OWNER" || role === "SUPER_ADMIN") return true;
  if (STAFF_ALWAYS_ALLOWED_PERMISSIONS.has(permission)) return true;

  const backendFlag = LEGACY_PERMISSION_TO_BACKEND_FLAG[permission];
  if (!backendFlag) {
    return Boolean(staffPermissions?.[permission]);
  }

  return staffPermissions?.[backendFlag] === true;
}

export function hasRoleAccess(
  role: UserRole | null | undefined,
  roles: UserRole | UserRole[],
): boolean {
  if (!role) return false;
  const normalized = Array.isArray(roles) ? roles : [roles];
  return normalized.includes(role);
}
