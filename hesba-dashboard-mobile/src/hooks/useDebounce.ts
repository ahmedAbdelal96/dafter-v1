import { useState, useEffect } from "react";

/**
 * Delays updating `value` until `delay` ms have passed with no changes.
 * Use for search inputs to avoid firing API requests on every keystroke.
 *
 * @example
 *   const debouncedQuery = useDebounce(searchText, 400);
 *   useEffect(() => { fetchResults(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
