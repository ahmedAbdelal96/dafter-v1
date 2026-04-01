export function toOptionalNumber(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return value;
}

export function toOptionalNumberOrNull(value: number | undefined): number | null {
  if (value === undefined || Number.isNaN(value)) return null;
  return value;
}

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatMoney(
  value: string | number | null | undefined,
  locale: string
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}
