import { z } from "zod";
import type { ProductsListMeta } from "@/lib/api/types";

export type StatusFilter = "all" | "active" | "inactive";

export const DEFAULT_PRODUCTS_META: ProductsListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  unit: z.string().trim().max(20).optional().or(z.literal("")),
  unitPrice: z.coerce.number().min(0),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  unit: z.string().trim().max(20).optional().or(z.literal("")),
  unitPrice: z.coerce.number().min(0),
  isActive: z.boolean(),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
