import { makeVar } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";

/**
 * Counts cache clears. A clear refetches every query on screen, so whatever
 * the ledger's head is after it, the page shows it: the Out of date indicator
 * re-baselines on each tick instead of flagging the user's own write (w3/650).
 */
export const cacheClears = makeVar(0);

/**
 * Hook that returns a memoized function to clear the Apollo Client cache.
 * Specifically evicts the ROOT_QUERY from the cache, which effectively clears
 * all cached query results.
 *
 * @returns A memoized callback function that clears the Apollo Client cache
 * @example
 * ```tsx
 * const clearCache = useApolloCacheClear();
 * // Later, call clearCache() to clear all cached queries
 * ```
 */
export const useApolloCacheClear = () => {
  const client = useApolloClient();
  return useCallback(() => {
    client.cache.evict({ id: "ROOT_QUERY" });
    cacheClears(cacheClears() + 1);
  }, [client]);
};
