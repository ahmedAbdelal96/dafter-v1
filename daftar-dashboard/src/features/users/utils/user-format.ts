import type { CompanyUser, StaffPermissionsMap } from "@/lib/api/types";
import { DEFAULT_STAFF_PERMISSIONS } from "./user-schemas";

export function getUserDisplayName(user: CompanyUser): string {
  return user.fullName || user.email;
}

export function extractUserPermissions(user: CompanyUser): Required<StaffPermissionsMap> {
  const raw = user.permissions?.permissions;
  return {
    manageUsers: Boolean(raw?.manageUsers),
    viewParties: Boolean(raw?.viewParties),
    manageParties: Boolean(raw?.manageParties),
    viewLedger: Boolean(raw?.viewLedger),
    manageLedger: Boolean(raw?.manageLedger),
    viewReports: Boolean(raw?.viewReports),
  };
}

export function getDefaultPermissionsForRole(user: CompanyUser): Required<StaffPermissionsMap> {
  if (user.role !== "STAFF") return DEFAULT_STAFF_PERMISSIONS;
  return extractUserPermissions(user);
}

export function toStatusFilterValue(statusFilter: "all" | "active" | "disabled"):
  | "ACTIVE"
  | "DISABLED"
  | undefined {
  if (statusFilter === "active") return "ACTIVE";
  if (statusFilter === "disabled") return "DISABLED";
  return undefined;
}
