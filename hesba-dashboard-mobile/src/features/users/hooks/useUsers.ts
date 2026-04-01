import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_CONFIG, shouldRetry } from '@/lib/api/config';
import { usersApi } from '../api/users.api';
import type { UsersQuery } from '../types';

export function useUsers(params?: UsersQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.USERS, params],
    queryFn: () => usersApi.list(params),
    staleTime: QUERY_CONFIG.staleTime,
    gcTime: QUERY_CONFIG.gcTime,
    retry: shouldRetry,
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.USER(id ?? ''),
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
    staleTime: QUERY_CONFIG.staleTime,
    gcTime: QUERY_CONFIG.gcTime,
    retry: shouldRetry,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: QUERY_KEYS.USERS_STATS,
    queryFn: usersApi.stats,
    staleTime: QUERY_CONFIG.staleTime,
    gcTime: QUERY_CONFIG.gcTime,
    retry: shouldRetry,
  });
}
