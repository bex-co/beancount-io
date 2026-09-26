import { useLedgerPricesQuery } from "@/generated-graphql/graphql";
import { useLedgerManagedPrices } from "./use-ledger-managed-prices";

/**
 * Cache-first: the price history is the largest read on Home, Accounts and
 * account detail, and `invalidateLedger` evicts it after every write, so a
 * mount or tab visit need not download it again.
 */
const LEDGER_PRICES_FETCH_POLICY = "cache-first" as const;

/**
 * The dates of every price the ledger holds, per commodity pair. A balance
 * valued at market reads from it which holdings had a price and how old that
 * price is (see `selectValuation`).
 */
export const useLedgerPrices = (ledgerId: string) => {
  const { loading, data, error, refetch } = useLedgerPricesQuery({
    variables: { ledgerId },
    skip: !ledgerId,
    fetchPolicy: LEDGER_PRICES_FETCH_POLICY,
  });
  // Which of those prices come from a managed feed, judged on the feed's own
  // terms. Never gates the screen: without it every price is judged by the
  // ledger's own cadence.
  const managed = useLedgerManagedPrices(ledgerId);
  return {
    loading,
    prices: data?.getLedgerCommodities,
    managed: managed.managed,
    data,
    error,
    refetch: () => Promise.all([refetch(), managed.refetch()]),
  };
};
