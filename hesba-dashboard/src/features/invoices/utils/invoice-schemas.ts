import { z } from "zod";
import type { InvoicesListMeta, PartyType } from "@/lib/api/types";

export type InvoicePartyFilter = "all" | PartyType;

export const DEFAULT_INVOICES_META: InvoicesListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().min(0.001),
  unitPrice: z.coerce.number().min(0),
});

export const createInvoiceSchema = z.object({
  partyType: z.enum(["CUSTOMER", "SUPPLIER"]),
  partyId: z.string().uuid().min(1),
  partyAddress: z.string().trim().max(500).optional().or(z.literal("")),
  issueDate: z.string().date(),
  taxAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1),
});

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;
