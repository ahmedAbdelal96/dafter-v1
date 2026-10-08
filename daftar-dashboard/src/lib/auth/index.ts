/**
 * Auth Module Exports
 * تصدير جميع عناصر المصادقة
 */

// Constants
export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_DATA_COOKIE,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  DEFAULT_LOGIN_REDIRECT,
  LOGIN_PAGE,
  AUTH_ENDPOINTS,
} from "./constants";

// Context & Hook (Client-side)
export { AuthProvider, useAuth, withAuth } from "./context";
export type { AuthUser, AuthTenant } from "./context";

// Server Actions
export {
  loginAction,
  registerAction,
  logoutAction,
  getCurrentUserAction,
  type ActionResult,
} from "./actions";

// Server guards
export {
  requireAuthenticatedUser,
  requireRole,
  requirePermission,
} from "./guards";
