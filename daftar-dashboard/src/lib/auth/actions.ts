"use server";

import { revalidatePath } from "next/cache";
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
  type AuthSession,
  type LoginCredentials,
  type RegisterData,
} from "./server";
import { AUTH_ENDPOINTS } from "./constants";
import { extractBackendMessages } from "@/lib/errors/backend-error";
import type { StaffPermissionsMap } from "./permission-evaluator";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
}

interface ApiUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string | null;
  permissions?: StaffPermissionsMap | null;
}

interface ApiTenant {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
}

interface RawAuthBody {
  user: ApiUser;
  tokens: ApiTokens;
  tenant?: ApiTenant;
  company?: ApiTenant;
}

interface ProcessedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: StaffPermissionsMap | null;
}

interface ProcessedTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export type AuthActionResult = ActionResult<{
  user: ProcessedUser;
  tenant: ProcessedTenant;
}>;

const LOGIN_REQUEST_TIMEOUT_MS = 8000;
const LOGIN_RETRY_COUNT = 1;
const REGISTER_REQUEST_TIMEOUT_MS = 10000;
const REGISTER_RETRY_COUNT = 1;

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return Boolean(value && typeof value === "object" && "data" in (value as Record<string, unknown>));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkConnectivityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("network") ||
    message.includes("timed out") ||
    message.includes("aborted")
  );
}

function getLoginEndpoints(): string[] {
  return getEndpointVariants(String(AUTH_ENDPOINTS.login));
}

