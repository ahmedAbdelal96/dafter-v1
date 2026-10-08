import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../services/payments";
import { customersKeys, invoicesKeys, ledgerKeys } from "./query-keys";
import type { CreateStandalonePaymentRequest, DistributePaymentRequest } from "../types";

function invalidatePaymentsImpact(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
  queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
  queryClient.invalidateQueries({ queryKey: invoicesKeys.details() });
  queryClient.invalidateQueries({ queryKey: customersKeys.lists() });
  queryClient.invalidateQueries({ queryKey: customersKeys.details() });
}

export function useRecordStandalonePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStandalonePaymentRequest) =>
      paymentsApi.recordStandalonePayment(payload),
    onSuccess: () => {
      invalidatePaymentsImpact(queryClient);
    },
  });
}

export function useDistributePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DistributePaymentRequest) =>
      paymentsApi.distributePayment(payload),
    onSuccess: () => {
      invalidatePaymentsImpact(queryClient);
    },
  });
}
