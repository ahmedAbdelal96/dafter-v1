import type { InvoiceStatus } from "@/lib/api/types";

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

export function getInvoiceStatusBadgeColor(status: InvoiceStatus): BadgeColor {
  switch (status) {
    case "DRAFT":
      return "light";
    case "PENDING_APPROVAL":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    case "CANCELLED":
      return "dark";
    default:
      return "light";
  }
}

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toOptionalNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

export function formatMoney(value: string | number | null | undefined, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}
