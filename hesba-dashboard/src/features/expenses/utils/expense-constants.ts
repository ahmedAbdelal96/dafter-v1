import type { ExpenseCategoryValue } from "@/lib/api/types";

export const EXPENSE_CATEGORIES = [
  "RENT",
  "SALARIES",
  "UTILITIES",
  "SUPPLIES",
  "TRANSPORTATION",
  "MAINTENANCE",
  "MARKETING",
  "TAXES",
  "OTHER",
] as const satisfies readonly ExpenseCategoryValue[];
