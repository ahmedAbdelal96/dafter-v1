import { z } from "zod";
import type { StaffPermissionsMap, UsersListMeta } from "@/lib/api/types";

export type UserStatusFilter = "all" | "active" | "disabled";

export const DEFAULT_USERS_META: UsersListMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export const DEFAULT_STAFF_PERMISSIONS: Required<StaffPermissionsMap> = {
  manageUsers: false,
  viewParties: false,
  manageParties: false,
  viewLedger: false,
  manageLedger: false,
  viewReports: false,
};

export const createStaffUserSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8)
    .regex(/(?=.*[A-Z])(?=.*\d)/),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  manageUsers: z.boolean(),
  viewParties: z.boolean(),
  manageParties: z.boolean(),
  viewLedger: z.boolean(),
  manageLedger: z.boolean(),
  viewReports: z.boolean(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const updatePermissionsSchema = z.object({
  manageUsers: z.boolean(),
  viewParties: z.boolean(),
  manageParties: z.boolean(),
  viewLedger: z.boolean(),
  manageLedger: z.boolean(),
  viewReports: z.boolean(),
});

export type CreateStaffUserFormValues = z.infer<typeof createStaffUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
export type UpdateUserPermissionsFormValues = z.infer<typeof updatePermissionsSchema>;
