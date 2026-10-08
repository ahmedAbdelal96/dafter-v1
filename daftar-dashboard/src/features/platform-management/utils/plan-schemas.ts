import { z } from "zod";
import type { CreatePlatformPlanRequest } from "@/lib/api/services/platform";

const LIMIT_FIELD_REGEX = /^\d+$/;

export const platformPlanFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  price: z
    .string()
    .trim()
    .min(1)
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0;
    }),
  currencyCode: z.string().trim().min(3).max(3),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  maxUsers: z.string().trim().optional(),
  maxCustomers: z.string().trim().optional(),
  maxSuppliers: z.string().trim().optional(),
  maxEmployees: z.string().trim().optional(),
  maxLedgerEntries: z.string().trim().optional(),
  featuresText: z.string().trim().optional(),
  isActive: z.boolean(),
});

export type PlatformPlanFormValues = z.infer<typeof platformPlanFormSchema>;

function parseOptionalLimit(value?: string): number | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  if (!LIMIT_FIELD_REGEX.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function parseFeatures(value?: string): string[] | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;

  const unique = new Set(
    trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  return unique.size > 0 ? Array.from(unique) : undefined;
}

export function toPlatformPlanPayload(values: PlatformPlanFormValues): CreatePlatformPlanRequest {
  return {
    name: values.name.trim(),
    price: Number(values.price),
    currencyCode: values.currencyCode.trim().toUpperCase(),
    billingCycle: values.billingCycle,
    maxUsers: parseOptionalLimit(values.maxUsers),
    maxCustomers: parseOptionalLimit(values.maxCustomers),
    maxSuppliers: parseOptionalLimit(values.maxSuppliers),
    maxEmployees: parseOptionalLimit(values.maxEmployees),
    maxLedgerEntries: parseOptionalLimit(values.maxLedgerEntries),
    features: parseFeatures(values.featuresText),
    isActive: values.isActive,
  };
}

