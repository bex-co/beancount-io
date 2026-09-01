import { useMemo } from "react";
import type { WatchQueryFetchPolicy } from "@apollo/client";
import { useLedgerMetaQuery } from "@/generated-graphql/graphql";
import { getAccountsAndCurrency } from "../ledger-meta-utils";

/** Default for screen mounts — render cache, refetch in background (m34). */
const LEDGER_META_FETCH_POLICY = "cache-and-network" as const;

interface UseLedgerMetaOptions {
  /**
   * Defaults to `cache-and-network` so cold starts render from the persisted
   * cache while a background refetch settles. Callers that genuinely need a
   * blank-slate read (rare) can still pass `network-only`.
   */
  fetchPolicy?: WatchQueryFetchPolicy;
}

export const useLedgerMeta = (
  userId: string,
  ledgerId?: string,
  options?: UseLedgerMetaOptions,
) => {
  const { data, error, loading, refetch } = useLedgerMetaQuery({
    variables: { userId, ledgerId },
    fetchPolicy: options?.fetchPolicy ?? LEDGER_META_FETCH_POLICY,
  });

  const meta = data?.ledgerMeta.data;
  // Memoized so the derived arrays keep their identity between renders —
  // downstream `useMemo`s (the picker's grouping and search) depend on it.
  const { assets, expenses, currencies } = useMemo(
    () => getAccountsAndCurrency(meta),
    [meta],
  );

  return {
    data: meta,
    assets,
    expenses,
    currencies,
    error,
    loading,
    refetch,
  };
};
