/**
 * Normalizes free-text search input.
 * Returns empty string for undefined/null/blank values.
 */
export function normalizeSearchTerm(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Performs case-insensitive contains check against multiple fields.
 * If term is empty, returns true (no filtering).
 */
export function matchesSearchTerm(
  term: string,
  ...fields: Array<string | null | undefined>
): boolean {
  if (!term) return true;

  return fields.some((field) => (field ?? '').toLowerCase().includes(term));
}

