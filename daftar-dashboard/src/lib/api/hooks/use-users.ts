import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../services/users";
import { usersKeys } from "./query-keys";
import { USERS_CACHE } from "./config";
import type {
  CreateStaffUserRequest,
  UpdateCompanyUserRequest,
  UpdateStaffPermissionsRequest,
  UsersFilters,
} from "../types";

export function useUsers(filters?: UsersFilters, enabled = true) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: () => usersApi.getAll(filters),
    staleTime: USERS_CACHE.list.staleTime,
    gcTime: USERS_CACHE.list.gcTime,
    enabled,
  });
}

export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    staleTime: USERS_CACHE.single.staleTime,
    gcTime: USERS_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useUsersStats(enabled = true) {
  return useQuery({
    queryKey: usersKeys.stats(),
    queryFn: () => usersApi.getStats(),
    staleTime: USERS_CACHE.stats.staleTime,
    gcTime: USERS_CACHE.stats.gcTime,
    enabled,
  });
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStaffUserRequest) => usersApi.createStaff(payload),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats() });
      queryClient.setQueryData(usersKeys.detail(user.id), user);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCompanyUserRequest }) => usersApi.update(id, payload),
    onSuccess: (user, { id }) => {
      queryClient.setQueryData(usersKeys.detail(id), user);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffPermissionsRequest }) =>
      usersApi.updatePermissions(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.disable(id),
    onSuccess: (user, id) => {
      queryClient.setQueryData(usersKeys.detail(id), user);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats() });
    },
  });
}

export function useEnableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.enable(id),
    onSuccess: (user, id) => {
      queryClient.setQueryData(usersKeys.detail(id), user);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.stats() });
    },
  });
}

export function useResetUserCredentials() {
  return useMutation({
    mutationFn: ({ id, channel }: { id: string; channel?: 'email' | 'whatsapp' }) =>
      usersApi.resetCredentials(id, { channel }),
  });
}
