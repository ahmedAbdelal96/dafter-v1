import { useState, useCallback } from "react";

interface PaginationOptions {
  /** First page number — most APIs use 1, some use 0. Default: 1 */
  initialPage?: number;
  /** Items per page to request. Default: 20 */
  pageSize?: number;
}

/**
 * Manages cursor-style (page number) pagination state.
 *
 * Designed to work alongside React Query's paginated queries:
 *   - `page` is the current page number to fetch.
 *   - `hasMore` flag lets you enable/disable the "load more" button.
 *   - `loadMore()` advances the page counter.
 *   - `reset()` returns to the first page (call after a search/filter change).
 *
 * @example
 *   const { page, pageSize, hasMore, loadMore, reset, setHasMore } =
 *     usePagination({ pageSize: 15 });
 *
 *   const { data } = useQuery({
 *     queryKey: ['invoices', page],
 *     queryFn: () => invoicesApi.list({ page, limit: pageSize }),
 *   });
 *
 *   // After data loads, inform the hook whether more pages exist:
 *   useEffect(() => {
 *     setHasMore((data?.total ?? 0) > page * pageSize);
 *   }, [data]);
 */
export function usePagination({
  initialPage = 1,
  pageSize = 20,
}: PaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setPage((p) => p + 1);
  }, [hasMore]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setHasMore(true);
  }, [initialPage]);

  return { page, pageSize, hasMore, loadMore, reset, setHasMore };
}
