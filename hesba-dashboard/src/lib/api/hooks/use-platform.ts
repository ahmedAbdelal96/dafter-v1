import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { platformKeys, platformDashboardKeys } from "./query-keys";
import {
  platformApi,
  type ActivatePlatformSubscriptionRequest,
  type ChangePlatformSubscriptionPlanRequest,
  type CreatePlatformPlanRequest,
  type CreatePlatformCompanyRequest,
  type ArchivePlatformCompanyRequest,
  type DeletePlatformCompanyRequest,
  type ExtendPlatformSubscriptionRequest,
  type PlatformCompaniesFilters,
  type UpdatePlatformCompanyRequest,
  type UpdatePlatformPlanRequest,
  type SuspendPlatformSubscriptionRequest,
} from "../services/platform";

const PLATFORM_QUERY_OPTIONS = {
  staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
  gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function usePlatformCompanies(filters: PlatformCompaniesFilters, enabled = true) {
  return useQuery({
    queryKey: platformKeys.companiesList(filters),
    queryFn: () => platformApi.listCompanies(filters),
    enabled,
    ...PLATFORM_QUERY_OPTIONS,
  });
}

export function usePlatformCompany(id: string, enabled = true) {
  return useQuery({
    queryKey: platformKeys.company(id),
    queryFn: () => platformApi.getCompany(id),
    enabled: Boolean(id) && enabled,
    ...PLATFORM_QUERY_OPTIONS,
  });
}

export function usePlatformCompanyMetrics(id: string, enabled = true) {
  return useQuery({
    queryKey: platformKeys.companyMetrics(id),
    queryFn: () => platformApi.getCompanyMetrics(id),
    enabled: Boolean(id) && enabled,
    ...PLATFORM_QUERY_OPTIONS,
  });
}

export function usePlatformPlans(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: platformKeys.plans(includeInactive),
    queryFn: () => platformApi.listPlans(includeInactive),
    enabled,
    ...PLATFORM_QUERY_OPTIONS,
  });
}

export function usePlatformCapabilities(enabled = true) {
  return useQuery({
    queryKey: platformKeys.capabilities(),
    queryFn: () => platformApi.getCapabilities(),
    enabled,
    ...PLATFORM_QUERY_OPTIONS,
  });
}

export interface PlatformPlanUsage {
  planId: string;
  totalTenants: number;
  activeWorkspaces: number;
  archivedWorkspaces: number;
  activeSubscriptions: number;
}

export function usePlatformPlansUsage(includeArchived = true, enabled = true) {
  return useQuery({
    queryKey: platformKeys.plansUsage(includeArchived),
    queryFn: async () => {
      const pageSize = 200;
      let page = 1;
      const usage = new Map<string, PlatformPlanUsage>();
      let hasNext = true;

      // Pull all tenant pages once and aggregate usage per plan.
      while (hasNext) {
        const response = await platformApi.listCompanies({
          page,
          limit: pageSize,
          includeArchived,
        });

        for (const company of response.items) {
          const latest = company.latestSubscription;
          if (!latest?.planId) continue;

          const existing = usage.get(latest.planId) ?? {
            planId: latest.planId,
            totalTenants: 0,
            activeWorkspaces: 0,
            archivedWorkspaces: 0,
            activeSubscriptions: 0,
          };

          existing.totalTenants += 1;

          if (company.isDeleted) {
            existing.archivedWorkspaces += 1;
          } else if (company.isActive) {
            existing.activeWorkspaces += 1;
          }

          if (latest.status === "ACTIVE" || latest.status === "TRIAL") {
            existing.activeSubscriptions += 1;
          }

          usage.set(latest.planId, existing);
        }

        hasNext = response.meta.hasNext;
        page += 1;
      }

      return Array.from(usage.values());
    },
    enabled,
    ...PLATFORM_QUERY_OPTIONS,
  });
}

