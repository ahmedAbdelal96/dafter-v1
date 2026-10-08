import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACCOUNTING_CACHE } from "./config";
import {
  customersKeys,
  employeesKeys,
  installmentsKeys,
  ledgerKeys,
  suppliersKeys,
} from "./query-keys";
import { installmentsApi } from "../services/installments";
import type {
  CreateInstallmentContractRequest,
  InstallmentsFilters,
  InstallmentsScheduleFilters,
  RecordInstallmentPaymentRequest,
} from "../types";

export function useInstallmentContracts(filters: InstallmentsFilters, enabled = true) {
  return useQuery({
    queryKey: installmentsKeys.contractsList(filters),
    queryFn: () => installmentsApi.getContracts(filters),
    staleTime: ACCOUNTING_CACHE.installments.staleTime,
    gcTime: ACCOUNTING_CACHE.installments.gcTime,
    enabled,
  });
}

export function useInstallmentContract(id: string, includePayments = true, enabled = true) {
  return useQuery({
    queryKey: installmentsKeys.contractDetail(id, includePayments),
    queryFn: () => installmentsApi.getContractById(id, includePayments),
    staleTime: ACCOUNTING_CACHE.installments.staleTime,
    gcTime: ACCOUNTING_CACHE.installments.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useInstallmentsSchedule(filters: InstallmentsScheduleFilters, enabled = true) {
  return useQuery({
    queryKey: installmentsKeys.scheduleList(filters),
    queryFn: () => installmentsApi.getSchedule(filters),
    staleTime: ACCOUNTING_CACHE.installments.staleTime,
    gcTime: ACCOUNTING_CACHE.installments.gcTime,
    enabled,
  });
}

export function useCreateInstallmentContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInstallmentContractRequest) =>
      installmentsApi.createContract(payload),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: installmentsKeys.contracts() });
      queryClient.invalidateQueries({ queryKey: installmentsKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });

      if (contract.partyType === "CUSTOMER") {
        queryClient.invalidateQueries({ queryKey: customersKeys.details() });
      }
      if (contract.partyType === "SUPPLIER") {
        queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
      }
      if (contract.partyType === "EMPLOYEE") {
        queryClient.invalidateQueries({ queryKey: employeesKeys.details() });
      }
    },
  });
}

export function useRecordInstallmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordInstallmentPaymentRequest }) =>
      installmentsApi.recordPayment(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: installmentsKeys.contracts() });
      queryClient.invalidateQueries({ queryKey: installmentsKeys.contractDetail(id, true) });
      queryClient.invalidateQueries({ queryKey: installmentsKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
      queryClient.invalidateQueries({ queryKey: customersKeys.details() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
      queryClient.invalidateQueries({ queryKey: employeesKeys.details() });
    },
  });
}

export function useCancelInstallmentContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => installmentsApi.cancelContract(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: installmentsKeys.contractDetail(id, true) });
      queryClient.invalidateQueries({ queryKey: installmentsKeys.contracts() });
      queryClient.invalidateQueries({ queryKey: installmentsKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
      queryClient.invalidateQueries({ queryKey: customersKeys.details() });
      queryClient.invalidateQueries({ queryKey: suppliersKeys.details() });
      queryClient.invalidateQueries({ queryKey: employeesKeys.details() });
    },
  });
}
