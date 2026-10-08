import type {
  InstallmentContractStatus,
  InstallmentScheduleStatus,
} from "@/lib/api/types";

function toNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: string | number | null | undefined, locale: string): string {
  const amount = toNumeric(value);
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | Date | null | undefined, locale: string): string {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function getInstallmentContractStatusColor(status: InstallmentContractStatus) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "CANCELLED") return "error" as const;
  return "warning" as const;
}

export function getInstallmentScheduleStatusColor(status: InstallmentScheduleStatus) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "error" as const;
  if (status === "WAIVED") return "light" as const;
  return "warning" as const;
}

export function getRemainingAmount(total: string | number, paid: string | number): number {
  const remaining = toNumeric(total) - toNumeric(paid);
  return Math.max(remaining, 0);
}

export function toPositiveNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
