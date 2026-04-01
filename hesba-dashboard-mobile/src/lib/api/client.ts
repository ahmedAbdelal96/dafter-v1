/**
 * Zayna Mobile - HTTP Client
 *
 * Professional Axios instance for the mobile dashboard.
 * Key differences from the web dashboard version:
 *   - Tokens stored in expo-secure-store (encrypted) instead of cookies/localStorage
 *   - Token refresh via in-memory queue (prevents race conditions)
 *   - No window.location redirects — uses auth store to trigger navigation
 *
 * Architecture:
 *   apiClient   → shared Axios instance (all authenticated requests)
 *   tokenStore  → SecureStore-backed token manager (read/write/clear tokens)
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { TOKEN_KEYS } from "./config";
import { logger } from "@/lib/logger";
import type { RefreshTokenResponse } from "@/types";

// ─── Environment ──────────────────────────────────────────────────────────────

/**
 * Resolve the backend base URL:
 *
 * 1. PRODUCTION: use EXPO_PUBLIC_API_URL baked into app.json extra.apiUrl
 * 2. DEVELOPMENT on physical device:
 *    `localhost` on the phone = the phone itself, NOT the dev machine.
 *    Metro exposes the dev machine IP via Constants.expoConfig.hostUri
 *    (e.g. "192.168.100.10:8081"). We reuse that IP with the backend port.
 * 3. DEVELOPMENT fallback (emulator/simulator):
 *    Android emulator maps 10.0.2.2 → host machine's localhost.
 *    iOS simulator maps localhost correctly.
 */
function resolveApiBaseUrl(): string {
  // Explicit override always wins (set in app.json → extra.apiUrl)
  const explicit = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (explicit) return explicit;

  if (__DEV__) {
    // hostUri = "192.168.100.10:8081" (Metro's LAN address)
    // manifest?.debuggerHost is the legacy field, kept as fallback
    // `any` casts needed — hostUri/debuggerHost are runtime fields not in TS types
    const cfg = Constants.expoConfig as unknown as { hostUri?: string };
    const mft = Constants as unknown as {
      manifest?: { debuggerHost?: string };
    };
    const hostUri: string | undefined =
      cfg?.hostUri ?? mft?.manifest?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(":")[0]; // "192.168.100.10"
      return `http://${host}:7000/api/v1`;
    }
  }

  return "http://localhost:7000/api/v1";
}

const API_BASE_URL: string = resolveApiBaseUrl();

const isWeb = Platform.OS === "web";
const hasLocalStorage =
  typeof globalThis !== "undefined" && "localStorage" in globalThis;

function webGetItem(key: string): string | null {
  if (!hasLocalStorage) return null;
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSetItem(key: string, value: string): void {
  if (!hasLocalStorage) return;
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // ignore storage quota/privacy errors
  }
}

function webDeleteItem(key: string): void {
  if (!hasLocalStorage) return;
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    // ignore storage quota/privacy errors
  }
}

// ─── Token Manager ────────────────────────────────────────────────────────────

/**
 * Thin wrapper around SecureStore for token persistence.
 *
 * SecureStore is synchronous on native but async overall — we keep a
 * small in-memory cache (`_cache`) for synchronous reads inside interceptors.
 * The cache is populated eagerly during StoreHydration and stays in sync.
 */
export const tokenStore = {
  _cache: {
    accessToken: null as string | null,
    refreshToken: null as string | null,
    tenantId: null as string | null,
  },

  async load(): Promise<void> {
    const [access, refresh, tenant] = isWeb
      ? [
          webGetItem(TOKEN_KEYS.ACCESS_TOKEN),
          webGetItem(TOKEN_KEYS.REFRESH_TOKEN),
          webGetItem(TOKEN_KEYS.TENANT_ID),
        ]
      : await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
          SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
          SecureStore.getItemAsync(TOKEN_KEYS.TENANT_ID),
        ]);
    this._cache.accessToken = access;
    this._cache.refreshToken = refresh;
    this._cache.tenantId = tenant;
  },

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    this._cache.accessToken = accessToken;
    if (isWeb) {
      webSetItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    }
    if (refreshToken) {
      this._cache.refreshToken = refreshToken;
      if (isWeb) {
        webSetItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      }
    }
  },

  async setTenantId(tenantId: string): Promise<void> {
    this._cache.tenantId = tenantId;
    if (isWeb) {
      webSetItem(TOKEN_KEYS.TENANT_ID, tenantId);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEYS.TENANT_ID, tenantId);
    }
  },

  async clearAll(): Promise<void> {
    this._cache = { accessToken: null, refreshToken: null, tenantId: null };
    if (isWeb) {
      webDeleteItem(TOKEN_KEYS.ACCESS_TOKEN);
      webDeleteItem(TOKEN_KEYS.REFRESH_TOKEN);
      webDeleteItem(TOKEN_KEYS.TENANT_ID);
      webDeleteItem(TOKEN_KEYS.USER);
      webDeleteItem(TOKEN_KEYS.TENANT);
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(TOKEN_KEYS.TENANT_ID),
      SecureStore.deleteItemAsync(TOKEN_KEYS.USER),
      SecureStore.deleteItemAsync(TOKEN_KEYS.TENANT),
    ]);
  },

  getAccessToken(): string | null {
    return this._cache.accessToken;
  },
  getRefreshToken(): string | null {
    return this._cache.refreshToken;
  },
  isAuthenticated(): boolean {
    return !!this._cache.accessToken;
  },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  paramsSerializer: {
    // Serialize arrays as `serviceIds=a&serviceIds=b` instead of
    // Axios' default `serviceIds[]=a&serviceIds[]=b`, because the NestJS
    // ValidationPipe rejects bracketed keys when DTOs whitelist query params.
    indexes: null,
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────

// Extend config type to carry request start time for duration calculation
type TimedConfig = InternalAxiosRequestConfig & { _startMs?: number };

/** Mask sensitive fields so they never appear in plain text in log files */
function maskSensitive(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const SENSITIVE = new Set([
    "password",
    "currentPassword",
    "newPassword",
    "refreshToken",
    "accessToken",
  ]);
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE.has(k) ? "***" : v,
    ]),
  );
}

