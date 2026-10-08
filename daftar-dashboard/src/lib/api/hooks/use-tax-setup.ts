import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import { taxSetupKeys } from "./query-keys";
import { taxSetupApi, type TaxSearchParams } from "../services/tax-setup";

const TAX_SETUP_QUERY_OPTIONS = {
  staleTime: ACCOUNTING_CACHE.dashboard.staleTime,
  gcTime: ACCOUNTING_CACHE.dashboard.gcTime,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

function invalidateTaxSetup(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: taxSetupKeys.all });
}

export function useTaxRegistrationProfile(enabled = true) {
  return useQuery({
    queryKey: taxSetupKeys.registrationProfile(),
    queryFn: () => taxSetupApi.getRegistrationProfile(),
    enabled,
    ...TAX_SETUP_QUERY_OPTIONS,
  });
}

export function useTaxRates(filters: TaxSearchParams = {}, enabled = true) {
  return useQuery({
    queryKey: [...taxSetupKeys.taxRates(), filters] as const,
    queryFn: () => taxSetupApi.listTaxRates(filters),
    enabled,
    ...TAX_SETUP_QUERY_OPTIONS,
  });
}

export function useTaxTreatments(filters: TaxSearchParams = {}, enabled = true) {
  return useQuery({
    queryKey: [...taxSetupKeys.taxTreatments(), filters] as const,
    queryFn: () => taxSetupApi.listTaxTreatments(filters),
    enabled,
    ...TAX_SETUP_QUERY_OPTIONS,
  });
}

export function useTaxDefaultPolicy(enabled = true) {
  return useQuery({
    queryKey: taxSetupKeys.defaultPolicy(),
    queryFn: () => taxSetupApi.getDefaultPolicy(),
    enabled,
    ...TAX_SETUP_QUERY_OPTIONS,
  });
}

export function useTaxAccountBindings(enabled = true) {
  return useQuery({
    queryKey: taxSetupKeys.accountBindings(),
    queryFn: () => taxSetupApi.getAccountBindings(),
    enabled,
    ...TAX_SETUP_QUERY_OPTIONS,
  });
}

export function useTaxModuleApplicabilityRules(enabled = true) {
  return useQuery({
    queryKey: taxSetupKeys.moduleApplicabilityRules(),
    queryFn: () => taxSetupApi.listModuleApplicabilityRules(),
    enabled,
    ...TAX_SETUP_QUERY_OPTIONS,
  });
}

export function useUpdateTaxRegistrationProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.updateRegistrationProfile,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useCreateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.createTaxRate,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useUpdateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof taxSetupApi.updateTaxRate>[1];
    }) => taxSetupApi.updateTaxRate(id, payload),
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useInactivateTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.inactivateTaxRate,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useArchiveTaxRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.archiveTaxRate,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useCreateTaxTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.createTaxTreatment,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useUpdateTaxTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof taxSetupApi.updateTaxTreatment>[1];
    }) => taxSetupApi.updateTaxTreatment(id, payload),
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useInactivateTaxTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.inactivateTaxTreatment,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useArchiveTaxTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.archiveTaxTreatment,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useUpdateTaxDefaultPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.updateDefaultPolicy,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useUpdateTaxAccountBindings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxSetupApi.updateAccountBindings,
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}

export function useUpdateTaxModuleApplicabilityRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleKey,
      payload,
    }: {
      moduleKey: Parameters<typeof taxSetupApi.updateModuleApplicabilityRule>[0];
      payload: Parameters<typeof taxSetupApi.updateModuleApplicabilityRule>[1];
    }) => taxSetupApi.updateModuleApplicabilityRule(moduleKey, payload),
    onSuccess: () => invalidateTaxSetup(queryClient),
  });
}
