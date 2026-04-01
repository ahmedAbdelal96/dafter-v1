import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USERS_CACHE } from "./config";
import { platformKeys } from "./query-keys";
import {
  platformUsersApi,
  type PlatformCompanyScopeRequest,
  type PlatformCreateStaffUserRequest,
  type PlatformResetUserCredentialsRequest,
  type PlatformUpdateUserPermissionsRequest,
  type PlatformUpdateUserRequest,
  type PlatformUsersFilters,
} from "../services/platform-users";

export function usePlatformUsers(filters: PlatformUsersFilters, enabled = true) {
  return useQuery({
    queryKey: platformKeys.usersList(filters),
    queryFn: () => platformUsersApi.getAll(filters),
    staleTime: USERS_CACHE.list.staleTime,
    gcTime: USERS_CACHE.list.gcTime,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function usePlatformUser(id: string, companyId: string, enabled = true) {
  return useQuery({
    queryKey: platformKeys.user(id, companyId),
    queryFn: () => platformUsersApi.getById(id, companyId),
    staleTime: USERS_CACHE.single.staleTime,
    gcTime: USERS_CACHE.single.gcTime,
    refetchOnWindowFocus: false,
    enabled: Boolean(id) && Boolean(companyId) && enabled,
  });
}

export function usePlatformUsersStats(companyId: string, enabled = true) {
  return useQuery({
    queryKey: platformKeys.usersStats(companyId),
    queryFn: () => platformUsersApi.getStats(companyId),
    staleTime: USERS_CACHE.stats.staleTime,
    gcTime: USERS_CACHE.stats.gcTime,
    refetchOnWindowFocus: false,
    enabled: Boolean(companyId) && enabled,
  });
}

function invalidateCompanyUsers(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: platformKeys.users() });
  queryClient.invalidateQueries({ queryKey: platformKeys.usersStats(companyId) });
}

export function useCreatePlatformStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PlatformCreateStaffUserRequest) =>
      platformUsersApi.createStaff(payload),
    onSuccess: (user, payload) => {
      invalidateCompanyUsers(queryClient, payload.companyId);
      queryClient.setQueryData(platformKeys.user(user.id, payload.companyId), user);
    },
  });
}

export function useUpdatePlatformUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PlatformUpdateUserRequest }) =>
      platformUsersApi.update(id, payload),
    onSuccess: (user, { id, payload }) => {
      queryClient.setQueryData(platformKeys.user(id, payload.companyId), user);
      invalidateCompanyUsers(queryClient, payload.companyId);
    },
  });
}

export function useUpdatePlatformUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: PlatformUpdateUserPermissionsRequest;
    }) => platformUsersApi.updatePermissions(id, payload),
    onSuccess: (_, { id, payload }) => {
      queryClient.invalidateQueries({ queryKey: platformKeys.user(id, payload.companyId) });
      invalidateCompanyUsers(queryClient, payload.companyId);
    },
  });
}

export function useDisablePlatformUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: PlatformCompanyScopeRequest }) =>
      platformUsersApi.disable(id, scope),
    onSuccess: (user, { id, scope }) => {
      queryClient.setQueryData(platformKeys.user(id, scope.companyId), user);
      invalidateCompanyUsers(queryClient, scope.companyId);
    },
  });
}

export function useEnablePlatformUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: PlatformCompanyScopeRequest }) =>
      platformUsersApi.enable(id, scope),
    onSuccess: (user, { id, scope }) => {
      queryClient.setQueryData(platformKeys.user(id, scope.companyId), user);
      invalidateCompanyUsers(queryClient, scope.companyId);
    },
  });
}

export function useResetPlatformUserCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: PlatformResetUserCredentialsRequest;
    }) => platformUsersApi.resetCredentials(id, payload),
    onSuccess: (_, { id, payload }) => {
      queryClient.invalidateQueries({ queryKey: platformKeys.user(id, payload.companyId) });
      invalidateCompanyUsers(queryClient, payload.companyId);
    },
  });
}
