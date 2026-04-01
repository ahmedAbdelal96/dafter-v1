/**
 * Server-side Auth Utilities
 * أدوات المصادقة على السيرفر
 *
 * هذا الملف يحتوي على الـ utilities للتعامل مع الـ cookies
 * والـ tokens بشكل آمن على السيرفر فقط
 *
 * ⚠️ هذا الملف يجب أن يستخدم فقط على السيرفر (Server Components, Server Actions, Middleware)
 */

import { createHash } from "crypto";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_DATA_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  USER_DATA_MAX_AGE,
  SECURE_COOKIE_OPTIONS,
  PUBLIC_COOKIE_OPTIONS,
  AUTH_ENDPOINTS,
} from "./constants";
import type { StaffPermissionsMap } from "./permission-evaluator";

const refreshInFlight = new Map<string, Promise<boolean>>();

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  permissions?: StaffPermissionsMap | null;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface AuthSession {
  user: AuthUser;
  tenant: AuthTenant;
  accessToken: string;
  refreshToken: string;
  expiresIn?: string; // e.g., '1d', '15m'
  refreshExpiresIn?: string; // e.g., '7d', '30d'
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  companyName: string;
  fullName: string;
  email: string;
  phone?: string;
  companyPhone?: string;
  password: string;
}

// ============================================
// Cookie Management
// ============================================

/**
 * حفظ الـ tokens في HTTP-Only cookies
 * هذه الطريقة أكثر أماناً من localStorage لأن:
 * 1. لا يمكن الوصول للـ token من JavaScript (حماية من XSS)
 * 2. يتم إرسالها تلقائياً مع كل request
 * 3. يمكن تحديد SameSite للحماية من CSRF
 */
export async function setAuthCookies(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();

  // Convert expiry strings to seconds (e.g., '1d' -> 86400, '15m' -> 900)
  const parseExpiry = (expiry?: string): number => {
    if (!expiry) return ACCESS_TOKEN_MAX_AGE; // fallback
    
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60; // days
      case 'h': return value * 60 * 60; // hours
      case 'm': return value * 60; // minutes
      case 's': return value; // seconds
      default: return ACCESS_TOKEN_MAX_AGE; // fallback
    }
  };

  const accessMaxAge = parseExpiry(session.expiresIn);
  const refreshMaxAge = parseExpiry(session.refreshExpiresIn);

  // حفظ Access Token (⚠️ NOT HTTP-Only - قابل للقراءة من JS لإرساله مع axios)
  // ملاحظة: هذا trade-off للسماح بـ cross-domain requests
  cookieStore.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    ...PUBLIC_COOKIE_OPTIONS, // NOT httpOnly - يمكن قراءته من JS
    maxAge: accessMaxAge,
  });

  // حفظ Refresh Token (HTTP-Only - لا يمكن قراءته من JS - أكثر أماناً)
  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...SECURE_COOKIE_OPTIONS, // httpOnly: true
    maxAge: refreshMaxAge,
  });

  // حفظ بيانات المستخدم (يمكن قراءتها من JS للـ UI)
  // ⚠️ لا نحفظ معلومات حساسة هنا
  const publicUserData = {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    role: session.user.role,
    avatar: session.user.avatar,
    permissions: session.user.permissions ?? null,
    tenant: {
      id: session.tenant.id,
      name: session.tenant.name,
      slug: session.tenant.slug,
      logo: session.tenant.logo,
    },
  };

  cookieStore.set(USER_DATA_COOKIE, JSON.stringify(publicUserData), {
    ...PUBLIC_COOKIE_OPTIONS,
    maxAge: refreshMaxAge, // Use refresh token expiry for user data
  });

  // حفظ الـ role في cookie منفصل للـ middleware (public - يمكن قراءته)
  cookieStore.set("dafter_user_role", session.user.role, {
    ...PUBLIC_COOKIE_OPTIONS,
    maxAge: accessMaxAge,
  });
}

/**
 * الحصول على Access Token من الـ cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

/**
 * الحصول على Refresh Token من الـ cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
}

/**
 * الحصول على بيانات المستخدم من الـ cookies
 */
export async function getUserData(): Promise<
  (AuthUser & { tenant: AuthTenant }) | null
> {
  const cookieStore = await cookies();
  const userData = cookieStore.get(USER_DATA_COOKIE)?.value;

  if (!userData) return null;

  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

/**
 * حذف جميع الـ auth cookies (عند تسجيل الخروج)
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(USER_DATA_COOKIE);
  cookieStore.delete("dafter_user_role"); // حذف الـ role cookie
}

/**
 * التحقق من وجود session صالحة
 */
export async function hasValidSession(): Promise<boolean> {
  const accessToken = await getAccessToken();
  return !!accessToken;
}

// ============================================
// Token Refresh
// ============================================

/**
 * تجديد الـ Access Token باستخدام الـ Refresh Token
 * يتم استدعاؤها تلقائياً عند انتهاء صلاحية الـ Access Token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  const refreshKey = createHash("sha256").update(refreshToken).digest("hex");
  const activeRefresh = refreshInFlight.get(refreshKey);
  if (activeRefresh) {
    return activeRefresh;
  }

  const refreshPromise = (async () => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.refresh, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearAuthCookies();
        return false;
      }

      const raw = await response.json();
      const cookieStore = await cookies();

      const tokens: {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: string;
        refreshExpiresIn?: string;
      } = raw?.data?.tokens ?? raw?.tokens ?? raw ?? {};

      if (!tokens.accessToken) {
        console.error(
          "[Auth] Refresh response missing accessToken. Raw:",
          JSON.stringify(raw),
        );
        return false;
      }

      const parseExpiry = (expiry?: string): number => {
        if (!expiry) return ACCESS_TOKEN_MAX_AGE;

        const unit = expiry.slice(-1);
        const value = parseInt(expiry.slice(0, -1));

        switch (unit) {
          case "d":
            return value * 24 * 60 * 60;
          case "h":
            return value * 60 * 60;
          case "m":
            return value * 60;
          case "s":
            return value;
          default:
            return ACCESS_TOKEN_MAX_AGE;
        }
      };

      const accessMaxAge = parseExpiry(tokens.expiresIn);

      cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
        ...PUBLIC_COOKIE_OPTIONS,
        maxAge: accessMaxAge,
      });

      if (tokens.refreshToken) {
        const refreshMaxAge = parseExpiry(tokens.refreshExpiresIn);
        cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
          ...SECURE_COOKIE_OPTIONS,
          maxAge: refreshMaxAge,
        });
      }

      return true;
    } catch (error) {
      console.error("[Auth] Error refreshing token:", error);
      return false;
    } finally {
      refreshInFlight.delete(refreshKey);
    }
  })();

  refreshInFlight.set(refreshKey, refreshPromise);
  return refreshPromise;
}

// ============================================
// Session Validation
// ============================================

/**
 * الحصول على الـ session الحالية والتحقق من صلاحيتها
 * يستخدم في Server Components و Server Actions
 */
export async function getSession(): Promise<{
  user: AuthUser & { tenant: AuthTenant };
  accessToken: string;
} | null> {
  const accessToken = await getAccessToken();
  const userData = await getUserData();

  if (!accessToken || !userData) {
    return null;
  }

  return {
    user: userData,
    accessToken,
  };
}

/**
 * التحقق من الـ session وإرجاع البيانات أو throw error
 * يستخدم في protected Server Actions
 */
export async function requireSession(): Promise<{
  user: AuthUser & { tenant: AuthTenant };
  accessToken: string;
}> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: No valid session");
  }

  return session;
}
