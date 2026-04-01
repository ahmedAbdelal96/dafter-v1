/**
 * Auth Store (Zustand)
 * Ø¥Ø¯Ø§Ø±Ø© Ø­Ø§Ù„Ø© Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø© Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Zustand
 *
 * âš ï¸ Ù…Ù„Ø§Ø­Ø¸Ø© Ø£Ù…Ù†ÙŠØ©:
 * - Ø§Ù„Ù€ tokens Ù…Ø­ÙÙˆØ¸Ø© ÙÙŠ HTTP-Only cookies (Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ÙˆØµÙˆÙ„ Ù„Ù‡Ø§ Ù…Ù† JS)
 * - Ù‡Ø°Ø§ Ø§Ù„Ù€ store ÙŠØ­ÙØ¸ ÙÙ‚Ø· Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ø§Ù…Ø© Ù„Ù„Ù€ UI
 * - ÙƒÙ„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø­Ø³Ø§Ø³Ø© ØªØªÙ… Ø¹Ø¨Ø± Server Actions
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  loginAction,
  registerAction,
  logoutAction,
  getCurrentUserAction,
  type ActionResult,
} from "@/lib/auth/actions";
import type { StaffPermissionsMap } from "@/lib/auth/permission-evaluator";

// ============================================
// Types
// ============================================

export type UserRole = "OWNER" | "STAFF" | "SUPER_ADMIN";

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

interface AuthState {
  // State
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
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
  setUser: (user: AuthUser | null) => void;
  setTenant: (tenant: AuthTenant | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================
// Initial State
// ============================================

const initialState: AuthState = {
  user: null,
  tenant: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// ============================================
// Store
// ============================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      // ============================================
      // Login
      // ============================================
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const result = await loginAction({ email, password });

          if (result.success && result.data) {
            set({
              user: result.data.user as AuthUser,
              tenant: result.data.tenant as AuthTenant,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              error: result.error || "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„",
              isLoading: false,
            });
          }

          return result as ActionResult<{ user: AuthUser; tenant: AuthTenant }>;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // Register
      // ============================================
      register: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const result = await registerAction(data);

          if (result.success && result.data) {
            set({
              user: result.data.user as AuthUser,
              tenant: result.data.tenant as AuthTenant,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              error: result.error || "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ³Ø¬ÙŠÙ„",
              isLoading: false,
            });
          }

          return result as ActionResult<{ user: AuthUser; tenant: AuthTenant }>;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // Logout
      // ============================================
      logout: async () => {
        set({ isLoading: true });

        try {
          await logoutAction();
        } finally {
          set({
            user: null,
            tenant: null,
            isLoading: false,
            error: null,
          });
        }
      },

      // ============================================
      // Refresh User
      // ============================================
      refreshUser: async () => {
        set({ isLoading: true });

        try {
          const result = await getCurrentUserAction();

          if (result.success && result.data) {
            set({
              user: result.data.user as AuthUser,
              tenant: result.data.tenant as AuthTenant,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({
              user: null,
              tenant: null,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch {
          set({
            user: null,
            tenant: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      // ============================================
      // Setters
      // ============================================
      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: "dafter-auth",
      storage: createJSONStorage(() => sessionStorage),
      // ÙÙ‚Ø· Ù†Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ø§Ù…Ø© (Ø¨Ø¯ÙˆÙ† tokens)
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isInitialized: state.isInitialized,
      }),
      skipHydration: true, // Ù…Ù‡Ù… Ø¬Ø¯Ø§Ù‹ Ù„ØªØ¬Ù†Ø¨ hydration mismatch
    }
  )
);

// ============================================
// Selectors (Ù„Ù„Ù€ Performance - stable references)
// ============================================

export const selectUser = (state: AuthStore) => state.user;
export const selectTenant = (state: AuthStore) => state.tenant;
export const selectIsAuthenticated = (state: AuthStore) => !!state.user;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectIsInitialized = (state: AuthStore) => state.isInitialized;
export const selectError = (state: AuthStore) => state.error;
export const selectLogin = (state: AuthStore) => state.login;
export const selectRegister = (state: AuthStore) => state.register;
export const selectLogout = (state: AuthStore) => state.logout;
export const selectRefreshUser = (state: AuthStore) => state.refreshUser;
export const selectSetError = (state: AuthStore) => state.setError;

// ============================================
// Helper Hooks (SSR-safe)
// ============================================

/**
 * Hook Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø­Ø§Ù„Ø© Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø© ÙÙ‚Ø· (Ø¨Ø¯ÙˆÙ† actions)
 * ÙŠØ³ØªØ®Ø¯Ù… Ù„Ù„Ù€ components Ø§Ù„Ù„ÙŠ Ù…Ø­ØªØ§Ø¬Ø© ØªÙ‚Ø±Ø£ Ø§Ù„Ø­Ø§Ù„Ø© ÙÙ‚Ø·
 */
export function useAuthState() {
  const user = useAuthStore(selectUser);
  const tenant = useAuthStore(selectTenant);
  const isLoading = useAuthStore(selectIsLoading);
  const isInitialized = useAuthStore(selectIsInitialized);
  const error = useAuthStore(selectError);

  return {
    user,
    tenant,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    error,
  };
}

/**
 * Hook Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ù€ actions ÙÙ‚Ø·
 * ÙŠØ³ØªØ®Ø¯Ù… ÙÙŠ Ø§Ù„Ù€ forms ÙˆØ§Ù„Ù€ buttons
 */
export function useAuthActions() {
  const login = useAuthStore(selectLogin);
  const register = useAuthStore(selectRegister);
  const logout = useAuthStore(selectLogout);
  const refreshUser = useAuthStore(selectRefreshUser);
  const setError = useAuthStore(selectSetError);

  return {
    login,
    register,
    logout,
    refreshUser,
    setError,
  };
}

