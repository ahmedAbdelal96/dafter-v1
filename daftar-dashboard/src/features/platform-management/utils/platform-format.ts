export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "DISABLED";

const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, "info" | "success" | "warning" | "error" | "dark"> = {
  TRIAL: "info",
  ACTIVE: "success",
  EXPIRED: "warning",
  SUSPENDED: "error",
  DISABLED: "dark",
};

export function getSubscriptionStatusColor(status: SubscriptionStatus) {
  return SUBSCRIPTION_STATUS_COLORS[status] ?? "light";
}

export function formatPlatformDate(locale: string, value?: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function formatRelativeDays(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const ms = parsed.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatPlanLabel(name?: string | null, billingCycle?: string | null) {
  if (!name) return "-";
  if (!billingCycle) return name;
  return `${name} · ${billingCycle.toLowerCase()}`;
}

