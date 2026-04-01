import { z } from "zod";
import type { EmployeesListMeta } from "@/lib/api/types";

export type StatusFilter = "all" | "active" | "inactive";

export const DEFAULT_EMPLOYEES_META: EmployeesListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().or(z.literal("")),
  jobTitle: z.string().trim().max(100).optional().or(z.literal("")),
  openingBalance: z.coerce.number().min(0).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional().or(z.literal("")),
  jobTitle: z.string().trim().max(100).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;

export const createEmployeeLedgerEntrySchema = z.object({
  entryType: z.enum(["INVOICE", "PAYMENT", "RETURN", "ADJUSTMENT"]),
  amount: z.coerce.number().positive(),
  increaseBalance: z.boolean(),
  entryDate: z.string().trim().min(1),
  dueDate: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateEmployeeLedgerEntryFormValues = z.infer<
  typeof createEmployeeLedgerEntrySchema
>;

export const createEmployeePayrollEntrySchema = z.object({
  entryType: z.enum(["SALARY_PAYMENT", "ADVANCE", "DEDUCTION"]),
  amount: z.coerce.number().positive(),
  entryDate: z.string().trim().min(1),
  dueDate: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateEmployeePayrollEntryFormValues = z.infer<
  typeof createEmployeePayrollEntrySchema
>;
