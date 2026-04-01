// ─── Expenses Hooks ────────────────────────────────────────────────────────────
// TanStack Query v5 — all server state for expenses.
// @module expenses/hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/api/config';
import { expensesApi } from '../api/expenses.api';
import type { ExpenseQueryParams, CreateExpenseDto, UpdateExpenseDto } from '../types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** Paginated list — params included in queryKey for per-filter caching */
export function useListExpenses(params?: ExpenseQueryParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.EXPENSES, params],
    queryFn: () => expensesApi.list(params),
  });
}

/** Summary totals — cached by filter params */
export function useExpensesSummary(params?: Omit<ExpenseQueryParams, 'page' | 'limit'>) {
  return useQuery({
    queryKey: [...QUERY_KEYS.EXPENSES_SUMMARY, params],
    queryFn: () => expensesApi.getSummary(params),
  });
}

/** Single expense by id */
export function useExpense(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.EXPENSE(id ?? ''),
    queryFn: () => expensesApi.get(id!),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateExpenseDto) => expensesApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES_SUMMARY });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExpenseDto }) =>
      expensesApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES_SUMMARY });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES_SUMMARY });
    },
  });
}
