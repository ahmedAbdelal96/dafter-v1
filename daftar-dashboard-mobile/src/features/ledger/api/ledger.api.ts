// ─── Ledger API ────────────────────────────────────────────────────────────────
// Pure async functions — one per endpoint, no UI logic.

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  StatementResult,
  StatementParams,
  CreateLedgerEntryDto,
  LedgerEntry,
} from '../types';

export const ledgerApi = {
  /**
   * GET /ledger/statement — paginated account statement.
   * partyType + partyId are query params (NOT path params).
   * Response: { data: StatementResult }
   */
  getStatement: async (params: StatementParams): Promise<StatementResult> => {
    const res = await apiClient.get<{ data: StatementResult }>(
      API_ENDPOINTS.ledger.statement,
      { params },
    );
    return res.data.data;
  },

  /**
   * POST /ledger — create a new ledger entry.
   * signedAmount must be pre-computed with the correct sign by the client.
   */
  createEntry: async (dto: CreateLedgerEntryDto): Promise<LedgerEntry> => {
    const res = await apiClient.post<{ data: LedgerEntry }>(
      API_ENDPOINTS.ledger.create,
      dto,
    );
    return res.data.data;
  },

  /**
   * DELETE /ledger/:id — soft-delete an entry and reverse its balance impact.
   * Returns 404 if entry doesn't exist or already deleted.
   */
  deleteEntry: async (entryId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ledger.delete(entryId));
  },
};
