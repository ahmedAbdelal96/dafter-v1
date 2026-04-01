import { useState, useCallback, useRef } from "react";

/**
 * Encapsulates pull-to-refresh state to avoid writing the same
 * useState + onRefresh boilerplate in every list screen.
 *
 * @param onRefresh  Async function to call when the user pulls down.
 *                   Should resolve (or reject) when the refresh is done.
 *
 * @example
 *   const { refreshing, onRefresh } = useRefreshControl(refetch);
 *   <FlatList
 *     refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
 *   />
 */
export function useRefreshControl(onRefresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  // Guard against calling setState after unmount
  const mountedRef = useRef(true);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [onRefresh]);

  return { refreshing, onRefresh: handleRefresh };
}
