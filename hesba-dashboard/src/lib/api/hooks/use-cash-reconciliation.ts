"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cashReconciliationApi,
  type CashReconciliationHistoryFilters,
  type UpdateCompanyCashModePayload,
  type UpsertDailyCashReconciliationPayload,
  type UpdateDailyCashReconciliationPayload,
} from "@/lib/api/services/cash-reconciliation";
import { cashReconciliationKeys, companyKeys } from "./query-keys";

export function useCompanyCashMode() {
  return useQuery({
    queryKey: companyKeys.cashMode(),
    queryFn: cashReconciliationApi.getCompanyMode,
  });
}

export function useUpdateCompanyCashMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCompanyCashModePayload) =>
      cashReconciliationApi.updateCompanyMode(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(companyKeys.cashMode(), updated);
    },
  });
}

export function useDailyCashReconciliation(businessDate: string) {
  return useQuery({
    queryKey: cashReconciliationKeys.daily(businessDate),
    queryFn: () => cashReconciliationApi.getDaily(businessDate),
    enabled: Boolean(businessDate),
  });
}

export function useDailyCashReconciliationById(id: string) {
  return useQuery({
    queryKey: cashReconciliationKeys.detail(id),
    queryFn: () => cashReconciliationApi.getDailyById(id),
    enabled: Boolean(id),
  });
}

export function useCashReconciliationHistory(filters?: CashReconciliationHistoryFilters) {
  return useQuery({
    queryKey: cashReconciliationKeys.history(filters),
    queryFn: () => cashReconciliationApi.getHistory(filters),
  });
}

export function useCashReconciliationSummary(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: cashReconciliationKeys.summary(params),
    queryFn: () => cashReconciliationApi.getSummary(params),
  });
}

export function useUpsertDailyCashReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertDailyCashReconciliationPayload) =>
      cashReconciliationApi.upsertDraft(payload),
    onSuccess: (result, payload) => {
      queryClient.setQueryData(cashReconciliationKeys.daily(payload.businessDate), result.record);
      queryClient.invalidateQueries({ queryKey: cashReconciliationKeys.history() });
      queryClient.invalidateQueries({ queryKey: cashReconciliationKeys.summary() });
    },
  });
}

export function useUpdateDailyCashReconciliation(businessDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDailyCashReconciliationPayload }) =>
      cashReconciliationApi.updateDraft(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(cashReconciliationKeys.daily(businessDate), updated);
      queryClient.setQueryData(cashReconciliationKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: cashReconciliationKeys.history() });
      queryClient.invalidateQueries({ queryKey: cashReconciliationKeys.summary() });
    },
  });
}

export function useCloseDailyCashReconciliation(businessDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cashReconciliationApi.closeDraft(id),
    onSuccess: (closed) => {
      queryClient.setQueryData(cashReconciliationKeys.daily(businessDate), closed);
      queryClient.setQueryData(cashReconciliationKeys.detail(closed.id), closed);
      queryClient.invalidateQueries({ queryKey: cashReconciliationKeys.history() });
      queryClient.invalidateQueries({ queryKey: cashReconciliationKeys.summary() });
    },
  });
}
