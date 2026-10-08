import { z } from "zod";

const scheduleItemSchema = z.object({
  dueDate: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().max(255).optional(),
});

export const installmentCreateSchema = z
  .object({
    partyType: z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE"]),
    partyId: z.string().uuid(),
    totalAmount: z.number().positive(),
    downPayment: z.number().min(0).optional(),
    numberOfInstallments: z.number().int().min(1).max(360),
    scheduleType: z.enum(["FIXED", "CUSTOM"]),
    startDate: z.string().min(1),
    scheduleItems: z.array(scheduleItemSchema).optional(),
    description: z.string().max(500).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.scheduleType === "CUSTOM") {
      const items = values.scheduleItems ?? [];

      if (items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduleItems"],
          message: "Schedule items are required for custom schedules",
        });
        return;
      }

      if (items.length !== values.numberOfInstallments) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduleItems"],
          message: "Schedule items count must match installments count",
        });
      }
    }
  });

export type InstallmentCreateFormValues = z.infer<typeof installmentCreateSchema>;

export const installmentPaymentSchema = z.object({
  scheduleId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type InstallmentPaymentFormValues = z.infer<typeof installmentPaymentSchema>;

export type InstallmentPartyFilter = "all" | "CUSTOMER" | "SUPPLIER" | "EMPLOYEE";
export type InstallmentContractStatusFilter = "all" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type InstallmentScheduleStatusFilter =
  | "all"
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "WAIVED";

export const DEFAULT_INSTALLMENTS_META = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const DEFAULT_INSTALLMENTS_SCHEDULE_META = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};
