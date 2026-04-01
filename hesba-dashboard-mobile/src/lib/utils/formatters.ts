/**
 * formatters.ts — Common display formatters
 *
 * All functions are pure and locale-aware. Pass the user's locale ('ar' | 'en')
 * when you need locale-specific formatting (numbers, currencies, dates).
 *
 * Note: React Native's Intl support depends on the JS engine (Hermes on RN 0.70+
 * has full Intl support). These functions assume Intl is available.
 */

type Locale = "ar" | "en";
type CurrencyCode = string; // ISO 4217, e.g. 'EGP', 'SAR', 'USD'

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a monetary amount with the correct currency symbol and locale numerals.
 *
 * @example
 *   formatCurrency(1500, 'EGP', 'ar') → '١٬٥٠٠٫٠٠ ج.م'
 *   formatCurrency(1500, 'EGP', 'en') → 'EGP 1,500.00'
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "EGP",
  locale: Locale = "ar",
): string {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if Intl or the currency code is unsupported
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Format a compact monetary amount (e.g. "15K" for 15,000).
 * Useful for dashboard KPI cards where space is limited.
 *
 * @example
 *   formatCurrencyCompact(15200, 'EGP', 'en') → 'EGP 15K'
 */
export function formatCurrencyCompact(
  amount: number,
  currency: CurrencyCode = "EGP",
  locale: Locale = "ar",
): string {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency, locale);
  }
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/**
 * Format a plain number with locale-specific thousands separator.
 *
 * @example
 *   formatNumber(12345, 'ar') → '١٢٬٣٤٥'
 *   formatNumber(12345, 'en') → '12,345'
 */
export function formatNumber(value: number, locale: Locale = "ar"): string {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
      value,
    );
  } catch {
    return String(value);
  }
}

/**
 * Format a percentage value.
 *
 * @example
 *   formatPercent(0.25, 'en') → '25%'
 */
export function formatPercent(ratio: number, locale: Locale = "ar"): string {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(ratio);
  } catch {
    return `${(ratio * 100).toFixed(1)}%`;
  }
}

// ─── Dates ────────────────────────────────────────────────────────────────────

type DateFormat = "short" | "medium" | "long" | "relative";

/**
 * Format a date string or Date for display.
 *
 * @param format
 *   - 'short'    → "12/5/2025"
 *   - 'medium'   → "Dec 5, 2025"
 *   - 'long'     → "Friday, December 5, 2025"
 *   - 'relative' → "3 days ago" / "in 2 hours"
 *
 * @example
 *   formatDate('2025-01-15', 'medium', 'ar') → '١٥ يناير ٢٠٢٥'
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: DateFormat = "medium",
  locale: Locale = "ar",
): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const loc = locale === "ar" ? "ar-EG" : "en-US";

  if (format === "relative") {
    return formatRelative(d, locale);
  }

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: "numeric", month: "numeric", year: "numeric" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  };
  const options = optionsMap[format];

  try {
    return new Intl.DateTimeFormat(loc, options).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function formatRelative(date: Date, locale: Locale): string {
  const now = Date.now();
  const diff = now - date.getTime(); // ms, positive = past
  const absDiff = Math.abs(diff);
  const isPast = diff > 0;

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (absDiff < minute) {
    value = 0;
    unit = "second";
  } else if (absDiff < hour) {
    value = Math.round(absDiff / minute);
    unit = "minute";
  } else if (absDiff < day) {
    value = Math.round(absDiff / hour);
    unit = "hour";
  } else {
    value = Math.round(absDiff / day);
    unit = "day";
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(
      locale === "ar" ? "ar-EG" : "en-US",
      {
        numeric: "auto",
      },
    );
    return rtf.format(isPast ? -value : value, unit);
  } catch {
    return formatDate(date, "medium", locale);
  }
}

// ─── Strings ──────────────────────────────────────────────────────────────────

/**
 * Truncate a string to `maxLength` characters, appending `suffix` if truncated.
 *
 * @example
 *   truncate('Hello World', 7) → 'Hello W…'
 */
export function truncate(str: string, maxLength: number, suffix = "…"): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Mask an email address for privacy display.
 *
 * @example
 *   maskEmail('john.doe@example.com') → 'j***@example.com'
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.charAt(0)}${"*".repeat(Math.min(local.length - 1, 3))}@${domain}`;
}
