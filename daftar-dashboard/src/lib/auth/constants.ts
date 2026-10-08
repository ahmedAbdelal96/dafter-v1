export const ACCESS_TOKEN_COOKIE = "dafter_access_token";
export const REFRESH_TOKEN_COOKIE = "dafter_refresh_token";
export const USER_DATA_COOKIE = "dafter_user_data";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
export const USER_DATA_MAX_AGE = REFRESH_TOKEN_MAX_AGE;

export const PROTECTED_ROUTES = [
  "/dashboard",
  "/customers",
  "/suppliers",
  "/employees",
  "/products",
  "/invoices",
  "/expenses",
  "/deferred-sales",
  "/installments",
  "/ledger",
  "/reports",
  "/users",
  "/notifications",
  "/settings",
  "/super-admin",
  "/superadmin",
];

export const PUBLIC_ROUTES = [
  "/signin",
  "/signup",
  "/reset-password",
  "/forgot-password",
  "/verify-email",
];

export const AUTH_ROUTES = ["/signin", "/signup"];
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
export const LOGIN_PAGE = "/signin";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api/v1";

export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  refresh: `${API_BASE_URL}/auth/refresh`,
  logout: `${API_BASE_URL}/auth/logout`,
  me: `${API_BASE_URL}/auth/me`,
} as const;

export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const PUBLIC_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
