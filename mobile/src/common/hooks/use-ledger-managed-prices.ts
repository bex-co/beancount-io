import { useLedgerManagedPricesQuery } from "@/generated-graphql/graphql";

/**
 * Cache-first, like the price dates it qualifies: `invalidateLedger` evicts it
 * after every write, and a feed's status only matters here at day resolution.
 */
const LEDGER_MANAGED_PRICES_FETCH_POLICY = "cache-first" as const;

/**
 * The ledger's managed price sources (`include "https://beancount.io/prices/…"`).
 * A holding priced by one is judged stale by the feed's own terms rather than
 * by the ledger's cadence (see `isPriceStale`).
 */
export const useLedgerManagedPrices = (ledgerId: string) => {
  const { loading, data, error, refetch } = useLedgerManagedPricesQuery({
    variables: { ledgerId },
    skip: !ledgerId,
    fetchPolicy: LEDGER_MANAGED_PRICES_FETCH_POLICY,
  });
  return {
    loading,
    managed: data?.getLedgerManagedPrices,
    error,
    refetch,
  };
};
