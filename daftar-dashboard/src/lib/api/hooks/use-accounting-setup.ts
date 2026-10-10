import { useQuery } from "@tanstack/react-query";
import { accountingSetupApi } from "../services/accounting-setup";
import { accountingSetupKeys } from "./query-keys";

export function useAccountingAccounts() {
  return useQuery({ queryKey: accountingSetupKeys.accounts(), queryFn: () => accountingSetupApi.accounts() });
}

export function useAccountingReadiness(postingDate?: string) {
  return useQuery({ queryKey: accountingSetupKeys.readiness(postingDate), queryFn: () => accountingSetupApi.readiness(postingDate) });
}
