import { makeVar, type ApolloCache } from "@apollo/client";
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

/**
 * Root fields that describe the signed-in account rather than any ledger:
 * who they are, their plan and allowance, their keys and the feed. No ledger
 * write changes them, so a write keeps them. Everything else refetches, so a
 * field added later is refreshed until someone lists it here.
 */
const ACCOUNT_FIELDS = new Set([
  "userProfile",
  "subscriptionStatus",
  "storeBillingIdentity",
  "aiCfoUsage",
  "allTierQuotas",
  "apiKeys",
  "listPublicKeys",
  "featureFlags",
  "getFeed",
  "health",
]);

/**
 * After a ledger write: like {@link useApolloCacheClear}, but without
 * refetching the account queries above. `write` runs in the same batch, so
 * a caller that already holds the new value of a field (a saved file) can
 * write it back instead of downloading it again (w1/m41).
 */
export const useLedgerWriteRefresh = () => {
  const client = useApolloClient();
  return useCallback(
    (write?: (cache: ApolloCache) => void) => {
      client.cache.batch({
        update(cache) {
          cache.modify({
            id: "ROOT_QUERY",
            fields: (value, { fieldName, DELETE }) =>
              ACCOUNT_FIELDS.has(fieldName) ? value : DELETE,
          });
          write?.(cache);
        },
      });
      cacheClears(cacheClears() + 1);
    },
    [client],
  );
};
