/**
 * Which branch a query-backed card renders. A first load that failed has no
 * data, and must not fall through to the card's empty state: "No transactions
 * yet" and "Quick add to show charts" are claims about the ledger that a failed
 * request cannot back. Cached data with a failed refetch stays "ready" — the
 * content on screen is still true.
 */
export type CardLoadState = "loading" | "failed" | "ready";

export function selectCardLoadState({
  loading,
  hasData,
  error,
}: {
  loading: boolean;
  hasData: boolean;
  error: unknown;
}): CardLoadState {
  if (hasData) return "ready";
  if (error) return "failed";
  return loading ? "loading" : "ready";
}
