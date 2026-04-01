import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { platformKeys, platformDashboardKeys } from "./query-keys";
import {
  platformSettingsApi,
  type CreateFeatureFlagRequest,
  type UpdateFeatureFlagRequest,
  type UpdatePlatformSettingsRequest,
} from "../services/platform-settings";

const PLATFORM_SETTINGS_QUERY_OPTIONS = {
  staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
  gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

function invalidatePlatformSettingsState(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: platformKeys.settings() });
  queryClient.invalidateQueries({ queryKey: platformKeys.featureFlags() });
  queryClient.invalidateQueries({ queryKey: platformDashboardKeys.all });
}

export function usePlatformSettings(enabled = true) {
  return useQuery({
    queryKey: platformKeys.settings(),
    queryFn: () => platformSettingsApi.getSettings(),
    enabled,
    ...PLATFORM_SETTINGS_QUERY_OPTIONS,
  });
}

export function usePlatformFeatureFlags(enabled = true) {
  return useQuery({
    queryKey: platformKeys.featureFlags(),
    queryFn: () => platformSettingsApi.getFeatureFlags(),
    enabled,
    ...PLATFORM_SETTINGS_QUERY_OPTIONS,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlatformSettingsRequest) =>
      platformSettingsApi.updateSettings(payload),
    onSuccess: () => {
      invalidatePlatformSettingsState(queryClient);
    },
  });
}

export function useCreatePlatformFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFeatureFlagRequest) =>
      platformSettingsApi.createFeatureFlag(payload),
    onSuccess: () => {
      invalidatePlatformSettingsState(queryClient);
    },
  });
}

export function useUpdatePlatformFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      payload,
    }: {
      name: string;
      payload: UpdateFeatureFlagRequest;
    }) => platformSettingsApi.updateFeatureFlag(name, payload),
    onSuccess: () => {
      invalidatePlatformSettingsState(queryClient);
    },
  });
}
