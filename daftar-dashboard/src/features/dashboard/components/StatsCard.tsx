'use client';

import type { ReactNode } from 'react';
import type { ComponentType, SVGProps } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  iconColor?: string;
  iconBgColor?: string;
  isLoading?: boolean;
  isMonetary?: boolean;
}

function MonetaryValue({ value }: { value: string }) {
  // Split localized money text into numeric core and currency affixes (prefix/suffix).
  const numberMatch = value.match(/[\d\u0660-\u0669][\d\u0660-\u0669\u066B\u066C,.\s]*/u);
  if (!numberMatch || typeof numberMatch.index !== 'number') {
    return <>{value}</>;
  }

  const start = numberMatch.index;
  const end = start + numberMatch[0].length;
  const prefix = value.slice(0, start).trim();
  const numeric = numberMatch[0].trim();
  const suffix = value.slice(end).trim();

  const parts: ReactNode[] = [];

  if (prefix) {
    parts.push(
      <span
        key="prefix"
        className="mx-1 text-[0.62em] font-medium text-text-muted"
      >
        {prefix}
      </span>,
    );
  }

  parts.push(
    <span key="numeric" className="text-current">
      {numeric}
    </span>,
  );

  if (suffix) {
    parts.push(
      <span
        key="suffix"
        className="mx-1 text-[0.62em] font-medium text-text-muted"
      >
        {suffix}
      </span>,
    );
  }

  return <>{parts}</>;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  isLoading,
  isMonetary = false,
}: StatsCardProps) {
  if (isLoading) {
    return <StatsCardSkeleton />;
  }

  const normalizedValue =
    typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary p-6 shadow-theme-sm transition-shadow hover:shadow-theme-md dark:border-border-strong dark:bg-surface-secondary">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary">
            {title}
          </p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
            {isMonetary && typeof normalizedValue === 'string' ? (
              <MonetaryValue value={normalizedValue} />
            ) : (
              normalizedValue
            )}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-text-muted">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive
                    ? 'finance-positive'
                    : 'finance-risk'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-text-muted">
                من الشهر الماضي
              </span>
            </div>
          )}
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgColor}`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border-light bg-surface-secondary p-6 shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 bg-surface-tertiary rounded animate-pulse" />
          <div className="h-8 w-32 bg-surface-tertiary rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface-tertiary rounded animate-pulse" />
        </div>
        <div className="h-12 w-12 rounded-2xl bg-surface-tertiary animate-pulse" />
      </div>
    </div>
  );
}
