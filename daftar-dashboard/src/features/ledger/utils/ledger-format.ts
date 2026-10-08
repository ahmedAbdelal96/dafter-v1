export function formatMoney(value: string | number, locale: string): string {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function toSignedAmount(amount: number, increaseBalance: boolean): number {
  return increaseBalance ? amount : -amount;
}
