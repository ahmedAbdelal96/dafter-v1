// ─── Ledger Hooks ──────────────────────────────────────────────────────────────
// TanStack Query v5 — all server state lives here.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { ledgerApi } from '../api/ledger.api';
import type { StatementParams, CreateLedgerEntryDto } from '../types';

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Paginated account statement for a single party.
 * `params` is part of the query key so each page/filter combo caches independently.
 * Set `enabled: false` while partyId is not ready.
 */
export function useStatement(params: StatementParams | null) {
  return useQuery({
    queryKey: params
      ? [...QUERY_KEYS.STATEMENT(params.partyId), params]
      : QUERY_KEYS.LEDGER,
    queryFn: () => ledgerApi.getStatement(params!),
    enabled: !!params?.partyId && !!params?.partyType,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLedgerEntryDto) => ledgerApi.createEntry(dto),
    onSuccess: (_, dto) => {
      // Invalidate the statement for this specific party
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STATEMENT(dto.partyId) });
      // Also invalidate the party lists (balance may have changed)
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId }: { entryId: string; partyId: string }) =>
      ledgerApi.deleteEntry(entryId),
    onSuccess: (_, { partyId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STATEMENT(partyId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
    },
  });
}
