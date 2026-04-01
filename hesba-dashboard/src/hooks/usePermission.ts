import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  hasPermissionFromBackend,
  hasRoleAccess,
  type StaffPermissionsMap,
  type UserRole,
} from "@/lib/auth/permission-evaluator";

export type { UserRole, StaffPermissionsMap };

export function usePermission() {
  const user = useAuthStore((state) => state.user);
  const userRole = (user?.role as UserRole | undefined) ?? undefined;
  const staffPermissions = user?.permissions ?? null;

  const hasPermission = useMemo(() => {
    return (permission: string): boolean =>
      hasPermissionFromBackend(userRole ?? null, staffPermissions, permission);
  }, [userRole, staffPermissions]);

  const hasAllPermissions = useMemo(() => {
    return (permissions: string[]): boolean =>
      permissions.every((permission) => hasPermission(permission));
  }, [hasPermission]);

  const hasAnyPermission = useMemo(() => {
    return (permissions: string[]): boolean =>
      permissions.some((permission) => hasPermission(permission));
  }, [hasPermission]);

  const hasRole = useMemo(() => {
    return (roles: UserRole | UserRole[]): boolean =>
      hasRoleAccess(userRole ?? null, roles);
  }, [userRole]);

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    userRole,
  };
}

export function useCanAccess(permission: string | string[]) {
  const { hasPermission, hasAnyPermission } = usePermission();

  return useMemo(() => {
    if (Array.isArray(permission)) {
      return hasAnyPermission(permission);
    }
    return hasPermission(permission);
  }, [permission, hasPermission, hasAnyPermission]);
}

export function checkPermission(
  userRole: UserRole | undefined,
  permission: string,
  staffPermissions?: StaffPermissionsMap | null,
): boolean {
  return hasPermissionFromBackend(userRole ?? null, staffPermissions, permission);
}
