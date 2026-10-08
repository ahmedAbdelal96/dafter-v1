import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ledgerApi } from "../services/ledger";
import { LEDGER_CACHE } from "./config";
import { ledgerKeys } from "./query-keys";
import type { CreateLedgerEntryRequest, LedgerStatementFilters } from "../types";

export function useLedgerStatement(filters: LedgerStatementFilters, enabled = true) {
  return useQuery({
    queryKey: ledgerKeys.statement(filters),
    queryFn: () => ledgerApi.getStatement(filters),
    staleTime: LEDGER_CACHE.statement.staleTime,
    gcTime: LEDGER_CACHE.statement.gcTime,
    enabled: Boolean(filters.partyId) && enabled,
  });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLedgerEntryRequest) => ledgerApi.createEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
    },
  });
}

export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ledgerApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.statements() });
    },
  });
}
