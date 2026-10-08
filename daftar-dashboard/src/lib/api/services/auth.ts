/**
 * Auth API Service
 * خدمة المصادقة - متوافق مع AuthController في Backend
 * @see /api/v1/auth
 */

import httpClient, { tokenManager } from "../http-client";
import { API_ENDPOINTS } from "../config";
import { extractData } from "../response";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  Session,
  LoginHistory,
  ApiResponse,
} from "../types";

export const authApi = {
  /**
   * تسجيل حساب جديد (مالك صالون جديد)
   * POST /auth/register
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse | ApiResponse<LoginResponse>>(
      API_ENDPOINTS.auth.register,
      data
    );

    // Auto login after registration
    const normalized = extractData(response.data);
    const { accessToken, refreshToken, user, tenant } = normalized;
    tokenManager.setTokens(accessToken, refreshToken);
    tokenManager.setUser(user);
    if (tenant?.id) {
      tokenManager.setTenantId(tenant.id);
    }

    return normalized;
  },

  /**
   * تسجيل الدخول
   * POST /auth/login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse | ApiResponse<LoginResponse>>(
      API_ENDPOINTS.auth.login,
      data
    );

    // Store tokens and user data
    const normalized = extractData(response.data);
    const { accessToken, refreshToken, user, tenant } = normalized;
    tokenManager.setTokens(accessToken, refreshToken);
    tokenManager.setUser(user);
    if (tenant?.id) {
      tokenManager.setTenantId(tenant.id);
    }

    return normalized;
  },

  /**
   * تجديد الـ Token
   * POST /auth/refresh
   */
  async refresh(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await httpClient.post<
      RefreshTokenResponse | ApiResponse<RefreshTokenResponse>
    >(
      API_ENDPOINTS.auth.refresh,
      data
    );

    const normalized = extractData(response.data);
    const { accessToken, refreshToken } = normalized;
    tokenManager.setTokens(accessToken, refreshToken);

    return normalized;
  },

  /**
   * تسجيل الخروج
   * POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      // Use Next.js API route so server can revoke refresh token stored in httpOnly cookie.
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      tokenManager.clearAll();
    }
  },

  /**
   * تسجيل الخروج من جميع الأجهزة
   * POST /auth/logout-all
   */
  async logoutAll(): Promise<void> {
    try {
      await httpClient.post(API_ENDPOINTS.auth.logoutAll);
    } finally {
      tokenManager.clearAll();
    }
  },

  /**
   * نسيت كلمة المرور
   * POST /auth/forgot-password
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await httpClient.post<
      { message: string } | ApiResponse<{ message: string }>
    >(
      API_ENDPOINTS.auth.forgotPassword,
      data
    );
    return extractData(response.data);
  },

  /**
   * إعادة تعيين كلمة المرور
   * POST /auth/reset-password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await httpClient.post<
      { message: string } | ApiResponse<{ message: string }>
    >(
      API_ENDPOINTS.auth.resetPassword,
      data
    );
    return extractData(response.data);
  },

  /**
   * جلب بيانات المستخدم الحالي
   * GET /auth/me
   */
  async getMe(): Promise<User> {
    const response = await httpClient.get<User | ApiResponse<User>>(
      API_ENDPOINTS.auth.me
    );
    const normalized = extractData(response.data);
    tokenManager.setUser(normalized);
    return normalized;
  },

  /**
   * تغيير كلمة المرور
   * POST /auth/change-password
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await httpClient.post<
      { message: string } | ApiResponse<{ message: string }>
    >(
      API_ENDPOINTS.auth.changePassword,
      data
    );
    return extractData(response.data);
  },

  /**
   * إرسال إيميل التحقق
   * POST /auth/send-verification-email
   */
  async sendVerificationEmail(): Promise<{ message: string }> {
    const response = await httpClient.post<
      { message: string } | ApiResponse<{ message: string }>
    >(
      API_ENDPOINTS.auth.sendVerificationEmail
    );
    return extractData(response.data);
  },

  /**
   * تحقق من الإيميل
   * POST /auth/verify-email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await httpClient.post<
      { message: string } | ApiResponse<{ message: string }>
    >(
      API_ENDPOINTS.auth.verifyEmail,
      { token }
    );
    return extractData(response.data);
  },

  /**
   * جلب الجلسات النشطة
   * GET /auth/sessions
   */
  async getSessions(): Promise<Session[]> {
    const response = await httpClient.get<Session[] | ApiResponse<Session[]>>(
      API_ENDPOINTS.auth.sessions
    );
    return extractData(response.data);
  },

  /**
   * إلغاء جلسة معينة
   * DELETE /auth/sessions/:sessionId
   */
  async revokeSession(sessionId: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.auth.revokeSession(sessionId));
  },

  /**
   * تحديث بيانات الملف الشخصي
   * PATCH /auth/me
   */
  async updateProfile(data: { fullName?: string; phone?: string }): Promise<User> {
    const response = await httpClient.patch<User | ApiResponse<User>>(
      API_ENDPOINTS.auth.me,
      data
    );
    const normalized = extractData(response.data);
    tokenManager.setUser(normalized);
    return normalized;
  },

  /**
   * سجل تسجيلات الدخول
   * GET /auth/login-history
   */
  async getLoginHistory(): Promise<LoginHistory[]> {
    const response = await httpClient.get<
      LoginHistory[] | ApiResponse<LoginHistory[]>
    >(
      API_ENDPOINTS.auth.loginHistory
    );
    return extractData(response.data);
  },
};