function invalidatePlatformState(queryClient: ReturnType<typeof useQueryClient>, companyId?: string) {
  queryClient.invalidateQueries({ queryKey: platformKeys.companies() });
  queryClient.invalidateQueries({ queryKey: platformKeys.plansUsage() });
  queryClient.invalidateQueries({ queryKey: platformDashboardKeys.all });

  if (companyId) {
    queryClient.invalidateQueries({ queryKey: platformKeys.company(companyId) });
    queryClient.invalidateQueries({ queryKey: platformKeys.companyMetrics(companyId) });
  }
}

function invalidatePlansState(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: platformKeys.plans() });
  queryClient.invalidateQueries({ queryKey: platformKeys.plans(true) });
  queryClient.invalidateQueries({ queryKey: platformKeys.plansUsage() });
}

export function useActivatePlatformSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ActivatePlatformSubscriptionRequest) =>
      platformApi.activateSubscription(payload),
    onSuccess: (_, payload) => {
      invalidatePlatformState(queryClient, payload.companyId);
    },
  });
}

export function useChangePlatformSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChangePlatformSubscriptionPlanRequest) =>
      platformApi.changePlan(payload),
    onSuccess: (_, payload) => {
      invalidatePlatformState(queryClient, payload.companyId);
    },
  });
}

export function useCreatePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlatformCompanyRequest) =>
      platformApi.createCompany(payload),
    onSuccess: (createdCompany) => {
      invalidatePlatformState(queryClient, createdCompany.id);
    },
  });
}

export function useSuspendPlatformSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SuspendPlatformSubscriptionRequest) =>
      platformApi.suspendSubscription(payload),
    onSuccess: (_, payload) => {
      invalidatePlatformState(queryClient, payload.companyId);
    },
  });
}

export function useUpdatePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, payload }: { companyId: string; payload: UpdatePlatformCompanyRequest }) =>
      platformApi.updateCompany(companyId, payload),
    onSuccess: (_, variables) => {
      invalidatePlatformState(queryClient, variables.companyId);
    },
  });
}

export function useDisablePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => platformApi.disableCompany(companyId),
    onSuccess: (_, companyId) => {
      invalidatePlatformState(queryClient, companyId);
    },
  });
}

export function useEnablePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => platformApi.enableCompany(companyId),
    onSuccess: (_, companyId) => {
      invalidatePlatformState(queryClient, companyId);
    },
  });
}

export function useArchivePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload?: ArchivePlatformCompanyRequest;
    }) => platformApi.archiveCompany(companyId, payload),
    onSuccess: (_, variables) => {
      invalidatePlatformState(queryClient, variables.companyId);
    },
  });
}

export function useRestorePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload?: ArchivePlatformCompanyRequest;
    }) => platformApi.restoreCompany(companyId, payload),
    onSuccess: (_, variables) => {
      invalidatePlatformState(queryClient, variables.companyId);
    },
  });
}

export function useDeletePlatformCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload: DeletePlatformCompanyRequest;
    }) => platformApi.deleteCompany(companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.companies() });
      queryClient.invalidateQueries({ queryKey: platformKeys.plansUsage() });
      queryClient.invalidateQueries({ queryKey: platformDashboardKeys.all });
    },
  });
}

export function useExtendPlatformSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExtendPlatformSubscriptionRequest) =>
      platformApi.extendSubscription(payload),
    onSuccess: (_, payload) => {
      invalidatePlatformState(queryClient, payload.companyId);
    },
  });
}

export function useCreatePlatformPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlatformPlanRequest) =>
      platformApi.createPlan(payload),
    onSuccess: () => {
      invalidatePlansState(queryClient);
      queryClient.invalidateQueries({ queryKey: platformKeys.companies() });
    },
  });
}

export function useUpdatePlatformPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: UpdatePlatformPlanRequest }) =>
      platformApi.updatePlan(planId, payload),
    onSuccess: () => {
      invalidatePlansState(queryClient);
      queryClient.invalidateQueries({ queryKey: platformKeys.companies() });
    },
  });
}
