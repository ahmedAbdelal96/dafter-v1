export type AppRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "STAFF";

export type RouteArea = "public" | "auth" | "tenant" | "superadmin" | "unknown";

export const AUTH_ROUTES = ["/signin", "/signup"] as const;

export const PUBLIC_ROUTES = [
  ...AUTH_ROUTES,
  "/reset-password",
  "/forgot-password",
  "/verify-email",
] as const;

export const SUPERADMIN_CANONICAL_PREFIX = "/super-admin";
export const SUPERADMIN_LEGACY_PREFIX = "/superadmin";
export const SUPERADMIN_PLATFORM_USERS_CANONICAL = "/super-admin/platform-users";
export const SUPERADMIN_PLATFORM_USERS_LEGACY = "/super-admin/users";
export const SUPERADMIN_PREFIXES = [
  SUPERADMIN_CANONICAL_PREFIX,
  SUPERADMIN_LEGACY_PREFIX,
] as const;

export const TENANT_ROUTE_PREFIXES = [
  "/dashboard",
  "/customers",
  "/suppliers",
  "/employees",
  "/products",
  "/invoices",
  "/expenses",
  "/deferred-sales",
  "/installments",
  "/ledger",
  "/users",
  "/notifications",
  "/reports",
  "/settings",
] as const;

export function isKnownRole(role: string | undefined | null): role is AppRole {
  return (
    role === "SUPER_ADMIN" ||
    role === "OWNER" ||
    role === "STAFF"
  );
}

export function normalizeToCanonicalPath(pathWithoutLocale: string): string {
  if (pathWithoutLocale === SUPERADMIN_LEGACY_PREFIX) {
    return SUPERADMIN_CANONICAL_PREFIX;
  }

  if (pathWithoutLocale.startsWith(`${SUPERADMIN_LEGACY_PREFIX}/`)) {
    const normalized = pathWithoutLocale.replace(
      SUPERADMIN_LEGACY_PREFIX,
      SUPERADMIN_CANONICAL_PREFIX
    );
    if (normalized === SUPERADMIN_PLATFORM_USERS_LEGACY) {
      return SUPERADMIN_PLATFORM_USERS_CANONICAL;
    }
    return normalized;
  }

  if (pathWithoutLocale === SUPERADMIN_PLATFORM_USERS_LEGACY) {
    return SUPERADMIN_PLATFORM_USERS_CANONICAL;
  }

  return pathWithoutLocale;
}

export function classifyRouteArea(pathWithoutLocale: string): RouteArea {
  if (matchesAny(pathWithoutLocale, AUTH_ROUTES)) {
    return "auth";
  }

  if (matchesAny(pathWithoutLocale, PUBLIC_ROUTES)) {
    return "public";
  }

  if (matchesAny(pathWithoutLocale, SUPERADMIN_PREFIXES)) {
    return "superadmin";
  }

  if (matchesAny(pathWithoutLocale, TENANT_ROUTE_PREFIXES)) {
    return "tenant";
  }

  return "unknown";
}

export function getDefaultRouteByRole(role: AppRole): string {
  if (role === "SUPER_ADMIN") {
    return `${SUPERADMIN_CANONICAL_PREFIX}/dashboard`;
  }

  return "/dashboard";
}

export function isTenantRole(role: AppRole): boolean {
  return role !== "SUPER_ADMIN";
}

function matchesAny(pathWithoutLocale: string, candidates: readonly string[]): boolean {
  return candidates.some(
    (candidate) =>
      pathWithoutLocale === candidate ||
      pathWithoutLocale.startsWith(`${candidate}/`)
  );
}
