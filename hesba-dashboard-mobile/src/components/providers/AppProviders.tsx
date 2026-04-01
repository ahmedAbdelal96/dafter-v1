/**
 * AppProviders — Dafter Client Mobile
 *
 * Composes all top-level React providers in one place.
 *
 * Provider order:
 * 1. SafeAreaProvider — required by react-native-safe-area-context
 * 2. QueryClientProvider — wraps everything that uses React Query hooks
 * 3. I18nextProvider — makes useTranslation() available everywhere
 * 4. ErrorBoundary — catches uncaught render errors globally
 * 5. ToastContainer — global overlay for toast notifications
 * 6. NetworkBanner — offline connectivity indicator
 *
 * StoreHydration is not here — it's placed in the root layout BETWEEN
 * AppProviders and the navigator so it can hold the splash screen until ready.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";
import i18n from "@/i18n";
import { QUERY_CONFIG, shouldRetry } from "@/lib/api/config";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { NetworkBanner } from "@/components/common/NetworkBanner";

// ─── QueryClient singleton ────────────────────────────────────────────────────
// Created outside the component so it's never recreated on re-renders.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.staleTime,
      gcTime: QUERY_CONFIG.gcTime,
      retry: shouldRetry,
      // Don't refetch on window focus (web behavior) — mobile doesn't have tabs
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false, // Never retry mutations — state changes should be explicit
    },
  },
});

// ─── Component ────────────────────────────────────────────────────────────────

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <ErrorBoundary>
            {children}
            {/* Global toast overlay — rendered above all screens */}
            <ToastContainer />
            {/* Network connectivity banner — shows when offline */}
            <NetworkBanner />
          </ErrorBoundary>
        </I18nextProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
