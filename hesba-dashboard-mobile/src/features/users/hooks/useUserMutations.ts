import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '@/lib/api/config';
import { usersApi } from '../api/users.api';
import type { CreateStaffDto, UpdateUserDto, UpdatePermissionsDto } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  return data?.message ?? fallback;
}

// ─── Create Staff ─────────────────────────────────────────────────────────────

export function useCreateStaff() {
  const qc = useQueryClient();
  const { t } = useTranslation('users');

  return useMutation({
    mutationFn: (dto: CreateStaffDto) => usersApi.createStaff(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS_STATS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENTS });
    },
    onError: (error: unknown) => {
      // Surface email-exists and quota errors to the caller for inline display
      void error; // caller handles via mutation.error
    },
  });
}

// ─── Update User (fullName / phone) ──────────────────────────────────────────

export function useUpdateUser(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateUserDto) => usersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
  });
}

// ─── Update Permissions ───────────────────────────────────────────────────────

export function useUpdatePermissions(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdatePermissionsDto) => usersApi.updatePermissions(userId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(userId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
  });
}

// ─── Disable / Enable ─────────────────────────────────────────────────────────

export function useDisableUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.disable(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS_STATS });
    },
  });
}

export function useEnableUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.enable(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS_STATS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENTS });
    },
  });
}

// ─── Reset Staff Credentials (trigger OTP reset) ──────────────────────────────

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({
      id,
      channel,
    }: {
      id: string;
      channel?: 'email' | 'whatsapp';
    }) => usersApi.resetCredentials(id, { channel }),
  });
}