function getEndpointVariants(endpoint: string): string[] {
  const endpoints = [endpoint];

  if (endpoint.includes("127.0.0.1")) {
    endpoints.push(endpoint.replace("127.0.0.1", "localhost"));
  } else if (endpoint.includes("localhost")) {
    endpoints.push(endpoint.replace("localhost", "127.0.0.1"));
  }

  return [...new Set(endpoints)];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function performLoginRequest(credentials: LoginCredentials): Promise<Response> {
  const endpoints = getLoginEndpoints();
  let lastError: unknown;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt <= LOGIN_RETRY_COUNT; attempt += 1) {
      try {
        return await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          },
          LOGIN_REQUEST_TIMEOUT_MS
        );
      } catch (error) {
        lastError = error;

        if (!isNetworkConnectivityError(error)) {
          throw error;
        }

        if (attempt < LOGIN_RETRY_COUNT) {
          await sleep(300);
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Login request failed");
}

async function performRegisterRequest(payload: RegisterData): Promise<Response> {
  const endpoints = getEndpointVariants(String(AUTH_ENDPOINTS.register));
  let lastError: unknown;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt <= REGISTER_RETRY_COUNT; attempt += 1) {
      try {
        return await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          REGISTER_REQUEST_TIMEOUT_MS
        );
      } catch (error) {
        lastError = error;

        if (!isNetworkConnectivityError(error)) {
          throw error;
        }

        if (attempt < REGISTER_RETRY_COUNT) {
          await sleep(300);
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Register request failed");
}

function splitName(user: ApiUser): { firstName: string; lastName: string } {
  const value =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "";

  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeAuthPayload(
  raw: unknown
): { user: ProcessedUser; tenant: ProcessedTenant; session: AuthSession } | null {
  const body = isApiEnvelope<RawAuthBody>(raw) ? raw.data : (raw as RawAuthBody);

  if (!body?.user || !body?.tokens?.accessToken || !body?.tokens?.refreshToken) {
    return null;
  }

  const { firstName, lastName } = splitName(body.user);

  const tenantSource = body.tenant || body.company;
  const tenantId = tenantSource?.id || body.user.companyId || "platform";
  const tenantName = tenantSource?.name || (body.user.role === "SUPER_ADMIN" ? "Platform" : "Business");
  const tenantSlug = tenantSource?.slug || String(tenantId);

  const user: ProcessedUser = {
    id: body.user.id,
    email: body.user.email,
    firstName,
    lastName,
    role: body.user.role,
    permissions: body.user.permissions ?? null,
  };

  const tenant: ProcessedTenant = {
    id: tenantId,
    name: tenantName,
    slug: tenantSlug,
    logo: tenantSource?.logo,
  };

  const session: AuthSession = {
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
    expiresIn: body.tokens.expiresIn,
    refreshExpiresIn: body.tokens.refreshExpiresIn,
    user,
    tenant,
  };

  return { user, tenant, session };
}

interface ProfileResponse {
  id: string;
  fullName?: string;
  email: string;
  role: string;
  permissions?: StaffPermissionsMap | null;
}

async function fetchUserPermissions(accessToken: string): Promise<StaffPermissionsMap | null> {
  try {
    const response = await fetchWithTimeout(
      AUTH_ENDPOINTS.me,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
      6000,
    );

    if (!response.ok) {
      return null;
    }

    const raw = await response.json();
    const data = isApiEnvelope<ProfileResponse>(raw)
      ? raw.data
      : (raw as ProfileResponse);

    if (!data || typeof data !== "object") {
      return null;
    }

    return (data.permissions ?? null) as StaffPermissionsMap | null;
  } catch {
    return null;
  }
}

export async function loginAction(
  credentials: LoginCredentials
): Promise<AuthActionResult> {
  try {
    const response = await performLoginRequest(credentials);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const rawMessage = (errorData as { message?: unknown }).message;
      const normalizedMessage = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : typeof rawMessage === "string"
          ? rawMessage
          : "Invalid credentials";
      return {
        success: false,
        error: normalizedMessage,
      };
    }

    const raw = await response.json();
    const normalized = normalizeAuthPayload(raw);

    if (!normalized) {
      return {
        success: false,
        error: "Unexpected login response format",
      };
    }

    const permissions = await fetchUserPermissions(normalized.session.accessToken);
    if (permissions) {
      normalized.user.permissions = permissions;
      normalized.session.user.permissions = permissions;
    }

    await setAuthCookies(normalized.session);

    return {
      success: true,
      data: {
        user: normalized.user,
        tenant: normalized.tenant,
      },
    };
  } catch (error) {
    console.error("[Auth] Login error:", error);

    if (isNetworkConnectivityError(error)) {
      return {
        success: false,
        error:
          "Cannot connect to API server. Make sure backend is running on http://localhost:7000",
      };
    }

    return {
      success: false,
      error: "An error occurred during login",
    };
  }
}

export async function registerAction(
  data: RegisterData
): Promise<AuthActionResult> {
  try {
    const payload = {
      ...data,
      // UX rule: if user enters one phone on signup, use it for both owner and company.
      companyPhone: data.companyPhone ?? data.phone,
    };

    const response = await performRegisterRequest(payload);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const backendMessages = extractBackendMessages(errorData);
      const fallbackMessage = "Registration failed";
      const errorMessage =
        backendMessages.length > 0
          ? backendMessages.join("\n")
          : typeof (errorData as { message?: unknown }).message === "string"
            ? (errorData as { message: string }).message
            : fallbackMessage;

      return {
        success: false,
        error: errorMessage,
      };
    }

    const raw = await response.json();
    const normalized = normalizeAuthPayload(raw);

    if (!normalized) {
      return {
        success: false,
        error: "Unexpected registration response format",
      };
    }

    const permissions = await fetchUserPermissions(normalized.session.accessToken);
    if (permissions) {
      normalized.user.permissions = permissions;
      normalized.session.user.permissions = permissions;
    }

    await setAuthCookies(normalized.session);

    return {
      success: true,
      data: {
        user: normalized.user,
        tenant: normalized.tenant,
      },
    };
  } catch (error) {
    console.error("[Auth] Register error:", error);

    if (isNetworkConnectivityError(error)) {
      return {
        success: false,
        error:
          "Cannot connect to API server. Make sure backend is running on http://localhost:7000",
      };
    }

    return {
      success: false,
      error: "An error occurred during registration",
    };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      fetch(AUTH_ENDPOINTS.logout, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // We clear cookies locally regardless of API result.
      });
    }

    await clearAuthCookies();
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    await clearAuthCookies();
    return { success: true };
  }
}

export async function getCurrentUserAction(): Promise<
  ActionResult<{ user: ProcessedUser; tenant: ProcessedTenant } | null>
> {
  try {
    const { getUserData } = await import("./server");
    const [userData, accessToken] = await Promise.all([getUserData(), getAccessToken()]);

    if (!userData) {
      return {
        success: true,
        data: null,
      };
    }

    const refreshedPermissions =
      accessToken ? await fetchUserPermissions(accessToken) : null;

    return {
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          permissions: refreshedPermissions ?? userData.permissions ?? null,
        },
        tenant: userData.tenant,
      },
    };
  } catch (error) {
    console.error("[Auth] Get current user error:", error);
    return {
      success: false,
      error: "Failed to fetch user data",
    };
  }
}
