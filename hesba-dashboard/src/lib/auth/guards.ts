import "server-only";

import { redirect } from "next/navigation";
import { getDefaultRouteByRole, isKnownRole, type AppRole } from "@/config/route-access";
import { hasPermissionFromBackend, type UserRole } from "./permission-evaluator";
import { getUserData } from "./server";

type GuardUser = NonNullable<Awaited<ReturnType<typeof getUserData>>>;

function toLocalizedPath(locale: string, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

function getDefaultPathForRole(role: UserRole, locale: string): string {
  const appRole: AppRole = isKnownRole(role) ? role : "OWNER";
  return toLocalizedPath(locale, getDefaultRouteByRole(appRole));
}

export async function requireAuthenticatedUser(
  locale: string,
  callbackPath?: string
): Promise<GuardUser> {
  const user = await getUserData();
  if (!user) {
    const loginUrl = new URL(toLocalizedPath(locale, "/signin"), "http://localhost");
    if (callbackPath) {
      loginUrl.searchParams.set("callbackUrl", encodeURIComponent(callbackPath));
    }
    redirect(`${loginUrl.pathname}${loginUrl.search}`);
  }

  return user;
}

export async function requireRole(
  locale: string,
  roles: UserRole[],
  callbackPath?: string
): Promise<GuardUser> {
  const user = await requireAuthenticatedUser(locale, callbackPath);
  const role = user.role as UserRole;

  if (!roles.includes(role)) {
    redirect(getDefaultPathForRole(role, locale));
  }

  return user;
}

export async function requirePermission(
  locale: string,
  permission: string,
  callbackPath?: string
): Promise<GuardUser> {
  const user = await requireAuthenticatedUser(locale, callbackPath);
  const role = user.role as UserRole;

  if (!hasPermissionFromBackend(role, user.permissions ?? null, permission)) {
    redirect(getDefaultPathForRole(role, locale));
  }

  return user;
}