/** Truncate large payloads so logs stay readable (max ~1 KB per field) */
function truncate(val: unknown, maxLen = 1000): unknown {
  const s = typeof val === "string" ? val : JSON.stringify(val);
  if (!s || s.length <= maxLen) return val;
  return s.slice(0, maxLen) + `… [+${s.length - maxLen} chars]`;
}

apiClient.interceptors.request.use(
  (config: TimedConfig) => {
    // Attach Bearer token from in-memory cache (fast — no async needed)
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Attach tenant context header
    const tenantId = tokenStore._cache.tenantId;
    if (tenantId) {
      config.headers["x-company-id"] = tenantId;
    }

    // Stamp start time so the response interceptor can calculate duration
    config._startMs = Date.now();

    // ── Log outgoing request ─────────────────────────────────────────────────
    if (__DEV__) {
      const logData: Record<string, unknown> = {};
      if (config.params) logData.params = config.params;
      if (config.data)
        logData.body = maskSensitive(
          typeof config.data === "string"
            ? JSON.parse(config.data)
            : config.data,
        );
      logger.debug(
        "REQ",
        `→ ${(config.method ?? "GET").toUpperCase()} ${config.url}`,
        Object.keys(logData).length ? logData : undefined,
      );
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor + Token Refresh ─────────────────────────────────────

/**
 * Tracks if a refresh is already in-flight.
 * All 401 responses while a refresh is pending queue their retries here
 * to avoid flooding the refresh endpoint with duplicate requests.
 */
let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

/**
 * Registered by the auth store after initialization.
 * Called when a token refresh fails — triggers logout navigation
 * without creating a circular import between client ↔ auth-store.
 */
let onSessionExpired: (() => void) | null = null;

/** Call this from the auth store to register the session-expired handler. */
export function registerSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as TimedConfig;
    const ms = config._startMs ? Date.now() - config._startMs : 0;

    logger.api(config.method ?? "GET", config.url ?? "", response.status, ms);

    // ── Log full response body in dev ────────────────────────────────────────
    if (__DEV__) {
      logger.debug(
        "RES",
        `← ${response.status} ${(config.method ?? "GET").toUpperCase()} ${config.url} (${ms}ms)`,
        { data: truncate(response.data) },
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as TimedConfig & { _retry?: boolean };
    const ms = original?._startMs ? Date.now() - original._startMs : 0;
    const status = error.response?.status ?? 0;

    // Only attempt refresh on 401 and if we haven't retried this request yet
    if (status !== 401 || original._retry) {
      logger.api(
        original?.method ?? "GET",
        original?.url ?? "",
        status,
        ms,
        true,
      );

      // ── Log full error details in dev ──────────────────────────────────────
      if (__DEV__) {
        logger.error(
          "RES",
          `← ${status} ${(original?.method ?? "GET").toUpperCase()} ${original?.url ?? ""} (${ms}ms)`,
          {
            errorData: truncate(error.response?.data),
            errorMessage: error.message,
            code: error.code,
          },
        );
      }

      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is already in-flight — queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        // Mark as retried so a 401 on THIS retry doesn't trigger another
        // refresh cycle — with token rotation, reusing a revoked token
        // would trigger revokeAllUserTokens on the backend (full logout).
        original._retry = true;
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = tokenStore.getRefreshToken();

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error);
      // Fire the registered logout callback (set by the auth store after init)
      onSessionExpired?.();
      return Promise.reject(error);
    }

    try {
      // Call refresh using a plain axios call (not apiClient) to avoid loops.
      // Backend wraps ALL responses in ApiResponseDto:
      //   { success, message, data: { tokens: { accessToken, refreshToken } } }
      // We must unwrap both layers to reach the actual token strings.
      const { data: raw } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );

      // Support both possible nesting shapes defensively
      const tokens: RefreshTokenResponse =
        raw?.data?.tokens ?? raw?.tokens ?? raw?.data ?? raw ?? {};

      if (!tokens.accessToken) {
        throw new Error(`Refresh response missing accessToken. Raw: ${JSON.stringify(raw)}`);
      }

      await tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
      apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
      original.headers.Authorization = `Bearer ${tokens.accessToken}`;

      processQueue(null, tokens.accessToken);
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError);
      await tokenStore.clearAll();
      onSessionExpired?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
