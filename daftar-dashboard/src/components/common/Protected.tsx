"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { usePermission, UserRole } from "@/hooks/usePermission";

interface ProtectedProps {
  children: ReactNode;
  permission?: string | string[];
  role?: UserRole | UserRole[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function Protected({
  children,
  permission,
  role,
  requireAll = false,
  fallback = null,
}: ProtectedProps) {
  const { hasAllPermissions, hasAnyPermission, hasRole } = usePermission();

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];

    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string | string[];
  role?: UserRole | UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  permission,
  role,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const { hasAnyPermission, hasRole } = usePermission();

  if (role && !hasRole(role)) {
    if (redirectTo) {
      return <RedirectOnMount to={redirectTo} />;
    }
    return <>{fallback || <UnauthorizedPage />}</>;
  }

  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAccess = hasAnyPermission(permissions);

    if (!hasAccess) {
      if (redirectTo) {
        return <RedirectOnMount to={redirectTo} />;
      }
      return <>{fallback || <UnauthorizedPage />}</>;
    }
  }

  return <>{children}</>;
}

function RedirectOnMount({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return null;
}

function UnauthorizedPage() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
            <svg
              className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          غير مصرح لك بالدخول
        </h2>

        <p className="mb-8 text-gray-600 dark:text-gray-400">
          ليس لديك صلاحية للوصول إلى هذه الصفحة. تواصل مع المسؤول إذا كنت تعتقد أنه يجب منحك صلاحية.
        </p>

        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          العودة للخلف
        </button>
      </div>
    </div>
  );
}
