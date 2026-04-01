/**
 * Auth Context & Provider
 * Ø³ÙŠØ§Ù‚ Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø© Ù„Ù„Ù€ Client Components
 *
 * Ù‡Ø°Ø§ Ø§Ù„Ù€ Context ÙŠÙˆÙØ±:
 * - Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø­Ø§Ù„ÙŠ
 * - functions Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„/Ø§Ù„Ø®Ø±ÙˆØ¬
 * - loading state
 *
 * âš ï¸ Ø§Ù„Ù€ tokens Ù„Ø§ ØªÙ…Ø± Ø¹Ø¨Ø± Ø§Ù„Ù€ client - ÙƒÙ„ Ø´ÙŠØ¡ ÙŠØªÙ… Ø¹Ø¨Ø± Server Actions
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  loginAction,
  registerAction,
  logoutAction,
  getCurrentUserAction,
  type ActionResult,
} from "./actions";
import { DEFAULT_LOGIN_REDIRECT, LOGIN_PAGE } from "./constants";
import type { StaffPermissionsMap, UserRole } from "./permission-evaluator";
import { useAuthStore } from "@/stores/auth-store";

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  permissions?: StaffPermissionsMap | null;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

interface AuthContextValue {
  // State
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (
    email: string,
    password: string
  ) => Promise<ActionResult<{ user: AuthUser; tenant: AuthTenant }>>;
  register: (data: {
    companyName: string;
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<ActionResult<{ user: AuthUser; tenant: AuthTenant }>>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface AuthProviderProps {
  children: ReactNode;
  /**
   * Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø£ÙˆÙ„ÙŠØ© (Ù…Ù† Server Component)
   * Ù„ØªØ¬Ù†Ø¨ flash of unauthenticated content
   */
  initialUser?: AuthUser | null;
  initialTenant?: AuthTenant | null;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialTenant = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [tenant, setTenant] = useState<AuthTenant | null>(initialTenant);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const setStoreUser = useAuthStore((state) => state.setUser);
  const setStoreTenant = useAuthStore((state) => state.setTenant);
  const setStoreError = useAuthStore((state) => state.setError);

  const normalizeRole = (role: string): UserRole => {
    if (role === "OWNER" || role === "STAFF" || role === "SUPER_ADMIN") {
      return role;
    }
    return "STAFF";
  };

  const normalizeUser = (value: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    permissions?: StaffPermissionsMap | null;
  }): AuthUser => ({
    ...value,
    role: normalizeRole(value.role),
  });

  // ============================================
  // Load User on Mount (if not provided initially)
  // ============================================

  useEffect(() => {
    if (initialUser) {
      setIsLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const result = await getCurrentUserAction();

        if (result.success && result.data) {
          setUser(normalizeUser(result.data.user));
          setTenant(result.data.tenant);
        }
      } catch (error) {
        console.error("[Auth] Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [initialUser]);

  // Keep Zustand auth store aligned with Context state.
  // This avoids permission drift where some components read Context
  // while others read persisted store data.
  useEffect(() => {
    setStoreUser(user);
    setStoreTenant(tenant);
  }, [setStoreTenant, setStoreUser, tenant, user]);

  // ============================================
  // Login
  // ============================================

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<ActionResult<{ user: AuthUser; tenant: AuthTenant }>> => {
      setIsLoading(true);

      try {
        const result = await loginAction({ email, password });

        if (result.success && result.data) {
          setUser(normalizeUser(result.data.user));
          setTenant(result.data.tenant);

          // Get callback URL or redirect to dashboard
          const searchParams = new URLSearchParams(window.location.search);
          const callbackUrl = searchParams.get("callbackUrl");
          const redirectUrl = callbackUrl
            ? decodeURIComponent(callbackUrl)
            : `/${locale}${DEFAULT_LOGIN_REDIRECT}`;

          router.push(redirectUrl);
          router.refresh(); // Refresh server components
        }

        return result as ActionResult<{ user: AuthUser; tenant: AuthTenant }>;
      } finally {
        setIsLoading(false);
        setStoreError(null);
      }
    },
    [router, locale, setStoreError]
  );

  // ============================================
  // Register
  // ============================================

  const register = useCallback(
    async (data: {
      companyName: string;
      fullName: string;
      email: string;
      phone?: string;
      password: string;
    }): Promise<ActionResult<{ user: AuthUser; tenant: AuthTenant }>> => {
      setIsLoading(true);

      try {
        const result = await registerAction(data);

        if (result.success && result.data) {
          setUser(normalizeUser(result.data.user));
          setTenant(result.data.tenant);

          // Redirect to dashboard after registration
          router.push(`/${locale}${DEFAULT_LOGIN_REDIRECT}`);
          router.refresh();
        }

        return result as ActionResult<{ user: AuthUser; tenant: AuthTenant }>;
      } finally {
        setIsLoading(false);
        setStoreError(null);
      }
    },
    [router, locale, setStoreError]
  );

  // ============================================
  // Logout
  // ============================================

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      await logoutAction();

      setUser(null);
      setTenant(null);

      // Redirect to login page
      router.push(`/${locale}${LOGIN_PAGE}`);
      router.refresh();
    } finally {
      setIsLoading(false);
      setStoreError(null);
    }
  }, [router, locale, setStoreError]);

  // ============================================
  // Refresh User
  // ============================================

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const result = await getCurrentUserAction();

      if (result.success && result.data) {
        setUser(normalizeUser(result.data.user));
        setTenant(result.data.tenant);
      } else {
        setUser(null);
        setTenant(null);
      }
    } catch (error) {
      console.error("[Auth] Error refreshing user:", error);
    }
  }, []);

  // ============================================
  // Context Value
  // ============================================

  const value: AuthContextValue = {
    user,
    tenant,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Hook
// ============================================

/**
 * Hook Ù„Ù„ÙˆØµÙˆÙ„ Ù„Ù€ Auth Context
 * ÙŠØ¬Ø¨ Ø§Ø³ØªØ®Ø¯Ø§Ù…Ù‡ Ø¯Ø§Ø®Ù„ AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// ============================================
// Higher Order Component for Protected Pages
// ============================================

/**
 * HOC Ù„Ø­Ù…Ø§ÙŠØ© Ø§Ù„ØµÙØ­Ø§Øª Ø¹Ù„Ù‰ Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ù€ Client
 * âš ï¸ Ù‡Ø°Ø§ ÙŠÙˆÙØ± Ø·Ø¨Ù‚Ø© Ø¥Ø¶Ø§ÙÙŠØ© ÙÙˆÙ‚ Ø§Ù„Ù€ Middleware
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const locale = useLocale();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push(`/${locale}${LOGIN_PAGE}`);
      }
    }, [isAuthenticated, isLoading, router, locale]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

