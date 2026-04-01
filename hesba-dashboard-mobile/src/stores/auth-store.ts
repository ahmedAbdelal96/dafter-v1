/**
 * Auth Store — Dafter Mobile Dashboard
 *
 * Manages authentication state for dashboard users.
 * Persists tokens to expo-secure-store via tokenStore.
 *
 * Flow:
 *   1. StoreHydration calls initialize() on boot.
 *   2. initialize() loads tokens from SecureStore and validates them via /auth/me.
 *   3. login() / logout() update state + SecureStore.
 *   4. clearSession() is called by the HTTP client when token refresh fails.
 */
import { create } from "zustand";
import { useMemo } from "react";
import { authApi } from "@/lib/api/auth.api";
import { tokenStore, registerSessionExpiredHandler } from "@/lib/api/client";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/config";
import type { User, Tenant, LoginRequest } from "@/types";

// ─── State Shape ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  /** True once initialize() has completed (success or failure). */
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
  updateTenant: (tenant: Partial<Tenant>) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  /**
   * Called once at app boot by StoreHydration.
   * Loads tokens from SecureStore, then validates them with /auth/me.
   * If validation fails we clear the session gracefully.
   */
  initialize: async () => {
    try {
      // Populate tokenStore's in-memory cache from SecureStore
      await tokenStore.load();

      if (!tokenStore.isAuthenticated()) {
        return; // No stored session — show login screen
      }

      // Validate the stored access token by fetching current user + company
      const [user, companyRes] = await Promise.allSettled([
        authApi.getMe(),
        apiClient.get<{ data: Tenant }>(API_ENDPOINTS.companies.me),
      ]);

      if (user.status === 'rejected') throw user.reason;

      const tenant =
        companyRes.status === 'fulfilled'
          ? companyRes.value.data.data
          : null;

      set({ user: user.value, tenant, isAuthenticated: true });
    } catch {
      // Token is expired or invalid — clear everything silently
      await tokenStore.clearAll();
      set({ user: null, tenant: null, isAuthenticated: false });
    } finally {
      set({ isInitialized: true });

      // Register the session-expired callback with the HTTP client.
      // This is called when a token refresh fails, avoiding circular imports.
      registerSessionExpiredHandler(() => {
        get().clearSession();
      });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      // Fetch real company data right after login — login endpoint only
      // returns a minimal tenant stub (name: ''), so we fetch the full profile.
      let tenant = response.tenant;
      if (response.user.companyId) {
        try {
          const companyRes = await apiClient.get<{ data: Tenant }>(
            API_ENDPOINTS.companies.me,
          );
          tenant = companyRes.data.data;
        } catch {
          // Non-fatal — minimal tenant stub is sufficient to proceed
        }
      }
      set({
        user: response.user,
        tenant,
        isAuthenticated: true,
        error: null,
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل تسجيل الدخول";
      set({ error: message });
      throw err; // re-throw so the UI can react
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = tokenStore.getRefreshToken();
      await authApi.logout(refreshToken);
    } catch {
      // Ignore API errors — server-side session invalidation is best-effort.
      // We always clear the local session regardless of network outcome.
    } finally {
      // Clear tokens from SecureStore BEFORE updating Zustand state.
      // This ensures no window exists where isAuthenticated=false but tokens
      // are still on disk (which would allow re-authentication on next boot).
      await tokenStore.clearAll();
      set({
        user: null,
        tenant: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Called by the HTTP client when token refresh fails (session expired).
   * Does NOT call the API — just clears local state.
   */
  clearSession: () => {
    void tokenStore.clearAll();
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isInitialized: true,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  updateTenant: (partial) =>
    set((state) => ({
      tenant: state.tenant ? { ...state.tenant, ...partial } : null,
    })),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectUser = (s: AuthState) => s.user;
const selectTenant = (s: AuthState) => s.tenant;
const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
const selectIsInitialized = (s: AuthState) => s.isInitialized;
const selectIsLoading = (s: AuthState) => s.isLoading;
const selectError = (s: AuthState) => s.error;
const selectLogin = (s: AuthState) => s.login;
const selectLogout = (s: AuthState) => s.logout;
const selectClearError = (s: AuthState) => s.clearError;
const selectUpdateTenant = (s: AuthState) => s.updateTenant;

// ─── Primary Hook ─────────────────────────────────────────────────────────────

export function useAuth() {
  const user = useAuthStore(selectUser);
  const tenant = useAuthStore(selectTenant);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore(selectIsInitialized);
  const isLoading = useAuthStore(selectIsLoading);
  const error = useAuthStore(selectError);
  const login = useAuthStore(selectLogin);
  const logout = useAuthStore(selectLogout);
  const clearError = useAuthStore(selectClearError);
  const updateTenant = useAuthStore(selectUpdateTenant);

  return useMemo(
    () => ({
      user,
      tenant,
      isAuthenticated,
      isInitialized,
      isLoading,
      error,
      login,
      logout,
      clearError,
      updateTenant,
      /** Display name — falls back gracefully */
      displayName: user?.fullName ?? "",
      /** First letters of name for avatar fallback */
      initials: (user?.fullName ?? "").slice(0, 2).toUpperCase(),
    }),
    [
      user,
      tenant,
      isAuthenticated,
      isInitialized,
      isLoading,
      error,
      login,
      logout,
      clearError,
      updateTenant,
    ],
  );
}
