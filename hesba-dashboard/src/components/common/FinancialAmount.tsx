"use client";

type FinancialAmountVariant = "inline" | "card" | "table";

interface FinancialAmountProps {
  amount: string | number | null | undefined;
  formatted: string;
  variant?: FinancialAmountVariant;
  className?: string;
  zeroNeutral?: boolean;
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const EGP_CURRENCY_TOKEN_PATTERN =
  /((?:[\u061C\u200E\u200F]*)ج\.?\s*م\.?(?:[\u061C\u200E\u200F]*))/;

export function FinancialAmount({
  amount,
  formatted,
  variant = "inline",
  className = "",
  zeroNeutral = true,
}: FinancialAmountProps) {
  const numericValue = toNumber(amount);

  const toneClass =
    numericValue > 0
      ? "finance-positive"
      : numericValue < 0
      ? "finance-risk"
      : zeroNeutral
      ? "text-text-secondary dark:text-slate-300"
      : "finance-negative";

  const variantClass =
    variant === "card"
      ? "text-base font-semibold tracking-tight"
      : variant === "table"
      ? "text-sm font-semibold"
      : "text-sm font-medium";

  const hasEgpToken = EGP_CURRENCY_TOKEN_PATTERN.test(formatted);

  if (!hasEgpToken) {
    return <span className={`${variantClass} ${toneClass} ${className}`}>{formatted}</span>;
  }

  const parts = formatted.split(EGP_CURRENCY_TOKEN_PATTERN).filter(Boolean);

  return (
    <span className={`${variantClass} ${className}`}>
      {parts.map((part, index) => {
        const isCurrencyToken = EGP_CURRENCY_TOKEN_PATTERN.test(part);
        return (
          <span
            key={`${part}-${index}`}
            className={
              isCurrencyToken
                ? "mx-0.5 text-[0.78em] font-medium text-text-tertiary dark:text-slate-400"
                : toneClass
            }
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
