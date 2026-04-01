import { z } from "zod";
import type { CustomersListMeta } from "@/lib/api/types";

export type StatusFilter = "all" | "active" | "inactive";

export const DEFAULT_CUSTOMERS_META: CustomersListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  openingBalance: z.coerce.number().min(0).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  creditLimit: z.coerce.number().min(0).optional(),
  isActive: z.boolean(),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormValues = z.infer<typeof updateCustomerSchema>;

export const createCustomerLedgerEntrySchema = z.object({
  entryType: z.enum(["INVOICE", "PAYMENT", "RETURN", "ADJUSTMENT"]),
  amount: z.coerce.number().positive(),
  increaseBalance: z.boolean(),
  entryDate: z.string().trim().min(1),
  dueDate: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateCustomerLedgerEntryFormValues = z.infer<
  typeof createCustomerLedgerEntrySchema
>;
