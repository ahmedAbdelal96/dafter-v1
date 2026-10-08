import { z } from "zod";

export const customerInvoiceItemSchema = z.object({
  productId: z.string().trim().optional(),
  description: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const createCustomerInvoiceSchema = z.object({
  issueDate: z.string().trim().min(1),
  partyAddress: z.string().trim().max(500).optional().or(z.literal("")),
  taxAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(customerInvoiceItemSchema).min(1),
});

export type CreateCustomerInvoiceFormValues = z.infer<
  typeof createCustomerInvoiceSchema
>;
