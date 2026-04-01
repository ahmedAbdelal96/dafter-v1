export function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toOptionalString(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function formatMoney(value: string | number, locale: string): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(safeAmount);
}
