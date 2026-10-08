// ─── Expenses API ──────────────────────────────────────────────────────────────
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type {
  Expense,
  ExpenseListResponse,
  ExpenseSummary,
  ExpenseQueryParams,
  CreateExpenseDto,
  UpdateExpenseDto,
} from '../types';

export const expensesApi = {
  /** GET /expenses — paginated list with optional filters */
  list: async (params?: ExpenseQueryParams): Promise<ExpenseListResponse> => {
    const res = await apiClient.get<{
      data: { items: Expense[]; meta: ExpenseListResponse['meta'] };
    }>(API_ENDPOINTS.expenses.list, { params });
    // Backend wraps in ApiResponseDto: res.data = { data: { items, meta }, message }
    return res.data.data;
  },

  /** GET /expenses/summary — totals + breakdown by category */
  getSummary: async (params?: ExpenseQueryParams): Promise<ExpenseSummary> => {
    const res = await apiClient.get<{ data: ExpenseSummary }>(
      API_ENDPOINTS.expenses.summary,
      { params },
    );
    return res.data.data;
  },

  /** GET /expenses/:id */
  get: async (id: string): Promise<Expense> => {
    const res = await apiClient.get<{ data: Expense }>(
      API_ENDPOINTS.expenses.get(id),
    );
    return res.data.data;
  },

  /** POST /expenses */
  create: async (dto: CreateExpenseDto): Promise<Expense> => {
    const res = await apiClient.post<{ data: Expense }>(
      API_ENDPOINTS.expenses.create,
      dto,
    );
    return res.data.data;
  },

  /** PATCH /expenses/:id — all fields optional */
  update: async (id: string, dto: UpdateExpenseDto): Promise<Expense> => {
    const res = await apiClient.patch<{ data: Expense }>(
      API_ENDPOINTS.expenses.update(id),
      dto,
    );
    return res.data.data;
  },

  /** DELETE /expenses/:id — soft delete (owner only) */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.expenses.delete(id));
  },
};
