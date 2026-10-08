/**
 * Auth API — matches AuthController routes exactly.
 * POST /auth/login, /auth/logout, /auth/refresh, GET /auth/me, etc.
 *
 * All API responses are wrapped in { success, data, message } by ApiResponseDto.
 * We unwrap response.data.data to get the actual payload.
 */
import apiClient, { tokenStore } from './client';
import { API_ENDPOINTS } from './config';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
} from '@/types';

// Generic envelope that wraps every backend response
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// Actual shape returned inside the envelope for POST /auth/login
interface BackendLoginData {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    companyId: string | null;
  };
  tokens: { accessToken: string; refreshToken: string };
}

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiEnvelope<BackendLoginData>>(
      API_ENDPOINTS.auth.login,
      data,
    );
    const { tokens, user } = response.data.data;
    await tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
    if (user.companyId) await tokenStore.setTenantId(user.companyId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as LoginResponse["user"]["role"],
        companyId: user.companyId ?? null,
        status: "ACTIVE",
        createdAt: "",
        updatedAt: "",
      },
      /**
       * The login endpoint returns user + tokens but NOT full company data.
       * We set a minimal tenant object here; the auth store's initialize()
       * should call a /companies/me endpoint (Phase 2) to hydrate the rest.
       */
      tenant: user.companyId
        ? {
            id: user.companyId,
            name: '',
            email: '',
            phone: '',
            currency: 'EGP',
            subscriptionPlan: 'FREE',
            subscriptionStatus: 'TRIAL',
            isActive: true,
            createdAt: '',
            updatedAt: '',
          }
        : null,
    };
  },

  async logout(refreshToken?: string | null): Promise<void> {
    try {
      if (refreshToken) {
        await apiClient.post(API_ENDPOINTS.auth.logout, { refreshToken });
      }
    } finally {
      await tokenStore.clearAll();
    }
  },

  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<ApiEnvelope<RefreshTokenResponse>>(
      API_ENDPOINTS.auth.refresh,
      { refreshToken },
    );
    const data = response.data.data;
    await tokenStore.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<ApiEnvelope<User>>(
      API_ENDPOINTS.auth.me,
    );
    return response.data.data;
  },

  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
      API_ENDPOINTS.auth.changePassword,
      data,
    );
    return response.data.data;
  },

  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
      API_ENDPOINTS.auth.forgotPassword,
      data,
    );
    return response.data.data;
  },

  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
      API_ENDPOINTS.auth.resetPassword,
      data,
    );
    return response.data.data;
  },
};
