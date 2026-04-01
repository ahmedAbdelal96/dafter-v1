import { z } from "zod";
import type { PartyType } from "@/lib/api/types";

export const DEFAULT_LEDGER_LIMIT = 20;

export const ENTRY_TYPE_VALUES = [
  "INVOICE",
  "PAYMENT",
  "RETURN",
  "ADJUSTMENT",
  "ADVANCE",
  "SALARY_PAYMENT",
  "DEDUCTION",
  "SETTLEMENT",
] as const;

export const PARTY_TYPE_VALUES = ["CUSTOMER", "SUPPLIER", "EMPLOYEE"] as const;

export const createLedgerEntrySchema = z.object({
  entryType: z.enum(ENTRY_TYPE_VALUES),
  amount: z.coerce.number().positive(),
  increaseBalance: z.boolean(),
  entryDate: z.string().date(),
  dueDate: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateLedgerEntryFormValues = z.infer<typeof createLedgerEntrySchema>;
export type LedgerPartyType = PartyType;
