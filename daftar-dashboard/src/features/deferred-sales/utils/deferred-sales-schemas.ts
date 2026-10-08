import { z } from "zod";

export const deferredSaleCreateSchema = z.object({
  partyType: z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE"]),
  partyId: z.string().uuid(),
  totalAmount: z.number().positive(),
  dueDate: z.string().min(1),
  entryDate: z.string().optional(),
  description: z.string().max(500).optional(),
  expectedPaymentMethod: z.string().max(100).optional(),
});

export type DeferredSaleCreateFormValues = z.infer<typeof deferredSaleCreateSchema>;

export const deferredPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type DeferredPaymentFormValues = z.infer<typeof deferredPaymentSchema>;

export type DeferredSalesStatusFilter = "all" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export const DEFAULT_DEFERRED_SALES_META = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};
