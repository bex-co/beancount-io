/**
 * Pure decision for "cached data is on screen but the latest refetch failed."
 * Kept free of React / `@/` imports so jest-lite can require it directly.
 *
 * Four combinations:
 * - cache + error → stale (show indicator)
 * - cache + ok → fresh (hide indicator)
 * - no cache + error → first-load failure (existing error UI, not the indicator)
 * - no cache + ok → loading / empty (not stale)
 */
export type StaleDataInput = {
  hasCachedData: boolean;
  error: unknown;
};

export function isShowingStaleData({
  hasCachedData,
  error,
}: StaleDataInput): boolean {
  return Boolean(hasCachedData && error);
}

/**
 * Screen-level aggregate: any contributing query that is both cached and
 * errored makes the banner visible. First-load failures (error, no data) do
 * not — those keep their existing error/skeleton UI.
 */
export function isShowingStaleDataFromQueries(
  queries: ReadonlyArray<{ data?: unknown; error?: unknown }>,
): boolean {
  return queries.some((query) =>
    isShowingStaleData({
      hasCachedData: query.data != null,
      error: query.error,
    }),
  );
}
