/**
 * HTTP Client for dafter Dashboard
 * 
 * Professional Axios client with:
 * - Automatic token management (cookies)
 * - Request/response interceptors
 * - Token refresh handling
 * - Error handling
 * - Request logging in development
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import Cookies from "js-cookie";
import { API_CONFIG, TOKEN_CONFIG } from "./config";
import { toAppError } from "./errors";

let refreshRequestPromise: Promise<string | null> | null = null;

function getBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const prefix = `${name}=`;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));

  if (!value) {
    return undefined;
  }

  return decodeURIComponent(value.slice(prefix.length));
}

function appendSearchParam(params: URLSearchParams, key: string, value: unknown): void {
  if (value == null || value === "") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendSearchParam(params, key, item);
    }
    return;
  }

  if (value instanceof Date) {
    params.append(key, value.toISOString());
    return;
  }

  if (typeof value === "object") {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendSearchParam(params, `${key}.${nestedKey}`, nestedValue);
    }
    return;
  }

  params.append(key, String(value));
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) {
    return false;
  }

  return [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/logout",
  ].some((authPath) => url.includes(authPath));
}

function isAuthFailureResponse(error: AxiosError): boolean {
  const status = error.response?.status;
  const message = (error.response?.data as { message?: string } | undefined)?.message;

  return status === 401 || (status === 403 && message === "\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648\u0644\u0627\u064b");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshSessionViaApiRoute(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!refreshRequestPromise) {
    refreshRequestPromise = (async () => {
      // Single-flight refresh to avoid refresh-token rotation races.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (response.ok) {
            const payload = (await response.json().catch(() => null)) as
              | { accessToken?: string | null }
              | null;

            return payload?.accessToken ?? null;
          }

          // 401 means refresh token is invalid/expired; no need to retry.
          if (response.status === 401) {
            return null;
          }
        } catch {
          // Network glitches: one short retry before forcing logout.
        }

        if (attempt === 0) {
          await sleep(250);
        }
      }

      return null;
    })().finally(() => {
      refreshRequestPromise = null;
    });
  }

  return refreshRequestPromise;
}

/**
 * Create Axios instance
 */
const httpClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
  headers: API_CONFIG.headers,
  paramsSerializer: {
    serialize: (params) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params ?? {})) {
        appendSearchParam(searchParams, key, value);
      }

      return searchParams.toString();
    },
  },
});

/**
 * Request Interceptor
 */
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // The active auth flow stores tokens via Next.js server actions in browser cookies.
    // Read from document.cookie first to stay compatible with cookies written outside js-cookie.
    const accessToken =
      getBrowserCookie(TOKEN_CONFIG.ACCESS_TOKEN_KEY) ??
      Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Keep tenant context aligned with the authenticated workspace when available.
    const userDataCookie = getBrowserCookie("dafter_user_data");
    if (userDataCookie) {
      try {
        const userData = JSON.parse(userDataCookie) as {
          tenant?: { id?: string };
        };

        if (userData.tenant?.id) {
          config.headers["X-Tenant-ID"] = userData.tenant.id;
        }
      } catch {
        // Ignore malformed UI cookie; auth header remains the source of truth.
      }
    }

    // Use a CORS-safe language header instead of custom x-lang.
    // Custom headers require explicit CORS allowlist on backend and caused preflight failures.
    const language = getBrowserCookie("preferred_language") || Cookies.get("preferred_language") || "ar";
    config.headers["Accept-Language"] = language;

    // Log request in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `ðŸš€ [API] ${config.method?.toUpperCase()} ${config.url}`,
        config.params || config.data || ""
      );
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("âŒ [Request Error]", error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 */
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `âœ… [API] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.status
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _networkRetryCount?: number;
    };

    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error(
        `âŒ [API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
        {
          status: error.response?.status,
          message:
            (error.response?.data as { message?: string } | undefined)?.message ||
            error.message,
        }
      );
    }

    // Handle transient backend restarts in development.
    // When API restarts, browser may throw ERR_NETWORK/ECONNREFUSED briefly.
    const isNetworkError = !error.response;
    const method = originalRequest?.method?.toUpperCase();
    const canRetryNetwork = isNetworkError && method === "GET";
    const networkRetryCount = originalRequest._networkRetryCount ?? 0;

    if (canRetryNetwork && networkRetryCount < 2) {
      originalRequest._networkRetryCount = networkRetryCount + 1;
      const delayMs = 400 * (networkRetryCount + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return httpClient(originalRequest);
    }

    // Handle expired or missing auth session before forcing logout.
    if (
      isAuthFailureResponse(error) &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest?.url)
    ) {
      originalRequest._retry = true;

      try {
        const refreshedAccessToken = await refreshSessionViaApiRoute();
        if (!refreshedAccessToken) {
          handleLogout();
          return Promise.reject(toAppError(error));
        }

        tokenManager.setTokens(refreshedAccessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        handleLogout();
        return Promise.reject(toAppError(refreshError));
      }
    }

    return Promise.reject(toAppError(error));
  }
);

/**
 * Logout Handler
 */
function handleLogout(): void {
  tokenManager.clearAll();

  // Redirect to login page
  if (typeof window !== "undefined") {
    // Get current locale from URL
    const locale = window.location.pathname.split("/")[1] || "ar";
    window.location.href = `/${locale}/signin`;
  }
}

/**
 * Token Manager
 */
export const tokenManager = {
  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken?: string): void {
    if (accessToken) {
      Cookies.set(TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken, {
        expires: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    // SECURITY: refresh token must stay httpOnly and be managed server-side only.
    // Never persist refresh tokens via client JS cookies.
    void refreshToken;
  },

  /**
   * Get access token
   */
  getAccessToken(): string | undefined {
    return Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): string | undefined {
    return Cookies.get(TOKEN_CONFIG.REFRESH_TOKEN_KEY);
  },

  /**
   * Set tenant context
   */
  setTenantId(tenantId: string): void {
    Cookies.set(TOKEN_CONFIG.TENANT_ID_KEY, tenantId, {
      expires: 365,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  },

  /**
   * Get tenant ID
   */
  getTenantId(): string | undefined {
    return Cookies.get(TOKEN_CONFIG.TENANT_ID_KEY);
  },

  /**
   * Set user data in localStorage
   */
  setUser(user: any): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_CONFIG.USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Get user data
   */
  getUser<T = any>(): T | null {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem(TOKEN_CONFIG.USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
  },

  /**
   * Clear all auth data
   */
  clearAll(): void {
    Cookies.remove(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    Cookies.remove(TOKEN_CONFIG.REFRESH_TOKEN_KEY);
    Cookies.remove(TOKEN_CONFIG.TENANT_ID_KEY);

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_CONFIG.USER_KEY);
    }
  },

  /**
   * Logout
   */
  logout(): void {
    handleLogout();
  },
};

export default httpClient;

