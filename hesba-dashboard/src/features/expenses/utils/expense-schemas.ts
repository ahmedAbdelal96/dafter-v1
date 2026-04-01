import { z } from "zod";
import type { ExpensesListMeta } from "@/lib/api/types";
import { EXPENSE_CATEGORIES } from "./expense-constants";

export const DEFAULT_EXPENSES_META: ExpensesListMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().min(0.01),
  expenseDate: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  supplierId: z.string().trim().uuid().optional().or(z.literal("")),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal("")),
  paymentMethod: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseFormValues = z.infer<typeof updateExpenseSchema>;
