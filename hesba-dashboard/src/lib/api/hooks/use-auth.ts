/**
 * Auth Hooks
 * React Query hooks للمصادقة وإدارة الجلسات
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/auth";
import { authKeys } from "./query-keys";
import { AUTH_CACHE } from "./config";
import type {
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../types";

// ==================== Queries ====================

/**
 * جلب بيانات المستخدم الحالي
 * يُستخدم للتحقق من حالة تسجيل الدخول
 */
export function useCurrentUser(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authApi.getMe(),
    staleTime: AUTH_CACHE.user.staleTime,
    gcTime: AUTH_CACHE.user.gcTime,
    retry: false, // لا retry لأن 401 تعني user غير مسجل
    ...options,
  });
}

/**
 * جلب الجلسات النشطة
 */
export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions(),
    queryFn: () => authApi.getSessions(),
    staleTime: AUTH_CACHE.sessions.staleTime,
    gcTime: AUTH_CACHE.sessions.gcTime,
  });
}

/**
 * جلب سجل تسجيلات الدخول
 */
export function useLoginHistory() {
  return useQuery({
    queryKey: authKeys.loginHistory(),
    queryFn: () => authApi.getLoginHistory(),
    staleTime: AUTH_CACHE.loginHistory.staleTime,
    gcTime: AUTH_CACHE.loginHistory.gcTime,
  });
}

// ==================== Mutations ====================

/**
 * تسجيل الدخول
 * يقوم بـ invalidate user data بعد النجاح
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      // تحديث بيانات المستخدم في الـ cache مباشرة
      queryClient.setQueryData(authKeys.user(), data.user);
      // Invalidate لإعادة جلب أي بيانات قديمة
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

/**
 * تسجيل حساب جديد
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

/**
 * تسجيل الخروج
 * يحذف كل الـ cache عند تسجيل الخروج
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // حذف كل البيانات من الـ cache
      queryClient.clear();
    },
    onError: () => {
      // حتى لو فشل الـ logout من السيرفر، نحذف الـ cache
      queryClient.clear();
    },
  });
}

/**
 * تسجيل الخروج من جميع الأجهزة
 */
export function useLogoutAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      queryClient.clear();
    },
    onError: () => {
      queryClient.clear();
    },
  });
}

/**
 * تغيير كلمة المرور
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
  });
}

/**
 * نسيت كلمة المرور
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
  });
}

/**
 * إعادة تعيين كلمة المرور
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
  });
}

/**
 * إرسال إيميل التحقق
 */
export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: () => authApi.sendVerificationEmail(),
  });
}

/**
 * تحقق من الإيميل
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      // تحديث user data لأن emailVerified تغير
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

/**
 * تحديث بيانات الملف الشخصي (fullName, phone)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { fullName?: string; phone?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(authKeys.user(), updatedUser);
    },
  });
}

/**
 * إلغاء جلسة معينة
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
    },
  });
}
