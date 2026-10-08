/**
 * dafter Dashboard - React Query Provider
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { TIME } from "@/lib/api/hooks/config";
import { getEntitlementErrorDetails, toAppError } from "@/lib/api/errors";

interface QueryProviderProps {
  children: ReactNode;
}

function handleQueryError(error: unknown) {
  const appError = toAppError(error);
  const entitlement = getEntitlementErrorDetails(error);

  // Auth errors are handled by auth flow/redirects.
  if (appError.statusCode === 401) {
    return;
  }

  if (entitlement) {
    toast.error(buildEntitlementMessage(entitlement));
    return;
  }

  toast.error(appError.message || "حدث خطأ غير متوقع");
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  const appError = toAppError(error);

  // Do not retry semantic/authorization failures.
  if ([401, 403, 404].includes(appError.statusCode)) {
    return false;
  }

  return failureCount < 2;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: TIME.MINUTE,
            gcTime: 5 * TIME.MINUTE,
            retry: shouldRetry,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: process.env.NODE_ENV === "development",
            refetchOnReconnect: true,
            refetchOnMount: true,
            throwOnError: false,
          },
          mutations: {
            retry: 1,
            onError: handleQueryError,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}

export { QueryClient };

function buildEntitlementMessage(
  details: NonNullable<ReturnType<typeof getEntitlementErrorDetails>>,
): string {
  const isArabic = getCurrentLanguage() === "ar";

  if (details.code === "FEATURE_NOT_AVAILABLE") {
    return isArabic
      ? `الميزة ${details.featureKey ?? ""} غير متاحة في خطتك الحالية.`.trim()
      : `Feature ${details.featureKey ?? ""} is not available in your current plan.`.trim();
  }

  if (details.code === "PLAN_LIMIT_REACHED") {
    const entity = details.entity ? `(${details.entity})` : "";
    const limit =
      details.limit !== undefined && details.limit !== null
        ? isArabic
          ? ` الحد: ${details.limit}.`
          : ` Limit: ${details.limit}.`
        : "";
    return isArabic
      ? `وصلت للحد الأقصى ${entity}.${limit}`
      : `You reached your plan limit ${entity}.${limit}`;
  }

  return isArabic
    ? "اشتراكك الحالي لا يسمح بتنفيذ هذا الإجراء."
    : "Your current subscription does not allow this action.";
}

function getCurrentLanguage(): "ar" | "en" {
  if (typeof document === "undefined") {
    return "ar";
  }

  const lang = document.documentElement.lang?.toLowerCase();
  return lang.startsWith("en") ? "en" : "ar";
}
