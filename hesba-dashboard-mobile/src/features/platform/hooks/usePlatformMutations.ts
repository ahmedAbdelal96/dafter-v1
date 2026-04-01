import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { platformApi } from '../api/platform.api';
import type {
  ActivateSubscriptionDto,
  ArchiveCompanyDto,
  ChangePlanDto,
  CreateCompanyDto,
  DeleteCompanyDto,
  PlatformCreateStaffDto,
  SuspendSubscriptionDto,
  ExtendSubscriptionDto,
  UpdateCompanyDto,
} from '../types';

function invalidateCompany(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_COMPANY(id) });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_COMPANY_METRICS(id) });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_COMPANIES });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_STATS });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_CAPABILITIES });
}

export function useActivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ActivateSubscriptionDto) => platformApi.activateSubscription(dto),
    onSuccess: (_, dto) => invalidateCompany(qc, dto.companyId),
  });
}

export function useSuspendSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SuspendSubscriptionDto) => platformApi.suspendSubscription(dto),
    onSuccess: (_, dto) => invalidateCompany(qc, dto.companyId),
  });
}

export function useExtendSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ExtendSubscriptionDto) => platformApi.extendSubscription(dto),
    onSuccess: (_, dto) => invalidateCompany(qc, dto.companyId),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ChangePlanDto) => platformApi.changePlan(dto),
    onSuccess: (_, dto) => invalidateCompany(qc, dto.companyId),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCompanyDto }) =>
      platformApi.updateCompany(id, dto),
    onSuccess: (_, { id }) => invalidateCompany(qc, id),
  });
}

export function useArchiveCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: ArchiveCompanyDto }) =>
      platformApi.archiveCompany(id, dto),
    onSuccess: (_, { id }) => invalidateCompany(qc, id),
  });
}

export function useRestoreCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: ArchiveCompanyDto }) =>
      platformApi.restoreCompany(id, dto),
    onSuccess: (_, { id }) => invalidateCompany(qc, id),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: DeleteCompanyDto }) =>
      platformApi.deleteCompany(id, dto),
    onSuccess: (_, { id }) => {
      invalidateCompany(qc, id);
      qc.removeQueries({ queryKey: QUERY_KEYS.PLATFORM_COMPANY(id) });
      qc.removeQueries({ queryKey: QUERY_KEYS.PLATFORM_COMPANY_METRICS(id) });
    },
  });
}

export function useDisableCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformApi.disableCompany(id),
    onSuccess: (_, id) => invalidateCompany(qc, id),
  });
}

export function useEnableCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformApi.enableCompany(id),
    onSuccess: (_, id) => invalidateCompany(qc, id),
  });
}

// ── Company Creation ──────────────────────────────────────────────────────────

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCompanyDto) => platformApi.createCompany(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_COMPANIES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_STATS });
    },
  });
}

// ── Platform Users ────────────────────────────────────────────────────────────

function invalidateUsers(qc: ReturnType<typeof useQueryClient>, companyId: string) {
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_USERS(companyId) });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_USER_STATS(companyId) });
}

export function useCreatePlatformStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PlatformCreateStaffDto) => platformApi.createPlatformStaff(dto),
    onSuccess: (_, dto) => invalidateUsers(qc, dto.companyId),
  });
}

export function useDisablePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      platformApi.disablePlatformUser(id, companyId),
    onSuccess: (_, { companyId }) => invalidateUsers(qc, companyId),
  });
}

export function useEnablePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      platformApi.enablePlatformUser(id, companyId),
    onSuccess: (_, { companyId }) => invalidateUsers(qc, companyId),
  });
}
