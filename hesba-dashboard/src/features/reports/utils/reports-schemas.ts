import type { ReportsMeta } from "@/lib/api/types";

export type ReportsTabKey =
  | "overview"
  | "profit-loss"
  | "cash-flow"
  | "customers-aging"
  | "suppliers-aging"
  | "sales-detailed"
  | "expenses-analytics"
  | "products-performance"
  | "operational-performance"
  | "critical-alerts"
  | "ledger-statement"
  | "collections-followup"
  | "debts-summary"
  | "staff-activity"
  | "simple-ledger";

export const DEFAULT_REPORTS_META: ReportsMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};
