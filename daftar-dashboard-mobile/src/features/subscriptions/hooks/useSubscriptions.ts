import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, QUERY_CONFIG, shouldRetry } from '@/lib/api/config';
import { subscriptionsApi } from '../api/subscriptions.api';

/**
 * Fetch the current company's effective entitlements.
 * Stale after 5 minutes — plan changes are rare and backend-driven.
 */
export function useMyEntitlements() {
  return useQuery({
    queryKey: QUERY_KEYS.ENTITLEMENTS,
    queryFn: subscriptionsApi.getMyEntitlements,
    staleTime: 5 * 60 * 1000,
    gcTime: QUERY_CONFIG.gcTime,
    retry: shouldRetry,
  });
}
