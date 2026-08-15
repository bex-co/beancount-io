import { useMemo } from "react";
import type { WatchQueryFetchPolicy } from "@apollo/client";
import { useLedgerMetaQuery } from "@/generated-graphql/graphql";
import { getAccountsAndCurrency } from "../ledger-meta-utils";

interface UseLedgerMetaOptions {
  /**
   * Defaults to `network-only` so callers always see a fresh ledger. Screens
   * that would otherwise skeleton over data another screen already fetched
   * (the account picker) pass `cache-and-network` to render instantly.
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
    fetchPolicy: options?.fetchPolicy ?? "network-only",
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
