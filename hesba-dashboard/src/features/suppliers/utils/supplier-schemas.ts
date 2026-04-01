import { z } from "zod";
import type { SuppliersListMeta } from "@/lib/api/types";

export type StatusFilter = "all" | "active" | "inactive";

export const DEFAULT_SUPPLIERS_META: SuppliersListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  openingBalance: z.coerce.number().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierFormValues = z.infer<typeof updateSupplierSchema>;

export const createSupplierLedgerEntrySchema = z.object({
  entryType: z.enum(["INVOICE", "PAYMENT", "RETURN", "ADJUSTMENT"]),
  amount: z.coerce.number().positive(),
  increaseBalance: z.boolean(),
  entryDate: z.string().trim().min(1),
  dueDate: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateSupplierLedgerEntryFormValues = z.infer<
  typeof createSupplierLedgerEntrySchema
>;
