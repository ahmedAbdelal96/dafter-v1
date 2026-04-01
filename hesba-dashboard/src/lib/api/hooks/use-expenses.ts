import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "../services/expenses";
import { EXPENSES_CACHE } from "./config";
import { expensesKeys } from "./query-keys";
import type {
  ExpenseFilters,
  CreateExpenseRequestPayload,
  UpdateExpenseRequestPayload,
  ExpensesListResponse,
} from "../types";

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: expensesKeys.list(filters),
    queryFn: () => expensesApi.getAll(filters),
    staleTime: EXPENSES_CACHE.list.staleTime,
    gcTime: EXPENSES_CACHE.list.gcTime,
  });
}

export function useExpensesSummary(filters: ExpenseFilters, enabled = true) {
  return useQuery({
    queryKey: expensesKeys.summary(filters),
    queryFn: () => expensesApi.getSummary(filters),
    staleTime: EXPENSES_CACHE.summary.staleTime,
    gcTime: EXPENSES_CACHE.summary.gcTime,
    enabled,
  });
}

export function useExpense(id: string, enabled = true) {
  return useQuery({
    queryKey: expensesKeys.detail(id),
    queryFn: () => expensesApi.getById(id),
    staleTime: EXPENSES_CACHE.single.staleTime,
    gcTime: EXPENSES_CACHE.single.gcTime,
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExpenseRequestPayload) => expensesApi.create(payload),
    onSuccess: (newExpense) => {
      queryClient.setQueriesData<ExpensesListResponse>(
        { queryKey: expensesKeys.lists() },
        (previous) => {
          if (!previous) return previous;

          const alreadyExists = previous.items.some((item) => item.id === newExpense.id);
          if (alreadyExists) return previous;

          const nextItems = [newExpense, ...previous.items].slice(
            0,
            Math.max(previous.meta.limit, 1)
          );

          return {
            items: nextItems,
            meta: {
              ...previous.meta,
              total: previous.meta.total + 1,
              totalPages: Math.max(
                1,
                Math.ceil((previous.meta.total + 1) / Math.max(previous.meta.limit, 1))
              ),
            },
          };
        }
      );

      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expensesKeys.summaries() });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpenseRequestPayload }) =>
      expensesApi.update(id, payload),
    onSuccess: (expense) => {
      queryClient.setQueryData(expensesKeys.detail(expense.id), expense);
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expensesKeys.summaries() });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: expensesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: expensesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expensesKeys.summaries() });
    },
  });
}
